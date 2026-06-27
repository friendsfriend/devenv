package server

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/friendsfriend/devenv/pkg/app"
	"github.com/friendsfriend/devenv/pkg/github"
	"github.com/friendsfriend/devenv/pkg/gitlab"
	"github.com/friendsfriend/devenv/pkg/mr"
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

// resolveGitHubMRClient returns a GitHub client with the repo info converted to mr.RepoInfo.
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

	result, err := ghClient.GetMRs(repoInfo.ToMR(), &mr.MRListOptions{
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

	if len(result.MergeRequests) == 0 {
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
	prNumberStr := r.URL.Query().Get("mrIID")

	if appIdent == "" || prNumberStr == "" {
		respondBadRequest(w, "appIdent and mrIID parameters required")
		return
	}

	var prNumber int
	if _, err := fmt.Sscanf(prNumberStr, "%d", &prNumber); err != nil {
		respondBadRequest(w, "Invalid mrIID")
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

	changes, err := ghClient.GetMRChanges(repoInfo.ToMR(), prNumber)
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
	prNumberStr := r.URL.Query().Get("mrIID")

	if appIdent == "" || prNumberStr == "" {
		respondBadRequest(w, "appIdent and mrIID parameters required")
		return
	}

	var prNumber int
	if _, err := fmt.Sscanf(prNumberStr, "%d", &prNumber); err != nil {
		respondBadRequest(w, "Invalid mrIID")
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

	discussions, err := ghClient.GetDiscussions(repoInfo.ToMR(), prNumber)
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
	prNumberStr := r.URL.Query().Get("mrIID")

	if appIdent == "" || prNumberStr == "" {
		respondBadRequest(w, "appIdent and mrIID parameters required")
		return
	}

	var prNumber int
	if _, err := fmt.Sscanf(prNumberStr, "%d", &prNumber); err != nil {
		respondBadRequest(w, "Invalid mrIID")
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

	if err := ghClient.Approve(repoInfo.ToMR(), prNumber); err != nil {
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
	prNumberStr := r.URL.Query().Get("mrIID")

	if appIdent == "" || prNumberStr == "" {
		respondBadRequest(w, "appIdent and mrIID parameters required")
		return
	}

	var prNumber int
	if _, err := fmt.Sscanf(prNumberStr, "%d", &prNumber); err != nil {
		respondBadRequest(w, "Invalid mrIID")
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

	if err := ghClient.Unapprove(repoInfo.ToMR(), prNumber); err != nil {
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
	prNumberStr := r.URL.Query().Get("mrIID")

	if appIdent == "" || prNumberStr == "" {
		respondBadRequest(w, "appIdent and mrIID parameters required")
		return
	}

	var prNumber int
	if _, err := fmt.Sscanf(prNumberStr, "%d", &prNumber); err != nil {
		respondBadRequest(w, "Invalid mrIID")
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

	if err := ghClient.ToggleApproval(repoInfo.ToMR(), prNumber); err != nil {
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

	jobs, err := ghClient.GetPipelineJobs(repoInfo.ToMR(), runID)
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

	logs, err := ghClient.GetJobLogs(repoInfo.ToMR(), jobID)
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

	baseURL, err := s.ensureOpencodeServer()
	if err != nil {
		respondErrorMessage(w, fmt.Sprintf("opencode not available: %v", err), http.StatusServiceUnavailable)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()

	// Create a fresh session for this analysis
	sessBody, _ := json.Marshal(map[string]string{"title": "log-analysis"})
	sessResp, err := ctxPost(ctx, baseURL+"/session", sessBody)
	if err != nil {
		respondErrorMessage(w, fmt.Sprintf("opencode session create failed: %v", err), http.StatusBadGateway)
		return
	}
	var sessData struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(sessResp, &sessData); err != nil || sessData.ID == "" {
		respondErrorMessage(w, "opencode session create: unexpected response", http.StatusBadGateway)
		return
	}

	// Send prompt with logs inlined as text
	fullText := prompt + "\n\n" + req.Logs
	msgBody, _ := json.Marshal(map[string]interface{}{
		"parts": []map[string]string{{"type": "text", "text": fullText}},
	})
	msgResp, err := ctxPost(ctx, baseURL+"/session/"+sessData.ID+"/message", msgBody)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			respondErrorMessage(w, "AI analysis timed out", http.StatusGatewayTimeout)
			return
		}
		respondErrorMessage(w, fmt.Sprintf("opencode message failed: %v", err), http.StatusBadGateway)
		return
	}

	var msgData struct {
		Parts []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"parts"`
	}
	if err := json.Unmarshal(msgResp, &msgData); err != nil {
		respondErrorMessage(w, "opencode message: unexpected response", http.StatusBadGateway)
		return
	}

	var sb strings.Builder
	for _, p := range msgData.Parts {
		if p.Type == "text" {
			sb.WriteString(p.Text)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"summary": sb.String()})
}

func (s *Server) handleAIAnalyzeLogsStream(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondMethodNotAllowed(w)
		return
	}

	var req struct {
		Logs    string `json:"logs"`
		Prompt  string `json:"prompt"`
		Backend string `json:"backend"`
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

	// Dispatch to pi backend when requested
	if req.Backend == "pi" {
		s.handlePiAnalyzeLogsStream(w, r, req.Logs, prompt)
		return
	}

	baseURL, err := s.ensureOpencodeServer()
	if err != nil {
		respondErrorMessage(w, fmt.Sprintf("opencode not available: %v", err), http.StatusServiceUnavailable)
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

	ctx, cancel := context.WithTimeout(r.Context(), 90*time.Second)
	defer cancel()

	sessID, evtResp, err := s.createOpencodeSession(ctx, baseURL)
	if err != nil {
		fmt.Fprintf(w, "data: {\"error\":\"%s\"}\n\n", jsonEscape(err.Error()))
		flusher.Flush()
		return
	}
	defer evtResp.Body.Close()

	fmt.Fprintf(w, "data: {\"sessionId\":\"%s\"}\n\n", jsonEscape(sessID))
	flusher.Flush()

	go sendLogsToSession(req.Logs, prompt, baseURL, sessID)

	relayOpencodeSSE(ctx, r, w, flusher, sessID, evtResp.Body)
}

func (s *Server) createOpencodeSession(ctx context.Context, baseURL string) (string, *http.Response, error) {
	sessBody, _ := json.Marshal(map[string]string{"title": "log-analysis"})
	sessResp, err := ctxPost(ctx, baseURL+"/session", sessBody)
	if err != nil {
		return "", nil, fmt.Errorf("session create failed: %w", err)
	}
	var sessData struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(sessResp, &sessData); err != nil || sessData.ID == "" {
		return "", nil, fmt.Errorf("unexpected session response")
	}

	evtReq, err := http.NewRequestWithContext(ctx, http.MethodGet, baseURL+"/event", nil)
	if err != nil {
		return "", nil, fmt.Errorf("event stream setup failed: %w", err)
	}
	evtResp, err := http.DefaultClient.Do(evtReq)
	if err != nil {
		return "", nil, fmt.Errorf("event stream connect failed: %w", err)
	}
	return sessData.ID, evtResp, nil
}

func sendLogsToSession(logs, prompt, baseURL, sessID string) {
	const maxLogBytes = 100 * 1024
	if len(logs) > maxLogBytes {
		logs = logs[len(logs)-maxLogBytes:]
		prompt += "\n[Note: log was truncated to the most recent 100 KB]"
	}
	fullText := prompt + "\n\n" + logs
	msgBody, _ := json.Marshal(map[string]interface{}{
		"parts": []map[string]string{{"type": "text", "text": fullText}},
	})
	bgCtx, bgCancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer bgCancel()
	ctxPost(bgCtx, baseURL+"/session/"+sessID+"/message", msgBody) //nolint:errcheck
}

func relayOpencodeSSE(ctx context.Context, r *http.Request, w http.ResponseWriter, flusher http.Flusher, sessID string, body io.Reader) {
	decoder := newSSEDecoder(body)
	for {
		select {
		case <-ctx.Done():
			fmt.Fprintf(w, "data: {\"error\":\"timeout\"}\n\n")
			flusher.Flush()
			return
		case <-r.Context().Done():
			return
		default:
		}

		line, err := decoder.readLine()
		if err != nil {
			fmt.Fprintf(w, "data: {\"error\":\"opencode stream closed unexpectedly: %s\"}\n\n", jsonEscape(err.Error()))
			flusher.Flush()
			return
		}
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		raw := line[6:]

		var evt struct {
			Type       string `json:"type"`
			Properties struct {
				SessionID string `json:"sessionID"`
				Delta     string `json:"delta"`
				Status    struct {
					Type string `json:"type"`
				} `json:"status"`
			} `json:"properties"`
		}
		if err := json.Unmarshal([]byte(raw), &evt); err != nil {
			continue
		}

		if evt.Properties.SessionID != sessID {
			continue
		}

		switch evt.Type {
		case "message.part.delta":
			if evt.Properties.Delta == "" {
				continue
			}
			escaped, _ := json.Marshal(evt.Properties.Delta)
			fmt.Fprintf(w, "data: {\"delta\":%s}\n\n", escaped)
			flusher.Flush()

		case "session.status":
			switch evt.Properties.Status.Type {
			case "idle":
				fmt.Fprintf(w, "data: {\"done\":true}\n\n")
				flusher.Flush()
				return
			case "error":
				fmt.Fprintf(w, "data: {\"error\":\"opencode session error\"}\n\n")
				flusher.Flush()
				return
			}
		}
	}
}

func jsonEscape(s string) string {
	b, _ := json.Marshal(s)
	return string(b[1 : len(b)-1])
}

type sseDecoder struct {
	body []byte
	pos  int
	r    interface {
		Read([]byte) (int, error)
	}
	buf []byte
}

func newSSEDecoder(r interface{ Read([]byte) (int, error) }) *sseDecoder {
	return &sseDecoder{r: r, buf: make([]byte, 4096)}
}

func (d *sseDecoder) readLine() (string, error) {
	var line []byte
	for {
		for i, b := range d.body[d.pos:] {
			if b == '\n' {
				l := d.body[d.pos : d.pos+i]
				d.pos += i + 1
				if len(l) > 0 && l[len(l)-1] == '\r' {
					l = l[:len(l)-1]
				}
				return string(append(line, l...)), nil
			}
		}
		remaining := d.body[d.pos:]
		line = append(line, remaining...)
		n, err := d.r.Read(d.buf)
		if n > 0 {
			d.body = append(remaining[:0:0], d.buf[:n]...)
			d.pos = 0
		}
		if err != nil {
			if len(line) > 0 {
				return string(line), nil
			}
			return "", err
		}
	}
}

// ensureOpencodeServer starts an opencode serve sidecar on first call and returns its base URL.
// Subsequent calls return immediately with the cached URL.
func (s *Server) ensureOpencodeServer() (string, error) {
	s.opencodeOnce.Do(func() {
		if _, err := exec.LookPath("opencode"); err != nil {
			s.opencodeServerErr = fmt.Errorf("opencode not found in PATH")
			return
		}
		port, err := freePort()
		if err != nil {
			s.opencodeServerErr = fmt.Errorf("no free port: %v", err)
			return
		}
		cmd := exec.Command("opencode", "serve", "--port", fmt.Sprintf("%d", port))
		cmd.Stdout = nil
		cmd.Stderr = nil
		if err := cmd.Start(); err != nil {
			s.opencodeServerErr = fmt.Errorf("failed to start opencode serve: %v", err)
			return
		}
		s.opencodeServerCmd = cmd
		url := fmt.Sprintf("http://127.0.0.1:%d", port)
		// Wait until the server is accepting connections (up to 15s)
		deadline := time.Now().Add(15 * time.Second)
		for time.Now().Before(deadline) {
			resp, err := http.Get(url + "/session")
			if err == nil {
				resp.Body.Close()
				s.opencodeServerURL = url
				return
			}
			time.Sleep(300 * time.Millisecond)
		}
		s.opencodeServerErr = fmt.Errorf("opencode serve did not become ready in time")
		cmd.Process.Kill()
	})
	return s.opencodeServerURL, s.opencodeServerErr
}

func (s *Server) stopOpencodeServer() {
	if s.opencodeServerCmd != nil && s.opencodeServerCmd.Process != nil {
		s.opencodeServerCmd.Process.Kill()
		s.opencodeServerCmd.Wait()
		s.opencodeServerCmd = nil
	}
}

func freePort() (int, error) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	defer ln.Close()
	return ln.Addr().(*net.TCPAddr).Port, nil
}

func ctxPost(ctx context.Context, url string, body []byte) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var buf bytes.Buffer
	if _, err := buf.ReadFrom(resp.Body); err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, buf.String())
	}
	return buf.Bytes(), nil
}

// handlePiAnalyzeLogsStream runs pi --print with the given logs and streams the
// result back as a single SSE delta event followed by done.
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
