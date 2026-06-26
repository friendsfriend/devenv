package github

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/friendsfriend/devenv/pkg/issues"
)

// --- GitHub API raw types for issues ---

type ghLabel struct {
	Name string `json:"name"`
}

type ghMilestone struct {
	Title string `json:"title"`
}

type ghAssignee struct {
	Login string `json:"login"`
}

type ghIssue struct {
	ID          int          `json:"id"`
	Number      int          `json:"number"`
	Title       string       `json:"title"`
	Body        string       `json:"body"`
	State       string       `json:"state"`
	HTMLURL     string       `json:"html_url"`
	User        ghUser       `json:"user"`
	Labels      []ghLabel    `json:"labels"`
	Assignees   []ghAssignee `json:"assignees"`
	Milestone   *ghMilestone `json:"milestone,omitempty"`
	PullRequest *struct{}    `json:"pull_request,omitempty"` // non-nil means this is a PR
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

// ghIssueComment is defined in client.go — using that type here

// --- Conversion helpers ---

func convertGHIssue(issue ghIssue) issues.Issue {
	result := issues.Issue{
		ID:          issue.ID,
		IID:         issue.Number,
		Title:       issue.Title,
		Description: issue.Body,
		State:       issue.State,
		WebURL:      issue.HTMLURL,
		CreatedAt:   issue.CreatedAt,
		UpdatedAt:   issue.UpdatedAt,
	}
	result.Author.Name = issue.User.Login
	result.Author.Username = issue.User.Login

	for _, l := range issue.Labels {
		result.Labels = append(result.Labels, l.Name)
	}
	for _, a := range issue.Assignees {
		result.Assignees = append(result.Assignees, struct {
			Name     string `json:"name"`
			Username string `json:"username"`
		}{Name: a.Login, Username: a.Login})
	}
	if issue.Milestone != nil {
		result.Milestone = &struct {
			Title string `json:"title"`
		}{Title: issue.Milestone.Title}
	}

	return result
}

func convertGHIssueComment(comment ghIssueComment) issues.IssueComment {
	result := issues.IssueComment{
		ID:        comment.ID,
		Body:      comment.Body,
		CreatedAt: comment.CreatedAt,
		UpdatedAt: comment.UpdatedAt,
		System:    false,
	}
	result.Author.Name = comment.User.Login
	result.Author.Username = comment.User.Login
	return result
}

// --- issues.Client implementation ---

// IssuesClient wraps a GitHub client to implement issues.Client.
type IssuesClient struct {
	c    *client
	info *RepoInfo
}

// NewIssuesClient creates a new IssuesClient for the given repository.
func NewIssuesClient(c Client, info *RepoInfo) issues.Client {
	// Access the underlying *client
	ghClient := c.(*client)
	return &IssuesClient{
		c:    ghClient,
		info: info,
	}
}

// issueToMR converts github.RepoInfo to issues.RepoInfo.
func (ic *IssuesClient) issueToMR() *issues.RepoInfo {
	return &issues.RepoInfo{
		Owner: ic.info.Owner,
		Repo:  ic.info.Repo,
		Host:  "github.com",
	}
}

// GetIssues implements issues.Client.GetIssues.
func (ic *IssuesClient) GetIssues(info *issues.RepoInfo, options *issues.IssueListOptions) (*issues.IssueListResult, error) {
	ghInfo := ic.info
	if info != nil {
		if info.Owner != "" && info.Repo != "" {
			ghInfo = &RepoInfo{Owner: info.Owner, Repo: info.Repo}
		}
	}

	page := 1
	perPage := 50
	scope := ""
	search := ""
	state := "open"
	if options != nil {
		if options.Page > 0 {
			page = options.Page
		}
		if options.PerPage > 0 {
			perPage = options.PerPage
		}
		scope = options.Scope
		search = options.Search
		if options.State != "" {
			state = options.State
		}
	}

	// Build search query: combine explicit search with scope filter.
	// We use the search API for scope filtering because GitHub's `filter`
	// parameter doesn't work with fine-grained PATs. The search API
	// supports assignee:@me, author:@me, no:assignee reliably.
	searchQueryParts := search
	scopeQuery := ""
	switch scope {
	case "assigned-to-me":
		scopeQuery = "assignee:@me"
	case "created-by-me":
		scopeQuery = "author:@me"
	case "no-assignee":
		scopeQuery = "no:assignee"
	}
	if scopeQuery != "" {
		if searchQueryParts != "" {
			searchQueryParts = searchQueryParts + " " + scopeQuery
		} else {
			searchQueryParts = scopeQuery
		}
	}
	// Always use the search API so GitHub paginates over real issues only.
	// The standard /issues endpoint includes pull requests, and filtering PRs
	// after pagination makes pages contain a variable number of issues.
	return ic.searchIssues(ghInfo, searchQueryParts, page, perPage, state)
}

// searchIssues searches issues via GitHub's /search/issues endpoint.
func (ic *IssuesClient) searchIssues(ghInfo *RepoInfo, query string, page, perPage int, state string) (*issues.IssueListResult, error) {
	searchQuery := fmt.Sprintf("repo:%s/%s type:issue state:%s %s", ghInfo.Owner, ghInfo.Repo, state, query)

	params := url.Values{}
	params.Set("q", searchQuery)
	params.Set("per_page", fmt.Sprintf("%d", perPage))
	params.Set("page", fmt.Sprintf("%d", page))
	params.Set("sort", "updated")
	params.Set("order", "desc")

	apiURL := fmt.Sprintf("https://api.github.com/search/issues?%s", params.Encode())

	resp, err := ic.c.doRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to execute search request: %w", err)
	}

	body, err := readBody(resp)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub search API error (status %d): %s", resp.StatusCode, string(body))
	}

	var searchResp struct {
		TotalCount int       `json:"total_count"`
		Items      []ghIssue `json:"items"`
	}

	if err := json.Unmarshal(body, &searchResp); err != nil {
		return nil, fmt.Errorf("failed to parse search results: %w", err)
	}

	// Parse pagination
	linkHeader := resp.Header.Get("Link")
	_, totalPages := parseLinkHeaderForPagination(linkHeader, page)
	totalPages = (searchResp.TotalCount + perPage - 1) / perPage

	results := make([]issues.Issue, 0, len(searchResp.Items))
	for _, item := range searchResp.Items {
		if item.PullRequest != nil {
			continue
		}
		results = append(results, convertGHIssue(item))
	}

	return &issues.IssueListResult{
		Issues:      results,
		TotalCount:  searchResp.TotalCount,
		TotalPages:  totalPages,
		CurrentPage: page,
		PerPage:     perPage,
	}, nil
}

