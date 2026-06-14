package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/friendsfriend/devenv/pkg/app"
	"github.com/friendsfriend/devenv/pkg/github"
	"github.com/friendsfriend/devenv/pkg/gitlab"
	"github.com/friendsfriend/devenv/pkg/issues"
)

// resolveGitHubIssueClient returns a GitHub issues client.
func (s *Server) resolveGitHubIssueClient(targetApp *app.App) (issues.Client, *github.RepoInfo, error) {
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
	ghClient := github.NewClient(token, username)
	issuesClient := github.NewIssuesClient(ghClient, repoInfo)
	return issuesClient, repoInfo, nil
}

// resolveGitLabIssueClient returns a GitLab issues client.
func (s *Server) resolveGitLabIssueClient(targetApp *app.App) (issues.Client, *gitlab.ProjectInfo, error) {
	projectInfo, err := gitlab.ExtractProjectInfo(targetApp.RepositoryPath)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to extract project info: %w", err)
	}
	providerName := targetApp.GetProviderName()
	username, token := "", ""
	if s.services.ProviderStore() != nil {
		username, token = s.services.ProviderStore().CredentialsFor(providerName)
	}
	if token == "" {
		return nil, nil, fmt.Errorf("no token configured for provider %q", providerName)
	}
	baseURL := fmt.Sprintf("https://%s", projectInfo.Host)
	glClient := gitlab.NewClient(baseURL, token, username)
	issuesClient := gitlab.NewIssuesClient(glClient, projectInfo)
	return issuesClient, projectInfo, nil
}

