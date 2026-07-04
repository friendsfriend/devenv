package server

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/friendsfriend/devenv/pkg/app"
	"github.com/friendsfriend/devenv/pkg/changerequest"
	"github.com/friendsfriend/devenv/pkg/github"
	"github.com/friendsfriend/devenv/pkg/gitlab"
)

func (s *Server) resolveGitHubClient(targetApp *app.App) (github.Client, *github.RepoInfo, string, error) {
	repoInfo, err := github.ExtractRepoInfo(targetApp.RepositoryPath)
	if err != nil {
		return nil, nil, "", fmt.Errorf("failed to extract repo info: %w", err)
	}
	providerName := targetApp.GetProviderName()
	username, token := "", ""
	if s.services.ProviderStore() != nil {
		username, token = s.services.ProviderStore().CredentialsFor(providerName)
	}
	if token == "" {
		return nil, nil, "", fmt.Errorf("no token configured for provider %q", providerName)
	}
	client := github.NewClient(token, username)
	return client, repoInfo, username, nil
}

// resolveGitHubMRClient returns a GitHub client with the repo info converted to changerequest.RepoInfo.
func (s *Server) resolveGitHubMRClient(targetApp *app.App) (github.Client, *github.RepoInfo, error) {
	repoInfo, err := github.ExtractRepoInfo(targetApp.RepositoryPath)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to extract repo info: %w", err)
	}
	providerName := targetApp.GetProviderName()
	username, token := "", ""
	if s.services.ProviderStore() != nil {
		username, token = s.services.ProviderStore().CredentialsFor(providerName)
	}
	if token == "" {
		return nil, nil, fmt.Errorf("no token configured for provider %q", providerName)
	}
	client := github.NewClient(token, username)
	return client, repoInfo, nil
}