// GetIssue implements issues.Client.GetIssue.
func (ic *IssuesClient) GetIssue(info *issues.RepoInfo, number int) (*issues.Issue, error) {
	ghInfo := ic.info
	if info != nil {
		if info.Owner != "" && info.Repo != "" {
			ghInfo = &RepoInfo{Owner: info.Owner, Repo: info.Repo}
		}
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues/%d",
		ghInfo.Owner, ghInfo.Repo, number)

	resp, err := ic.c.doRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}

	body, err := readBody(resp)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	var ghIss ghIssue
	if err := json.Unmarshal(body, &ghIss); err != nil {
		return nil, fmt.Errorf("failed to parse issue: %w", err)
	}

	result := convertGHIssue(ghIss)
	return &result, nil
}

// GetIssueComments implements issues.Client.GetIssueComments.
func (ic *IssuesClient) GetIssueComments(info *issues.RepoInfo, number int) (*issues.IssueCommentListResult, error) {
	ghInfo := ic.info
	if info != nil {
		if info.Owner != "" && info.Repo != "" {
			ghInfo = &RepoInfo{Owner: info.Owner, Repo: info.Repo}
		}
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues/%d/comments?per_page=100",
		ghInfo.Owner, ghInfo.Repo, number)

	resp, err := ic.c.doRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}

	body, err := readBody(resp)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	var ghComments []ghIssueComment
	if err := json.Unmarshal(body, &ghComments); err != nil {
		return nil, fmt.Errorf("failed to parse issue comments: %w", err)
	}

	results := make([]issues.IssueComment, 0, len(ghComments))
	for _, c := range ghComments {
		results = append(results, convertGHIssueComment(c))
	}

	linkHeader := resp.Header.Get("Link")
	_, totalPages := parseLinkHeaderForPagination(linkHeader, 1)

	return &issues.IssueCommentListResult{
		Comments:    results,
		TotalCount:  -1,
		TotalPages:  totalPages,
		CurrentPage: 1,
		PerPage:     100,
	}, nil
}