// handleGitHubIssues — GET /api/github/issues
func (s *Server) handleGitHubIssues(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondMethodNotAllowed(w)
		return
	}

	appIdent := r.URL.Query().Get("appIdent")
	scope := r.URL.Query().Get("scope")
	search := r.URL.Query().Get("search")
	pageStr := r.URL.Query().Get("page")
	perPageStr := r.URL.Query().Get("perPage")

	if appIdent == "" {
		respondBadRequest(w, "appIdent parameter required")
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

	issuesClient, _, err := s.resolveGitHubIssueClient(targetApp)
	if err != nil {
		respondBadRequest(w, err.Error())
		return
	}

	log.Printf("[DEBUG] handleGitHubIssues: appIdent=%q scope=%q search=%q page=%d perPage=%d", appIdent, scope, search, page, perPage)

	result, err := issuesClient.GetIssues(nil, &issues.IssueListOptions{
		Scope:   scope,
		Search:  search,
		Page:    page,
		PerPage: perPage,
		State:   "open",
	})
	if err != nil {
		respondErrorMessage(w, fmt.Sprintf("Failed to fetch issues: %v", err), http.StatusInternalServerError)
		return
	}

	log.Printf("[DEBUG] handleGitHubIssues: returned %d items, scope=%q", len(result.Issues), scope)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// handleGitHubIssueDetail — GET /api/github/issues/{n}
func (s *Server) handleGitHubIssueDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondMethodNotAllowed(w)
		return
	}

	appIdent := r.URL.Query().Get("appIdent")
	numberStr := r.URL.Query().Get("number")

	if appIdent == "" || numberStr == "" {
		respondBadRequest(w, "appIdent and number parameters required")
		return
	}

	number, err := strconv.Atoi(numberStr)
	if err != nil {
		respondBadRequest(w, "Invalid number")
		return
	}

	targetApp := s.findAppByIdent(appIdent)
	if targetApp == nil {
		respondNotFound(w, "App not found")
		return
	}

	issuesClient, _, err := s.resolveGitHubIssueClient(targetApp)
	if err != nil {
		respondBadRequest(w, err.Error())
		return
	}

	issue, err := issuesClient.GetIssue(nil, number)
	if err != nil {
		respondErrorMessage(w, fmt.Sprintf("Failed to fetch issue: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(issue)
}

// handleGitHubIssueComments — GET /api/github/issues/{n}/comments
func (s *Server) handleGitHubIssueComments(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondMethodNotAllowed(w)
		return
	}

	appIdent := r.URL.Query().Get("appIdent")
	numberStr := r.URL.Query().Get("number")

	if appIdent == "" || numberStr == "" {
		respondBadRequest(w, "appIdent and number parameters required")
		return
	}

	number, err := strconv.Atoi(numberStr)
	if err != nil {
		respondBadRequest(w, "Invalid number")
		return
	}

	targetApp := s.findAppByIdent(appIdent)
	if targetApp == nil {
		respondNotFound(w, "App not found")
		return
	}

	issuesClient, _, err := s.resolveGitHubIssueClient(targetApp)
	if err != nil {
		respondBadRequest(w, err.Error())
		return
	}

	comments, err := issuesClient.GetIssueComments(nil, number)
	if err != nil {
		respondErrorMessage(w, fmt.Sprintf("Failed to fetch issue comments: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comments)
}

// handleGitLabIssues — GET /api/gitlab/issues
func (s *Server) handleGitLabIssues(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondMethodNotAllowed(w)
		return
	}

	appIdent := r.URL.Query().Get("appIdent")
	scope := r.URL.Query().Get("scope")
	search := r.URL.Query().Get("search")
	pageStr := r.URL.Query().Get("page")
	perPageStr := r.URL.Query().Get("perPage")

	if appIdent == "" {
		respondBadRequest(w, "appIdent parameter required")
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

	issuesClient, _, err := s.resolveGitLabIssueClient(targetApp)
	if err != nil {
		respondBadRequest(w, err.Error())
		return
	}

	result, err := issuesClient.GetIssues(nil, &issues.IssueListOptions{
		Scope:   scope,
		Search:  search,
		Page:    page,
		PerPage: perPage,
		State:   "opened",
	})
	if err != nil {
		respondErrorMessage(w, fmt.Sprintf("Failed to fetch issues: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// handleGitLabIssueDetail — GET /api/gitlab/issues/{n}
func (s *Server) handleGitLabIssueDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondMethodNotAllowed(w)
		return
	}

	appIdent := r.URL.Query().Get("appIdent")
	numberStr := r.URL.Query().Get("number")

	if appIdent == "" || numberStr == "" {
		respondBadRequest(w, "appIdent and number parameters required")
		return
	}

	number, err := strconv.Atoi(numberStr)
	if err != nil {
		respondBadRequest(w, "Invalid number")
		return
	}

	targetApp := s.findAppByIdent(appIdent)
	if targetApp == nil {
		respondNotFound(w, "App not found")
		return
	}

	issuesClient, _, err := s.resolveGitLabIssueClient(targetApp)
	if err != nil {
		respondBadRequest(w, err.Error())
		return
	}

	issue, err := issuesClient.GetIssue(nil, number)
	if err != nil {
		respondErrorMessage(w, fmt.Sprintf("Failed to fetch issue: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(issue)
}

// handleGitLabIssueComments — GET /api/gitlab/issues/{n}/comments
func (s *Server) handleGitLabIssueComments(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondMethodNotAllowed(w)
		return
	}

	appIdent := r.URL.Query().Get("appIdent")
	numberStr := r.URL.Query().Get("number")

	if appIdent == "" || numberStr == "" {
		respondBadRequest(w, "appIdent and number parameters required")
		return
	}

	number, err := strconv.Atoi(numberStr)
	if err != nil {
		respondBadRequest(w, "Invalid number")
		return
	}

	targetApp := s.findAppByIdent(appIdent)
	if targetApp == nil {
		respondNotFound(w, "App not found")
		return
	}

	issuesClient, _, err := s.resolveGitLabIssueClient(targetApp)
	if err != nil {
		respondBadRequest(w, err.Error())
		return
	}

	comments, err := issuesClient.GetIssueComments(nil, number)
	if err != nil {
		respondErrorMessage(w, fmt.Sprintf("Failed to fetch issue comments: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comments)
}

var _ = log.Printf