func (s *Server) handleGitHubPullRequests(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondMethodNotAllowed(w)
		return
	}

	appIdent := r.URL.Query().Get("appIdent")
	allBranches := r.URL.Query().Get("allBranches")
	state := r.URL.Query().Get("state")
	pageStr := r.URL.Query().Get("page")
	perPageStr := r.URL.Query().Get("perPage")
	search := r.URL.Query().Get("search")
	sortBy := r.URL.Query().Get("sort")
	sortDirection := r.URL.Query().Get("direction")
	labels := splitCSV(r.URL.Query().Get("labels"))

	if appIdent == "" {
		respondBadRequest(w, "appIdent parameter required")
		return
	}

	var targetApp *app.App
	targetApp = s.findAppByIdent(appIdent)

	if targetApp == nil {
		respondNotFound(w, "App not found")
		return
	}

	if targetApp.RepositoryPath == "" {
		respondBadRequest(w, "App has no repository path")
		return
	}

	currentBranch := s.services.GitRepository().GetCurrentBranch(&appAdapter{app: targetApp})
	if currentBranch == "" {
		currentBranch = targetApp.Branch
	}

	isDefaultBranch := currentBranch == "develop" ||
		currentBranch == "master" ||
		currentBranch == "main" ||
		currentBranch == "qa" ||
		currentBranch == "quality"

	var sourceBranchFilter string
	if allBranches != "true" && !isDefaultBranch {
		sourceBranchFilter = currentBranch
	}

	// Parse pagination params
	page := 1
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}
	perPage := 50
	if perPageStr != "" {
		if pp, err := strconv.Atoi(perPageStr); err == nil && pp > 0 {
			perPage = pp
		}
	}

	ghClient, repoInfo, _, err := s.resolveGitHubClient(targetApp)
	if err != nil {
		respondBadRequest(w, err.Error())
		return
	}

	// Determine SkipDetails: use SkipDetails for paginated list view (when page params present)
	// but keep backward compat when no page params (for detail views)
	skipDetails := pageStr != "" || perPageStr != ""

	if state == "" {
		state = "opened"
	}

	result, err := ghClient.GetChangeRequests(repoInfo.ToChangeRequest(), &changerequest.ChangeRequestListOptions{
		SourceBranch:  sourceBranchFilter,
		State:         state,
		Page:          page,
		PerPage:       perPage,
		Search:        search,
		Labels:        labels,
		SortBy:        sortBy,
		SortDirection: sortDirection,
		SkipDetails:   skipDetails,
	})
	if err != nil {
		respondErrorMessage(w, fmt.Sprintf("Failed to fetch pull requests: %v", err), http.StatusInternalServerError)
		return
	}

	if len(result.ChangeRequests) == 0 {
		var errorMsg string
		if sourceBranchFilter != "" {
			errorMsg = fmt.Sprintf("No open pull request found for branch '%s'", currentBranch)
		} else {
			errorMsg = "No open pull requests found for this repository"
		}
		respondNotFound(w, errorMsg)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (s *Server) handleGitHubPRChanges(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondMethodNotAllowed(w)
		return
	}

	appIdent := r.URL.Query().Get("appIdent")
	prNumberStr := r.URL.Query().Get("crIID")

	if appIdent == "" || prNumberStr == "" {
		respondBadRequest(w, "appIdent and crIID parameters required")
		return
	}

	var prNumber int
	if _, err := fmt.Sscanf(prNumberStr, "%d", &prNumber); err != nil {
		respondBadRequest(w, "Invalid crIID")
		return
	}

	var targetApp *app.App
	targetApp = s.findAppByIdent(appIdent)

	if targetApp == nil {
		respondNotFound(w, "App not found")
		return
	}

	ghClient, repoInfo, _, err := s.resolveGitHubClient(targetApp)
	if err != nil {
		respondBadRequest(w, err.Error())
		return
	}

	changes, err := ghClient.GetChangeRequestChanges(repoInfo.ToChangeRequest(), prNumber)
	if err != nil {
		respondErrorMessage(w, fmt.Sprintf("Failed to fetch PR changes: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(changes)
}

func (s *Server) handleGitHubPRDiscussions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondMethodNotAllowed(w)
		return
	}

	appIdent := r.URL.Query().Get("appIdent")
	prNumberStr := r.URL.Query().Get("crIID")

	if appIdent == "" || prNumberStr == "" {
		respondBadRequest(w, "appIdent and crIID parameters required")
		return
	}

	var prNumber int
	if _, err := fmt.Sscanf(prNumberStr, "%d", &prNumber); err != nil {
		respondBadRequest(w, "Invalid crIID")
		return
	}

	var targetApp *app.App
	targetApp = s.findAppByIdent(appIdent)

	if targetApp == nil {
		respondNotFound(w, "App not found")
		return
	}

	ghClient, repoInfo, _, err := s.resolveGitHubClient(targetApp)
	if err != nil {
		respondBadRequest(w, err.Error())
		return
	}

	discussions, err := ghClient.GetDiscussions(repoInfo.ToChangeRequest(), prNumber)
	if err != nil {
		respondErrorMessage(w, fmt.Sprintf("Failed to fetch PR discussions: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(discussions)
}

func (s *Server) handleGitHubPRApprove(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondMethodNotAllowed(w)
		return
	}

	appIdent := r.URL.Query().Get("appIdent")
	prNumberStr := r.URL.Query().Get("crIID")

	if appIdent == "" || prNumberStr == "" {
		respondBadRequest(w, "appIdent and crIID parameters required")
		return
	}

	var prNumber int
	if _, err := fmt.Sscanf(prNumberStr, "%d", &prNumber); err != nil {
		respondBadRequest(w, "Invalid crIID")
		return
	}

	var targetApp *app.App
	targetApp = s.findAppByIdent(appIdent)

	if targetApp == nil {
		respondNotFound(w, "App not found")
		return
	}

	ghClient, repoInfo, _, err := s.resolveGitHubClient(targetApp)
	if err != nil {
		respondBadRequest(w, err.Error())
		return
	}

	if err := ghClient.Approve(repoInfo.ToChangeRequest(), prNumber); err != nil {
		respondErrorMessage(w, fmt.Sprintf("Failed to approve pull request: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "Pull request approved successfully"})
}

func (s *Server) handleGitHubPRUnapprove(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondMethodNotAllowed(w)
		return
	}

	appIdent := r.URL.Query().Get("appIdent")
	prNumberStr := r.URL.Query().Get("crIID")

	if appIdent == "" || prNumberStr == "" {
		respondBadRequest(w, "appIdent and crIID parameters required")
		return
	}

	var prNumber int
	if _, err := fmt.Sscanf(prNumberStr, "%d", &prNumber); err != nil {
		respondBadRequest(w, "Invalid crIID")
		return
	}

	var targetApp *app.App
	targetApp = s.findAppByIdent(appIdent)

	if targetApp == nil {
		respondNotFound(w, "App not found")
		return
	}

	ghClient, repoInfo, _, err := s.resolveGitHubClient(targetApp)
	if err != nil {
		respondBadRequest(w, err.Error())
		return
	}

	if err := ghClient.Unapprove(repoInfo.ToChangeRequest(), prNumber); err != nil {
		respondErrorMessage(w, fmt.Sprintf("Failed to unapprove pull request: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "Pull request unapproved successfully"})
}

func (s *Server) handleGitHubPRToggleApproval(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondMethodNotAllowed(w)
		return
	}

	appIdent := r.URL.Query().Get("appIdent")
	prNumberStr := r.URL.Query().Get("crIID")

	if appIdent == "" || prNumberStr == "" {
		respondBadRequest(w, "appIdent and crIID parameters required")
		return
	}

	var prNumber int
	if _, err := fmt.Sscanf(prNumberStr, "%d", &prNumber); err != nil {
		respondBadRequest(w, "Invalid crIID")
		return
	}

	var targetApp *app.App
	targetApp = s.findAppByIdent(appIdent)

	if targetApp == nil {
		respondNotFound(w, "App not found")
		return
	}

	ghClient, repoInfo, _, err := s.resolveGitHubClient(targetApp)
	if err != nil {
		respondBadRequest(w, err.Error())
		return
	}

	if err := ghClient.ToggleApproval(repoInfo.ToChangeRequest(), prNumber); err != nil {
		respondErrorMessage(w, fmt.Sprintf("Failed to toggle pull request approval: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "Pull request approval toggled successfully"})
}

func (s *Server) handleGitHubActionsJobs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondMethodNotAllowed(w)
		return
	}

	appIdent := r.URL.Query().Get("appIdent")
	runIDStr := r.URL.Query().Get("runId")

	if appIdent == "" || runIDStr == "" {
		respondBadRequest(w, "appIdent and runId parameters required")
		return
	}

	var runID int
	if _, err := fmt.Sscanf(runIDStr, "%d", &runID); err != nil {
		respondBadRequest(w, "Invalid runId")
		return
	}

	var targetApp *app.App
	targetApp = s.findAppByIdent(appIdent)

	if targetApp == nil {
		respondNotFound(w, "App not found")
		return
	}

	ghClient, repoInfo, _, err := s.resolveGitHubClient(targetApp)
	if err != nil {
		respondBadRequest(w, err.Error())
		return
	}

	jobs, err := ghClient.GetPipelineJobs(repoInfo.ToChangeRequest(), runID)
	if err != nil {
		respondErrorMessage(w, fmt.Sprintf("Failed to fetch actions jobs: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(jobs)
}

func (s *Server) handleGitHubActionsTestSummary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondMethodNotAllowed(w)
		return
	}

	appIdent := r.URL.Query().Get("appIdent")
	runIDStr := r.URL.Query().Get("runId")

	if appIdent == "" || runIDStr == "" {
		respondBadRequest(w, "appIdent and runId parameters required")
		return
	}

	empty := gitlab.TestSummary{
		Total:      0,
		Success:    0,
		Failed:     0,
		Skipped:    0,
		Error:      0,
		TestSuites: []gitlab.TestSuite{},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(empty)
}

func (s *Server) handleGitHubActionsJobLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondMethodNotAllowed(w)
		return
	}

	appIdent := r.URL.Query().Get("appIdent")
	jobIDStr := r.URL.Query().Get("jobId")

	if appIdent == "" || jobIDStr == "" {
		respondBadRequest(w, "appIdent and jobId parameters required")
		return
	}

	var jobID int
	if _, err := fmt.Sscanf(jobIDStr, "%d", &jobID); err != nil {
		respondBadRequest(w, "Invalid jobId")
		return
	}

	var targetApp *app.App
	targetApp = s.findAppByIdent(appIdent)

	if targetApp == nil {
		respondNotFound(w, "App not found")
		return
	}

	ghClient, repoInfo, _, err := s.resolveGitHubClient(targetApp)
	if err != nil {
		respondBadRequest(w, err.Error())
		return
	}

	logs, err := ghClient.GetJobLogs(repoInfo.ToChangeRequest(), jobID)
	if err != nil {
		respondErrorMessage(w, fmt.Sprintf("Failed to fetch job logs: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Write([]byte(logs))
}

func (s *Server) handleAIAnalyzeLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondMethodNotAllowed(w)
		return
	}

	var req struct {
		Logs   string `json:"logs"`
		Prompt string `json:"prompt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondBadRequest(w, "Invalid request body")
		return
	}
	if req.Logs == "" {
		respondBadRequest(w, "logs field required")
		return
	}

	prompt := req.Prompt
	if prompt == "" {
		prompt = "Analyze these logs. Summarize errors, warnings, and any notable events concisely."
	}

	if _, err := exec.LookPath("pi"); err != nil {
		respondErrorMessage(w, "pi not found in PATH", http.StatusServiceUnavailable)
		return
	}

	const maxLogBytes = 100 * 1024
	logs := req.Logs
	if len(logs) > maxLogBytes {
		logs = logs[len(logs)-maxLogBytes:]
		prompt += "\n[Note: log was truncated to the most recent 100 KB]"
	}

	ctx, cancel := context.WithTimeout(r.Context(), 90*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "pi", "--print", "--no-session", "--no-tools", prompt+"\n\n"+logs)
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			respondErrorMessage(w, "AI analysis timed out", http.StatusGatewayTimeout)
			return
		}
		errMsg := strings.TrimSpace(stderr.String())
		if errMsg == "" {
			errMsg = err.Error()
		}
		respondErrorMessage(w, fmt.Sprintf("pi analysis failed: %s", errMsg), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"summary": stdout.String()})
}

func (s *Server) handleAIAnalyzeLogsStream(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondMethodNotAllowed(w)
		return
	}

	var req struct {
		Logs   string `json:"logs"`
		Prompt string `json:"prompt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondBadRequest(w, "Invalid request body")
		return
	}
	if req.Logs == "" {
		respondBadRequest(w, "logs field required")
		return
	}

	prompt := req.Prompt
	if prompt == "" {
		prompt = "Analyze these logs. Summarize errors, warnings, and any notable events concisely."
	}

	s.handlePiAnalyzeLogsStream(w, r, req.Logs, prompt)
}

func jsonEscape(s string) string {
	b, _ := json.Marshal(s)
	return string(b[1 : len(b)-1])
}
func (s *Server) handlePiAnalyzeLogsStream(w http.ResponseWriter, r *http.Request, logs, prompt string) {
	const maxLogBytes = 100 * 1024
	if len(logs) > maxLogBytes {
		logs = logs[len(logs)-maxLogBytes:]
		prompt += "\n[Note: log was truncated to the most recent 100 KB]"
	}

	if _, err := exec.LookPath("pi"); err != nil {
		http.Error(w, `{"error":"pi not found in PATH"}`, http.StatusServiceUnavailable)
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	fullPrompt := prompt + "\n\n" + logs

	ctx, cancel := context.WithTimeout(r.Context(), 90*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "pi", "--print", "--no-session", "--no-tools", fullPrompt)
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			fmt.Fprintf(w, "data: {\"error\":\"timeout\"}\n\n")
			flusher.Flush()
			return
		}
		errMsg := strings.TrimSpace(stderr.String())
		if errMsg == "" {
			errMsg = err.Error()
		}
		fmt.Fprintf(w, "data: {\"error\":\"%s\"}\n\n", jsonEscape(errMsg))
		flusher.Flush()
		return
	}

	output := stdout.String()
	if output != "" {
		fmt.Fprintf(w, "data: {\"delta\":\"%s\"}\n\n", jsonEscape(output))
		flusher.Flush()
	}
	fmt.Fprintf(w, "data: {\"done\":true}\n\n")
	flusher.Flush()
}

// queryPiSessions reads pi session files from the pi agent sessions directory
// and returns them grouped by CWD slug as AgentGroup entries.
// Respects the PI_CODING_AGENT_DIR environment variable (default: ~/.pi/agent).
func queryPiSessions() ([]agentGroup, error) {
	if _, err := exec.LookPath("pi"); err != nil {
		return []agentGroup{}, nil
	}

	// Respect PI_CODING_AGENT_DIR env var, fall back to ~/.pi/agent
	agentDir := os.Getenv("PI_CODING_AGENT_DIR")
	if agentDir == "" {
		homedir, err := os.UserHomeDir()
		if err != nil {
			return []agentGroup{}, nil
		}
		agentDir = filepath.Join(homedir, ".pi", "agent")
	}
	sessionsBase := filepath.Join(agentDir, "sessions")

	entries, err := os.ReadDir(sessionsBase)
	if err != nil {
		// Sessions dir doesn't exist yet — not an error
		return []agentGroup{}, nil
	}

	groupsByName := make(map[string][]agentSessionInfo)
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		dirPath := filepath.Join(sessionsBase, entry.Name())
		files, err := os.ReadDir(dirPath)
		if err != nil {
			continue
		}

		for _, f := range files {
			if f.IsDir() || !strings.HasSuffix(f.Name(), ".jsonl") {
				continue
			}
			filePath := filepath.Join(dirPath, f.Name())
			info, cwd, err := parsePiSessionFile(filePath)
			if err != nil {
				continue
			}
			// Use the last path component of the actual cwd as the group name.
			// Fall back to the directory slug if cwd is missing.
			groupName := filepath.Base(cwd)
			if groupName == "." || groupName == "" {
				groupName = entry.Name()
			}
			groupsByName[groupName] = append(groupsByName[groupName], info)
		}
	}

	groups := make([]agentGroup, 0, len(groupsByName))
	for name, sessions := range groupsByName {
		groups = append(groups, agentGroup{Name: name, Sessions: sessions})
	}
	return groups, nil
}

// parsePiSessionFile reads a pi session JSONL file and extracts the session
// metadata plus the first user message as the title.
// The session "id" is set to the full file path so the TUI can pass it
// directly to `pi --session <path>`.
func parsePiSessionFile(filePath string) (agentSessionInfo, string, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return agentSessionInfo{}, "", err
	}
	defer f.Close()

	type sessionHeader struct {
		Timestamp string `json:"timestamp"`
		Cwd       string `json:"cwd"`
	}
	type messageContent struct {
		Type string `json:"type"`
		Text string `json:"text"`
	}
	type innerMessage struct {
		Role    string           `json:"role"`
		Content []messageContent `json:"content"`
	}
	type entry struct {
		Type    string       `json:"type"`
		Message innerMessage `json:"message"`
	}

	var header sessionHeader
	var firstUserText string

	scanner := bufio.NewScanner(f)
	// Cap individual line reads at 1 MB to avoid OOM on large tool-call lines.
	scanner.Buffer(make([]byte, 64*1024), 1024*1024)

	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		// Peek at "type" without full decode
		var peek struct {
			Type string `json:"type"`
		}
		if err := json.Unmarshal(line, &peek); err != nil {
			continue
		}

		switch peek.Type {
		case "session":
			json.Unmarshal(line, &header) //nolint:errcheck
		case "message":
			if firstUserText != "" {
				break
			}
			var e entry
			if err := json.Unmarshal(line, &e); err != nil {
				continue
			}
			if e.Message.Role == "user" {
				for _, part := range e.Message.Content {
					if part.Type == "text" && part.Text != "" {
						firstUserText = part.Text
						break
					}
				}
			}
		}

		// Stop once we have both pieces
		if header.Timestamp != "" && firstUserText != "" {
			break
		}
	}

	if header.Timestamp == "" {
		return agentSessionInfo{}, "", fmt.Errorf("no session header found in %s", filePath)
	}

	t, _ := time.Parse(time.RFC3339Nano, header.Timestamp)
	tMs := t.UnixMilli()

	// Build a human title: first user message (truncated) or timestamp fallback
	title := firstUserText
	if title == "" {
		title = t.Format("2006-01-02 15:04")
	} else if len([]rune(title)) > 60 {
		runes := []rune(title)
		title = string(runes[:57]) + "..."
	}
	// Collapse newlines / tabs to spaces
	title = strings.Join(strings.Fields(title), " ")

	return agentSessionInfo{
		ID:          filePath,
		Title:       title,
		TimeCreated: tMs,
		TimeUpdated: tMs,
	}, header.Cwd, nil
}

func (s *Server) handleGetPiSessions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondMethodNotAllowed(w)
		return
	}
	groups, err := queryPiSessions()
	if err != nil {
		log.Printf("[WARN] Failed to query pi sessions: %v", err)
		respondJSON(w, map[string]interface{}{"agents": []agentGroup{}}, http.StatusOK)
		return
	}
	if groups == nil {
		groups = []agentGroup{}
	}
	respondJSON(w, map[string]interface{}{"agents": groups}, http.StatusOK)
}