// --- Mutation implementations ---

// CloseIssue implements issues.Client.CloseIssue for GitHub.
func (ic *IssuesClient) CloseIssue(info *issues.RepoInfo, number int, reason string) (*issues.Issue, error) {
	ghInfo := ic.info
	if info != nil && info.Owner != "" && info.Repo != "" {
		ghInfo = &RepoInfo{Owner: info.Owner, Repo: info.Repo}
	}

	type closePayload struct {
		State       string `json:"state"`
		StateReason string `json:"state_reason,omitempty"`
	}
	payload := closePayload{State: "closed", StateReason: reason}
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues/%d", ghInfo.Owner, ghInfo.Repo, number)
	resp, err := ic.c.doRequest("PATCH", apiURL, strings.NewReader(string(jsonPayload)))
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}

	body, err := readBody(resp)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	var ghIss ghIssue
	if err := json.Unmarshal(body, &ghIss); err != nil {
		return nil, fmt.Errorf("failed to parse closed issue: %w", err)
	}

	result := convertGHIssue(ghIss)
	return &result, nil
}

// ReopenIssue implements issues.Client.ReopenIssue for GitHub.
func (ic *IssuesClient) ReopenIssue(info *issues.RepoInfo, number int) (*issues.Issue, error) {
	ghInfo := ic.info
	if info != nil && info.Owner != "" && info.Repo != "" {
		ghInfo = &RepoInfo{Owner: info.Owner, Repo: info.Repo}
	}

	payload := map[string]string{"state": "open"}
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues/%d", ghInfo.Owner, ghInfo.Repo, number)
	resp, err := ic.c.doRequest("PATCH", apiURL, strings.NewReader(string(jsonPayload)))
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}

	body, err := readBody(resp)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	var ghIss ghIssue
	if err := json.Unmarshal(body, &ghIss); err != nil {
		return nil, fmt.Errorf("failed to parse reopened issue: %w", err)
	}

	result := convertGHIssue(ghIss)
	return &result, nil
}

// SetLabels implements issues.Client.SetLabels for GitHub.
func (ic *IssuesClient) SetLabels(info *issues.RepoInfo, number int, labels []string) (*issues.Issue, error) {
	ghInfo := ic.info
	if info != nil && info.Owner != "" && info.Repo != "" {
		ghInfo = &RepoInfo{Owner: info.Owner, Repo: info.Repo}
	}

	type labelsPayload struct {
		Labels []string `json:"labels"`
	}

	payload := labelsPayload{Labels: labels}
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal labels payload: %w", err)
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues/%d/labels", ghInfo.Owner, ghInfo.Repo, number)
	resp, err := ic.c.doRequest("PUT", apiURL, strings.NewReader(string(jsonPayload)))
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}

	body, err := readBody(resp)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	// Re-fetch the issue to get updated state
	return ic.GetIssue(info, number)
}

// AddAssignee implements issues.Client.AddAssignee for GitHub.
func (ic *IssuesClient) AddAssignee(info *issues.RepoInfo, number int, assignee string) (*issues.Issue, error) {
	ghInfo := ic.info
	if info != nil && info.Owner != "" && info.Repo != "" {
		ghInfo = &RepoInfo{Owner: info.Owner, Repo: info.Repo}
	}

	type assigneePayload struct {
		Assignees []string `json:"assignees"`
	}

	payload := assigneePayload{Assignees: []string{assignee}}
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal assignee payload: %w", err)
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues/%d/assignees", ghInfo.Owner, ghInfo.Repo, number)
	resp, err := ic.c.doRequest("POST", apiURL, strings.NewReader(string(jsonPayload)))
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}

	body, err := readBody(resp)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	return ic.GetIssue(info, number)
}

