package server

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
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

	for i := range result.ChangeRequests {
		if result.ChangeRequests[i].DefaultBranch == "" {
			result.ChangeRequests[i].DefaultBranch = targetApp.MainWorktreeBranch
		}
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

func (s *Server) handleGitHubPullRequest(w http.ResponseWriter, r *http.Request) {
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

	prNumber, err := strconv.Atoi(prNumberStr)
	if err != nil || prNumber <= 0 {
		respondBadRequest(w, "Invalid crIID")
		return
	}

	targetApp := s.findAppByIdent(appIdent)
	if targetApp == nil {
		respondNotFound(w, "App not found")
		return
	}
	if targetApp.RepositoryPath == "" {
		respondBadRequest(w, "App has no repository path")
		return
	}

	ghClient, repoInfo, _, err := s.resolveGitHubClient(targetApp)
	if err != nil {
		respondBadRequest(w, err.Error())
		return
	}

	pr, err := ghClient.GetPullRequest(repoInfo, prNumber)
	if err != nil {
		respondErrorMessage(w, fmt.Sprintf("Failed to fetch pull request: %v", err), http.StatusInternalServerError)
		return
	}

	if pr.DefaultBranch == "" {
		pr.DefaultBranch = targetApp.MainWorktreeBranch
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pr)
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