// RemoveAssignee implements issues.Client.RemoveAssignee for GitHub.
func (ic *IssuesClient) RemoveAssignee(info *issues.RepoInfo, number int) (*issues.Issue, error) {
	ghInfo := ic.info
	if info != nil && info.Owner != "" && info.Repo != "" {
		ghInfo = &RepoInfo{Owner: info.Owner, Repo: info.Repo}
	}

	type assigneePayload struct {
		Assignees []string `json:"assignees"`
	}

	payload := assigneePayload{Assignees: []string{}}
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal remove assignee payload: %w", err)
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues/%d/assignees", ghInfo.Owner, ghInfo.Repo, number)
	resp, err := ic.c.doRequest("DELETE", apiURL, strings.NewReader(string(jsonPayload)))
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}

	body, err := readBody(resp)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	return ic.GetIssue(info, number)
}

// GetRepoLabels implements issues.Client.GetRepoLabels for GitHub.
func (ic *IssuesClient) GetRepoLabels(info *issues.RepoInfo) ([]string, error) {
	ghInfo := ic.info
	if info != nil && info.Owner != "" && info.Repo != "" {
		ghInfo = &RepoInfo{Owner: info.Owner, Repo: info.Repo}
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/labels?per_page=100", ghInfo.Owner, ghInfo.Repo)
	resp, err := ic.c.doRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}

	body, err := readBody(resp)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	var ghLabels []ghLabel
	if err := json.Unmarshal(body, &ghLabels); err != nil {
		return nil, fmt.Errorf("failed to parse labels: %w", err)
	}

	result := make([]string, 0, len(ghLabels))
	for _, l := range ghLabels {
		result = append(result, l.Name)
	}
	return result, nil
}

// GetRepoCollaborators implements issues.Client.GetRepoCollaborators for GitHub.
func (ic *IssuesClient) GetRepoCollaborators(info *issues.RepoInfo) ([]string, error) {
	ghInfo := ic.info
	if info != nil && info.Owner != "" && info.Repo != "" {
		ghInfo = &RepoInfo{Owner: info.Owner, Repo: info.Repo}
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/collaborators?per_page=100", ghInfo.Owner, ghInfo.Repo)
	resp, err := ic.c.doRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}

	body, err := readBody(resp)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	var users []ghUser
	if err := json.Unmarshal(body, &users); err != nil {
		return nil, fmt.Errorf("failed to parse collaborators: %w", err)
	}

	result := make([]string, 0, len(users))
	for _, u := range users {
		result = append(result, u.Login)
	}
	return result, nil
}

// AddComment implements issues.Client.AddComment for GitHub.
func (ic *IssuesClient) AddComment(info *issues.RepoInfo, number int, body string) (*issues.IssueComment, error) {
	ghInfo := ic.info
	if info != nil && info.Owner != "" && info.Repo != "" {
		ghInfo = &RepoInfo{Owner: info.Owner, Repo: info.Repo}
	}

	type commentPayload struct {
		Body string `json:"body"`
	}
	payload := commentPayload{Body: body}
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues/%d/comments",
		ghInfo.Owner, ghInfo.Repo, number)
	resp, err := ic.c.doRequest("POST", apiURL, strings.NewReader(string(jsonPayload)))
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}

	bodyBytes, err := readBody(resp)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(bodyBytes))
	}

	var ghComment ghIssueComment
	if err := json.Unmarshal(bodyBytes, &ghComment); err != nil {
		return nil, fmt.Errorf("failed to parse comment: %w", err)
	}

	result := convertGHIssueComment(ghComment)
	return &result, nil
}

// ensure logger import is used
var _ = log.Printf
