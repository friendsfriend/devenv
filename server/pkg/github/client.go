package github

import (
	"context"
	"crypto/sha1"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/friendsfriend/devenv/pkg/changerequest"
	"github.com/friendsfriend/devenv/pkg/gitlab"
)

// Client is the GitHub-specific implementation of changerequest.Client.
// It provides merge/pull request operations for GitHub repositories.
type Client interface {
	changerequest.Client
	GetPullRequest(info *RepoInfo, prNumber int) (*ChangeRequest, error)
}

type client struct {
	token      string
	username   string
	httpClient *http.Client
}

func NewClient(token, username string) Client {
	return newClient(token, username, nil)
}

func newClient(token, username string, httpClient *http.Client) Client {
	if httpClient == nil {
		httpClient = &http.Client{
			Timeout: time.Second * 15,
			Transport: &http.Transport{
				ResponseHeaderTimeout: time.Second * 10,
				TLSHandshakeTimeout:   time.Second * 5,
				DisableKeepAlives:     false,
			},
		}
	}
	return &client{
		token:      token,
		username:   username,
		httpClient: httpClient,
	}
}

// RepoInfo holds owner and repository name extracted from a GitHub URL
type RepoInfo struct {
	Owner string
	Repo  string
}

// ToChangeRequest converts github.RepoInfo to changerequest.RepoInfo.
func (r *RepoInfo) ToChangeRequest() *changerequest.RepoInfo {
	return &changerequest.RepoInfo{
		Owner: r.Owner,
		Repo:  r.Repo,
		Host:  "github.com",
	}
}

// FromChangeRequest converts changerequest.RepoInfo to github.RepoInfo.
func FromChangeRequest(info *changerequest.RepoInfo) (*RepoInfo, error) {
	if info == nil {
		return nil, fmt.Errorf("repo info is nil")
	}
	if info.Owner == "" || info.Repo == "" {
		return nil, fmt.Errorf("changerequest.RepoInfo missing Owner or Repo fields")
	}
	return &RepoInfo{
		Owner: info.Owner,
		Repo:  info.Repo,
	}, nil
}

// ExtractRepoInfo extracts owner/repo from a GitHub repository URL.
// Supports HTTPS (https://github.com/owner/repo.git) and SSH (git@github.com:owner/repo.git) formats.
func ExtractRepoInfo(gitURL string) (*RepoInfo, error) {
	if gitURL == "" {
		return nil, fmt.Errorf("empty Git URL")
	}

	gitURL = strings.TrimSpace(gitURL)

	var ownerRepo string

	if strings.HasPrefix(gitURL, "git@github.com:") {
		// SSH: git@github.com:owner/repo.git
		ownerRepo = strings.TrimPrefix(gitURL, "git@github.com:")
		ownerRepo = strings.TrimSuffix(ownerRepo, ".git")
	} else if strings.HasPrefix(gitURL, "https://github.com/") || strings.HasPrefix(gitURL, "http://github.com/") {
		// HTTPS: https://github.com/owner/repo.git
		parsed, err := url.Parse(gitURL)
		if err != nil {
			return nil, fmt.Errorf("failed to parse GitHub URL: %w", err)
		}
		ownerRepo = strings.TrimPrefix(parsed.Path, "/")
		ownerRepo = strings.TrimSuffix(ownerRepo, ".git")
	} else {
		return nil, fmt.Errorf("not a GitHub URL: %s", gitURL)
	}

	parts := strings.SplitN(ownerRepo, "/", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return nil, fmt.Errorf("invalid GitHub URL format (expected owner/repo): %s", gitURL)
	}

	return &RepoInfo{
		Owner: parts[0],
		Repo:  parts[1],
	}, nil
}

// --- GitHub API raw types (used internally for unmarshalling) ---

type ghPRBranch struct {
	Ref string `json:"ref"` // branch name
	SHA string `json:"sha"`
}

type ghUser struct {
	Login string `json:"login"`
}

type ghPR struct {
	ID        int        `json:"id"`
	Number    int        `json:"number"`
	Title     string     `json:"title"`
	Body      string     `json:"body"`
	State     string     `json:"state"` // open, closed
	Merged    bool       `json:"merged"`
	Draft     bool       `json:"draft"`
	HTMLURL   string     `json:"html_url"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	User      ghUser     `json:"user"`
	Head      ghPRBranch `json:"head"`
	Base      ghPRBranch `json:"base"`
	// Mergeability — may be null until GitHub computes it
	Mergeable      *bool  `json:"mergeable"`
	MergeableState string `json:"mergeable_state"` // clean, dirty, unstable, blocked, unknown
}

type ghReview struct {
	ID   int    `json:"id"`
	User ghUser `json:"user"`
	// "APPROVED", "CHANGES_REQUESTED", "COMMENTED", "DISMISSED"
	State string `json:"state"`
}

type ghPRFile struct {
	Filename         string `json:"filename"`
	PreviousFilename string `json:"previous_filename,omitempty"`
	Status           string `json:"status"` // added, removed, modified, renamed, copied, changed, unchanged
	Additions        int    `json:"additions"`
	Deletions        int    `json:"deletions"`
	Patch            string `json:"patch,omitempty"` // unified diff
}

type ghIssueComment struct {
	ID        int       `json:"id"`
	Body      string    `json:"body"`
	User      ghUser    `json:"user"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ghPRReviewComment struct {
	ID                  int       `json:"id"`
	Body                string    `json:"body"`
	User                ghUser    `json:"user"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
	Path                string    `json:"path"`
	Line                *int      `json:"line"`
	OriginalLine        *int      `json:"original_line"`
	StartLine           *int      `json:"start_line"`
	OriginalStartLine   *int      `json:"original_start_line"`
	Side                string    `json:"side"` // LEFT or RIGHT
	DiffHunk            string    `json:"diff_hunk"`
	InReplyToID         *int      `json:"in_reply_to_id"`
	PullRequestReviewID int       `json:"pull_request_review_id"`
}

// ghTimelineEvent represents an item from the GitHub Issue/PR Timeline API.
// The timeline returns a mixed array: issue comments (event="commented") and
// issue events (labeled, assigned, renamed, milestoned, etc.).
// We use json.RawMessage for sub-objects so we can switch on event type.
type ghTimelineEvent struct {
	ID        int       `json:"id"`
	Event     string    `json:"event"` // "commented", "labeled", "assigned", "renamed", etc.
	Actor     ghUser    `json:"actor"`
	CreatedAt time.Time `json:"created_at"`
	Body      string    `json:"body,omitempty"` // only for "commented" events
	Label     *struct {
		Name string `json:"name"`
	} `json:"label,omitempty"`
	Assignee *ghUser `json:"assignee,omitempty"`
	Rename   *struct {
		From string `json:"from"`
		To   string `json:"to"`
	} `json:"rename,omitempty"`
	Milestone *struct {
		Title string `json:"title"`
	} `json:"milestone,omitempty"`
	RequestedReviewer *ghUser `json:"requested_reviewer,omitempty"`
	Source            *struct {
		Type  string `json:"type"`
		Issue *struct {
			Number  int    `json:"number"`
			Title   string `json:"title"`
			HTMLURL string `json:"html_url"`
		} `json:"issue,omitempty"`
	} `json:"source,omitempty"`
	PerformedViaGithubApp *json.RawMessage `json:"performed_via_github_app,omitempty"`
}

// --- Canonical types (matching what the server returns to the TUI) ---

// ChangeRequest is the canonical merge/pull request shape returned by the server.
// Field names and JSON tags are identical to the GitLab client's ChangeRequest struct
// so the TUI can consume both sources transparently.
type ChangeRequest struct {
	ID           int       `json:"id"`
	IID          int       `json:"iid"`
	Title        string    `json:"title"`
	Description  string    `json:"description"`
	SourceBranch string    `json:"source_branch"`
	TargetBranch string    `json:"target_branch"`
	State        string    `json:"state"` // opened, merged, closed
	WebURL       string    `json:"web_url"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	Author       struct {
		Name     string `json:"name"`
		Username string `json:"username"`
	} `json:"author"`
	// GitHub has no GitLab-style pipeline, but we expose the latest matching
	// Actions workflow run as head_pipeline for TUI compatibility.
	HeadPipeline *struct {
		ID     int    `json:"id"`
		Status string `json:"status"`
		WebURL string `json:"web_url"`
	} `json:"head_pipeline,omitempty"`

	// Merge-ability
	MergeStatus         string `json:"merge_status"`          // "can_be_merged" | "cannot_be_merged" | "checking"
	DetailedMergeStatus string `json:"detailed_merge_status"` // mirrors mergeable_state
	Draft               bool   `json:"draft"`
	WorkInProgress      bool   `json:"work_in_progress"` // legacy alias for draft
	HasConflicts        bool   `json:"has_conflicts"`
	// GitHub doesn't have the concept of "blocking discussions resolved" — always true
	BlockingDiscussionsResolved bool   `json:"blocking_discussions_resolved"`
	RebaseInProgress            bool   `json:"rebase_in_progress"` // always false for GitHub
	MergeError                  string `json:"merge_error"`

	Approvals *MergeRequestApprovals `json:"approvals,omitempty"`
}

// MergeRequestApprovals mirrors the GitLab approvals shape consumed by the TUI.
type MergeRequestApprovals struct {
	ApprovalsRequired int `json:"approvals_required"` // 1 (GitHub requires at least 1 review — we report 1)
	ApprovalsLeft     int `json:"approvals_left"`
	ApprovedBy        []struct {
		User struct {
			Name     string `json:"name"`
			Username string `json:"username"`
		} `json:"user"`
	} `json:"approved_by"`
}

// ChangeRequestChange mirrors the GitLab ChangeRequestChange shape.
type ChangeRequestChange struct {
	OldPath      string     `json:"old_path"`
	NewPath      string     `json:"new_path"`
	AMode        string     `json:"a_mode"`
	BMode        string     `json:"b_mode"`
	NewFile      bool       `json:"new_file"`
	RenamedFile  bool       `json:"renamed_file"`
	DeletedFile  bool       `json:"deleted_file"`
	Diff         string     `json:"diff"`
	LinesAdded   int        `json:"lines_added"`
	LinesDeleted int        `json:"lines_deleted"`
	DiffLines    []DiffLine `json:"diff_lines,omitempty"`
}

// DiffLine mirrors the GitLab DiffLine shape.
type DiffLine struct {
	LineCode string `json:"line_code"`
	Type     string `json:"type"`     // "new", "old", "match"
	OldLine  *int   `json:"old_line"` // nil for added lines
	NewLine  *int   `json:"new_line"` // nil for deleted lines
	Text     string `json:"text"`
	RichText string `json:"rich_text"`
}

// Discussion mirrors the GitLab Discussion shape so the TUI can render it.
type Discussion struct {
	ID             string `json:"id"`
	IndividualNote bool   `json:"individual_note"`
	Notes          []Note `json:"notes"`
}

// Note mirrors the GitLab Note shape.
type Note struct {
	ID         int        `json:"id"`
	Type       string     `json:"type"`
	Body       string     `json:"body"`
	Author     NoteAuthor `json:"author"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
	System     bool       `json:"system"`
	Resolvable bool       `json:"resolvable"`
	Resolved   bool       `json:"resolved"`
}

// NoteAuthor mirrors the GitLab NoteAuthor shape.
type NoteAuthor struct {
	ID        int    `json:"id"`
	Username  string `json:"username"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
}

// --- Helper: HTTP request with GitHub auth ---

func (c *client) doRequest(method, apiURL string, body io.Reader) (*http.Response, error) {
	req, err := http.NewRequest(method, apiURL, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.token))
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("User-Agent", "devenv-cli")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	return c.httpClient.Do(req)
}

func readBody(resp *http.Response) ([]byte, error) {
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

// --- Conversion helpers ---

func prStateToChangeRequestState(pr ghPR) string {
	if pr.Merged {
		return "merged"
	}
	if pr.State == "closed" {
		return "closed"
	}
	return "opened"
}

func mergeableToChangeRequestStatus(pr ghPR) (mergeStatus, detailedMergeStatus string, hasConflicts bool) {
	if pr.Mergeable == nil {
		// GitHub hasn't computed it yet
		return "checking", "checking", false
	}
	if *pr.Mergeable {
		return "can_be_merged", pr.MergeableState, false
	}
	// Not mergeable — treat "dirty" as conflicts
	if pr.MergeableState == "dirty" {
		return "cannot_be_merged", pr.MergeableState, true
	}
	return "cannot_be_merged", pr.MergeableState, false
}

func convertPR(pr ghPR, approvals *MergeRequestApprovals, latestRun *ghWorkflowRun) ChangeRequest {
	mergeStatus, detailedMergeStatus, hasConflicts := mergeableToChangeRequestStatus(pr)
	state := prStateToChangeRequestState(pr)

	mr := ChangeRequest{
		ID:                          pr.ID,
		IID:                         pr.Number,
		Title:                       pr.Title,
		Description:                 pr.Body,
		SourceBranch:                pr.Head.Ref,
		TargetBranch:                pr.Base.Ref,
		State:                       state,
		WebURL:                      pr.HTMLURL,
		CreatedAt:                   pr.CreatedAt,
		UpdatedAt:                   pr.UpdatedAt,
		MergeStatus:                 mergeStatus,
		DetailedMergeStatus:         detailedMergeStatus,
		Draft:                       pr.Draft,
		WorkInProgress:              pr.Draft,
		HasConflicts:                hasConflicts,
		BlockingDiscussionsResolved: true,
		RebaseInProgress:            false,
		Approvals:                   approvals,
	}
	mr.Author.Name = pr.User.Login
	mr.Author.Username = pr.User.Login

	if latestRun != nil {
		mr.HeadPipeline = &struct {
			ID     int    `json:"id"`
			Status string `json:"status"`
			WebURL string `json:"web_url"`
		}{
			ID:     latestRun.ID,
			Status: mapRunStatusToGitLab(*latestRun),
			WebURL: latestRun.HTMLURL,
		}
	}

	return mr
}

// convertPRToChangeRequest converts a GitHub PR to the unified changerequest.ChangeRequest format.
func convertPRToChangeRequest(pr ghPR, approvals *MergeRequestApprovals, latestRun *ghWorkflowRun) changerequest.ChangeRequest {
	mergeStatus, detailedMergeStatus, hasConflicts := mergeableToChangeRequestStatus(pr)
	state := prStateToChangeRequestState(pr)

	result := changerequest.ChangeRequest{
		ID:                          pr.ID,
		IID:                         pr.Number,
		Title:                       pr.Title,
		Description:                 pr.Body,
		SourceBranch:                pr.Head.Ref,
		TargetBranch:                pr.Base.Ref,
		State:                       state,
		WebURL:                      pr.HTMLURL,
		CreatedAt:                   pr.CreatedAt,
		UpdatedAt:                   pr.UpdatedAt,
		MergeStatus:                 mergeStatus,
		DetailedMergeStatus:         detailedMergeStatus,
		Draft:                       pr.Draft,
		WorkInProgress:              pr.Draft,
		HasConflicts:                hasConflicts,
		BlockingDiscussionsResolved: true,
		RebaseInProgress:            false,
	}
	if approvals != nil {
		result.ApproveStatus = &changerequest.ApproveStatus{
			ApprovalsRequired: approvals.ApprovalsRequired,
			ApprovalsLeft:     approvals.ApprovalsLeft,
			ApprovedBy:        approvals.ApprovedBy,
		}
	}
	result.Author.Name = pr.User.Login
	result.Author.Username = pr.User.Login

	if latestRun != nil {
		result.HeadPipeline = &changerequest.PipelineRef{
			ID:     latestRun.ID,
			Status: mapRunStatusToGitLab(*latestRun),
			WebURL: latestRun.HTMLURL,
		}
	}

	return result
}

// SearchResult represents a repository found via GitHub search.
// Field names and JSON tags match the GitLab SearchResult so the server
// can return a unified shape to the TUI.
type SearchResult struct {
	Name          string `json:"name"`
	FullPath      string `json:"fullPath"`
	HTTPURL       string `json:"httpUrl"`
	DefaultBranch string `json:"defaultBranch"`
}

// --- Public API methods ---

// Search implements changerequest.Client.Search.
func (c *client) Search(info *changerequest.RepoInfo, query string, limit int) ([]changerequest.SearchResult, error) {
	if limit <= 0 {
		limit = 20
	}

	params := url.Values{}
	params.Set("q", query)
	params.Set("per_page", fmt.Sprintf("%d", limit))
	params.Set("sort", "updated")

	apiURL := fmt.Sprintf("https://api.github.com/search/repositories?%s", params.Encode())

	resp, err := c.doRequest("GET", apiURL, nil)
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

	var searchResp struct {
		Items []struct {
			Name          string `json:"name"`
			FullName      string `json:"full_name"`
			CloneURL      string `json:"clone_url"`
			DefaultBranch string `json:"default_branch"`
		} `json:"items"`
	}

	if err := json.Unmarshal(body, &searchResp); err != nil {
		return nil, fmt.Errorf("failed to parse search response: %w", err)
	}

	results := make([]changerequest.SearchResult, 0, len(searchResp.Items))
	for _, item := range searchResp.Items {
		results = append(results, changerequest.SearchResult{
			Name:          item.Name,
			FullPath:      item.FullName,
			HTTPURL:       item.CloneURL,
			DefaultBranch: item.DefaultBranch,
		})
	}

	return results, nil
}

// GetChangeRequests implements changerequest.Client.GetChangeRequests.
func normalizeGithubPRSort(sortBy string) string {
	switch sortBy {
	case "created", "updated", "popularity", "long-running":
		return sortBy
	default:
		return "updated"
	}
}

func (c *client) GetChangeRequests(info *changerequest.RepoInfo, options *changerequest.ChangeRequestListOptions) (*changerequest.ChangeRequestListResult, error) {
	ghInfo, err := FromChangeRequest(info)
	if err != nil {
		return nil, err
	}

	page := 1
	perPage := 50
	sourceBranch := ""
	targetBranch := ""
	search := ""
	state := "open"
	sortBy := "updated"
	order := "desc"
	labels := []string(nil)
	if options != nil {
		if options.Page > 0 {
			page = options.Page
		}
		if options.PerPage > 0 {
			perPage = options.PerPage
		}
		sourceBranch = options.SourceBranch
		targetBranch = options.TargetBranch
		search = options.Search
		labels = options.Labels
		if options.State != "" {
			state = options.State
		}
		if options.SortBy != "" {
			sortBy = options.SortBy
		}
		if options.SortDirection == "asc" || options.SortDirection == "desc" {
			order = options.SortDirection
		}
	}

	skipDetails := options != nil && options.SkipDetails

	// When search is provided, use the GitHub search/issues endpoint
	// since the pulls list endpoint doesn't support search.
	if search != "" || len(labels) > 0 {
		return c.searchPullRequests(ghInfo, search, page, perPage, state, skipDetails, sortBy, order, labels)
	}

	// GitHub API doesn't have a native "merged" state. Merged PRs have state=closed + merged=true.
	// Map our state values to GitHub API values:
	//   "opened" → "open"
	//   "closed" → "closed" (GitHub returns all closed PRs — merged ones are filtered in prStateToChangeRequestState)
	//   "all"    → "all"
	apiState := state
	switch state {
	case "closed":
		apiState = "closed"
	case "opened":
		apiState = "open"
	default:
		apiState = state
	}

	params := url.Values{}
	params.Set("state", apiState)
	params.Set("per_page", fmt.Sprintf("%d", perPage))
	params.Set("page", fmt.Sprintf("%d", page))
	params.Set("sort", normalizeGithubPRSort(sortBy))
	params.Set("direction", order)
	if sourceBranch != "" {
		params.Set("head", fmt.Sprintf("%s:%s", ghInfo.Owner, sourceBranch))
	}
	if targetBranch != "" {
		params.Set("base", targetBranch)
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls?%s",
		ghInfo.Owner, ghInfo.Repo, params.Encode())

	resp, err := c.doRequest("GET", apiURL, nil)
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

	// Parse pagination from Link header
	linkHeader := resp.Header.Get("Link")
	currentPage, totalPages := parseLinkHeaderForPagination(linkHeader, page)

	var prs []ghPR
	if err := json.Unmarshal(body, &prs); err != nil {
		return nil, fmt.Errorf("failed to parse pull requests: %w", err)
	}

	results := make([]changerequest.ChangeRequest, 0, len(prs))
	for _, pr := range prs {
		var approvals *MergeRequestApprovals
		var latestRun *ghWorkflowRun

		if !skipDetails {
			var err error
			approvals, err = c.GetPRApprovals(ghInfo, pr.Number)
			if err != nil {
				log.Printf("[WARN] Failed to fetch approvals for PR #%d: %v", pr.Number, err)
			}
			latestRun, err = c.GetLatestRunForSHA(ghInfo, pr.Head.SHA)
			if err != nil {
				log.Printf("[WARN] Failed to fetch workflow run for PR #%d (SHA %s): %v", pr.Number, pr.Head.SHA, err)
			}
		}

		mrResult := convertPRToChangeRequest(pr, approvals, latestRun)
		results = append(results, mrResult)
	}

	return &changerequest.ChangeRequestListResult{
		ChangeRequests: results,
		TotalCount:     -1,
		TotalPages:     totalPages,
		CurrentPage:    currentPage,
		PerPage:        perPage,
	}, nil
}

// searchPullRequests searches pull requests via GitHub's /search/issues endpoint.
// GitHub's REST API treats PRs as a type of issue; the qualifier "type:pr"
// in the search query filters out regular issues, returning PRs only.
// This is the documented GitHub API approach — the pulls list endpoint
// (/repos/{owner}/{repo}/pulls) does not support free-text search.
func (c *client) searchPullRequests(ghInfo *RepoInfo, query string, page, perPage int, state string, skipDetails bool, sortBy, order string, labels []string) (*changerequest.ChangeRequestListResult, error) {
	// Build search query with state qualifier.
	// GitHub search API values: state:open, state:closed, state:all
	labelQuery := ""
	for _, label := range labels {
		labelQuery += fmt.Sprintf(" label:%q", label)
	}
	searchQuery := strings.TrimSpace(fmt.Sprintf("repo:%s/%s type:pr state:%s %s %s", ghInfo.Owner, ghInfo.Repo, state, query, labelQuery))

	params := url.Values{}
	params.Set("q", searchQuery)
	params.Set("per_page", fmt.Sprintf("%d", perPage))
	params.Set("page", fmt.Sprintf("%d", page))
	params.Set("sort", normalizeGithubIssueSort(sortBy))
	params.Set("order", order)

	apiURL := fmt.Sprintf("https://api.github.com/search/issues?%s", params.Encode())

	resp, err := c.doRequest("GET", apiURL, nil)
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
		TotalCount int `json:"total_count"`
		Items      []struct {
			Number    int       `json:"number"`
			Title     string    `json:"title"`
			Body      string    `json:"body"`
			State     string    `json:"state"`
			HTMLURL   string    `json:"html_url"`
			CreatedAt time.Time `json:"created_at"`
			UpdatedAt time.Time `json:"updated_at"`
			User      struct {
				Login string `json:"login"`
			} `json:"user"`
		} `json:"items"`
	}

	if err := json.Unmarshal(body, &searchResp); err != nil {
		return nil, fmt.Errorf("failed to parse search results: %w", err)
	}

	// Parse pagination from Link header
	linkHeader := resp.Header.Get("Link")
	_, totalPages := parseLinkHeaderForPagination(linkHeader, page)

	results := make([]changerequest.ChangeRequest, 0, len(searchResp.Items))
	for _, item := range searchResp.Items {
		// If not SkipDetails, fetch full PR details which includes all fields
		if !skipDetails {
			fullPR, err := c.GetPullRequest(ghInfo, item.Number)
			if err == nil && fullPR != nil {
				mrResult := convertPRToChangeRequest(ghPR{
					Number:    fullPR.IID,
					Title:     fullPR.Title,
					Body:      fullPR.Description,
					State:     fullPR.State,
					HTMLURL:   fullPR.WebURL,
					CreatedAt: fullPR.CreatedAt,
					UpdatedAt: fullPR.UpdatedAt,
					User:      ghUser{Login: fullPR.Author.Username},
					Head:      ghPRBranch{Ref: fullPR.SourceBranch},
					Base:      ghPRBranch{Ref: fullPR.TargetBranch},
				}, fullPR.Approvals, nil)
				// Copy pipeline from fullPR if available
				if fullPR.HeadPipeline != nil {
					mrResult.HeadPipeline = &changerequest.PipelineRef{
						ID:     fullPR.HeadPipeline.ID,
						Status: fullPR.HeadPipeline.Status,
						WebURL: fullPR.HeadPipeline.WebURL,
					}
				}
				results = append(results, mrResult)
				continue
			}
		}

		// Fallback: build minimal MR from search result
		mrResult := changerequest.ChangeRequest{
			IID:                         item.Number,
			Title:                       item.Title,
			Description:                 item.Body,
			WebURL:                      item.HTMLURL,
			CreatedAt:                   item.CreatedAt,
			UpdatedAt:                   item.UpdatedAt,
			BlockingDiscussionsResolved: true,
		}
		mrResult.Author.Name = item.User.Login
		mrResult.Author.Username = item.User.Login
		mrResult.State = "opened"
		if item.State == "closed" {
			mrResult.State = "closed"
		}

		results = append(results, mrResult)
	}

	// Calculate total pages from total count
	totalPages = (searchResp.TotalCount + perPage - 1) / perPage

	return &changerequest.ChangeRequestListResult{
		ChangeRequests: results,
		TotalCount:     searchResp.TotalCount,
		TotalPages:     totalPages,
		CurrentPage:    page,
		PerPage:        perPage,
	}, nil
}

// GetPullRequest fetches a single pull request by number with full details.
func (c *client) GetPullRequest(info *RepoInfo, prNumber int) (*ChangeRequest, error) {
	if info == nil {
		return nil, fmt.Errorf("repo info is nil")
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls/%d",
		info.Owner, info.Repo, prNumber)

	resp, err := c.doRequest("GET", apiURL, nil)
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

	var pr ghPR
	if err := json.Unmarshal(body, &pr); err != nil {
		return nil, fmt.Errorf("failed to parse pull request: %w", err)
	}

	approvals, err := c.GetPRApprovals(info, prNumber)
	if err != nil {
		log.Printf("[WARN] Failed to fetch approvals for PR #%d: %v", prNumber, err)
	}

	latestRun, err := c.GetLatestRunForSHA(info, pr.Head.SHA)
	if err != nil {
		log.Printf("[WARN] Failed to fetch workflow run for PR #%d (SHA %s): %v", prNumber, pr.Head.SHA, err)
	}

	mr := convertPR(pr, approvals, latestRun)
	return &mr, nil
}

// GetPRApprovals fetches review-based approvals for a pull request and returns
// an MergeRequestApprovals struct compatible with the GitLab shape.
func (c *client) GetPRApprovals(info *RepoInfo, prNumber int) (*MergeRequestApprovals, error) {
	if info == nil {
		return nil, fmt.Errorf("repo info is nil")
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls/%d/reviews?per_page=100",
		info.Owner, info.Repo, prNumber)

	resp, err := c.doRequest("GET", apiURL, nil)
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

	var reviews []ghReview
	if err := json.Unmarshal(body, &reviews); err != nil {
		return nil, fmt.Errorf("failed to parse reviews: %w", err)
	}

	// Collect the latest review state per user.
	// A user might approve and then dismiss — only the latest state counts.
	latestByUser := make(map[string]string) // login → state
	for _, r := range reviews {
		if r.User.Login == "" {
			continue
		}
		latestByUser[r.User.Login] = r.State
	}

	approvals := &MergeRequestApprovals{
		ApprovalsRequired: 1, // sensible default — GitHub enforces this at repo level
		ApprovedBy: []struct {
			User struct {
				Name     string `json:"name"`
				Username string `json:"username"`
			} `json:"user"`
		}{},
	}

	for login, state := range latestByUser {
		if state == "APPROVED" {
			entry := struct {
				User struct {
					Name     string `json:"name"`
					Username string `json:"username"`
				} `json:"user"`
			}{}
			entry.User.Name = login
			entry.User.Username = login
			approvals.ApprovedBy = append(approvals.ApprovedBy, entry)
		}
	}

	if len(approvals.ApprovedBy) >= approvals.ApprovalsRequired {
		approvals.ApprovalsLeft = 0
	} else {
		approvals.ApprovalsLeft = approvals.ApprovalsRequired - len(approvals.ApprovedBy)
	}

	return approvals, nil
}

// GetChangeRequestChanges implements changerequest.Client.GetChangeRequestChanges.
func (c *client) GetChangeRequestChanges(info *changerequest.RepoInfo, mrNumber int) ([]changerequest.ChangeRequestChange, error) {
	ghInfo, err := FromChangeRequest(info)
	if err != nil {
		return nil, err
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls/%d/files?per_page=100",
		ghInfo.Owner, ghInfo.Repo, mrNumber)

	resp, err := c.doRequest("GET", apiURL, nil)
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

	var files []ghPRFile
	if err := json.Unmarshal(body, &files); err != nil {
		return nil, fmt.Errorf("failed to parse PR files: %w", err)
	}

	changes := make([]changerequest.ChangeRequestChange, 0, len(files))
	for _, f := range files {
		ch := changerequest.ChangeRequestChange{
			NewPath:      f.Filename,
			OldPath:      f.Filename,
			AMode:        "100644",
			BMode:        "100644",
			Diff:         f.Patch,
			LinesAdded:   f.Additions,
			LinesDeleted: f.Deletions,
		}

		switch f.Status {
		case "added":
			ch.NewFile = true
		case "removed":
			ch.DeletedFile = true
			ch.OldPath = f.Filename
			ch.NewPath = f.Filename
		case "renamed":
			ch.RenamedFile = true
			if f.PreviousFilename != "" {
				ch.OldPath = f.PreviousFilename
			}
		}

		if f.Patch != "" {
			ch.DiffLines = parseDiffLinesToChangeRequest(f.Patch, f.Filename)
		}

		changes = append(changes, ch)
	}

	return changes, nil
}

// fetchPRTimelineEvents fetches timeline events for a PR from GitHub's Issue Timeline API.
// The timeline includes both comments (event="commented") and events (labeled, assigned, etc.).
// We paginate up to maxPages (3 pages × 100 = 300 items, enough for most PRs).
func (c *client) fetchPRTimelineEvents(info *RepoInfo, prNumber int) ([]ghTimelineEvent, error) {
	var allEvents []ghTimelineEvent
	maxPages := 3

	for page := 1; page <= maxPages; page++ {
		apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues/%d/timeline?per_page=100&page=%d",
			info.Owner, info.Repo, prNumber, page)

		resp, err := c.doRequest("GET", apiURL, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch timeline events: %w", err)
		}

		body, err := readBody(resp)
		if err != nil {
			return nil, err
		}

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("GitHub API error fetching timeline (status %d): %s", resp.StatusCode, string(body))
		}

		var pageEvents []ghTimelineEvent
		if err := json.Unmarshal(body, &pageEvents); err != nil {
			return nil, fmt.Errorf("failed to parse timeline events: %w", err)
		}

		allEvents = append(allEvents, pageEvents...)

		// If response has fewer items than per_page, we're on the last page
		if len(pageEvents) < 100 {
			break
		}
	}

	return allEvents, nil
}

// timelineEventToBody converts a GitHub timeline event into a human-readable system note body,
// matching the style of GitLab system notes so the TUI DiscussionsView renders them uniformly.
func timelineEventToBody(event *ghTimelineEvent) string {
	switch event.Event {
	case "labeled":
		if event.Label != nil {
			return fmt.Sprintf("added ~%s label", event.Label.Name)
		}
		return "added label"
	case "unlabeled":
		if event.Label != nil {
			return fmt.Sprintf("removed ~%s label", event.Label.Name)
		}
		return "removed label"
	case "assigned":
		if event.Assignee != nil {
			return fmt.Sprintf("assigned to @%s", event.Assignee.Login)
		}
		return "assigned"
	case "unassigned":
		if event.Assignee != nil {
			return fmt.Sprintf("unassigned @%s", event.Assignee.Login)
		}
		return "unassigned"
	case "milestoned":
		if event.Milestone != nil {
			return fmt.Sprintf("added to milestone **%s**", event.Milestone.Title)
		}
		return "added to milestone"
	case "demilestoned":
		if event.Milestone != nil {
			return fmt.Sprintf("removed from milestone **%s**", event.Milestone.Title)
		}
		return "removed from milestone"
	case "renamed":
		if event.Rename != nil {
			return fmt.Sprintf("changed title from **%s** to **%s**", event.Rename.From, event.Rename.To)
		}
		return "changed title"
	case "locked":
		return "locked the conversation"
	case "unlocked":
		return "unlocked the conversation"
	case "review_requested":
		if event.RequestedReviewer != nil {
			return fmt.Sprintf("requested review from @%s", event.RequestedReviewer.Login)
		}
		return "requested review"
	case "review_request_removed":
		if event.RequestedReviewer != nil {
			return fmt.Sprintf("removed review request from @%s", event.RequestedReviewer.Login)
		}
		return "removed review request"
	case "ready_for_review":
		return "marked as ready for review"
	case "merged":
		return "merged the commit"
	case "closed":
		return "closed"
	case "reopened":
		return "reopened"
	case "head_ref_deleted":
		return "deleted the head branch"
	case "head_ref_restored":
		return "restored the head branch"
	case "cross-referenced":
		if event.Source != nil && event.Source.Issue != nil {
			return fmt.Sprintf("mentioned in #%d %s", event.Source.Issue.Number, event.Source.Issue.Title)
		}
		return "mentioned in another issue"
	case "base_ref_changed":
		return "changed the base branch"
	case "reviewed":
		return "submitted a review"
	case "committed":
		return "added a commit"
	case "comment_removed":
		return "removed a comment"
	case "marked_as_duplicate":
		return "marked as duplicate"
	case "unmarked_as_duplicate":
		return "unmarked as duplicate"
	case "converted_note_to_issue":
		return "converted to issue"
	case "transferred":
		return "transferred"
	case "subscribed":
		return "subscribed"
	case "unsubscribed":
		return "unsubscribed"
	case "pinned":
		return "pinned"
	case "unpinned":
		return "unpinned"
	case "automatic_base_change_failed":
		return "automatic base change failed"
	case "automatic_base_change_succeeded":
		return "automatic base change succeeded"
	default:
		// For unknown events, include the raw event name so it's visible
		return event.Event
	}
}

// GetDiscussions implements changerequest.Client.GetDiscussions.
func (c *client) GetDiscussions(info *changerequest.RepoInfo, mrNumber int) ([]changerequest.Discussion, error) {
	ghInfo, err := FromChangeRequest(info)
	if err != nil {
		return nil, err
	}

	reviewComments, err := c.fetchPRReviewComments(ghInfo, mrNumber)
	if err != nil {
		return nil, err
	}

	issueComments, err := c.fetchPRIssueComments(ghInfo, mrNumber)
	if err != nil {
		return nil, err
	}

	timelineEvents, err := c.fetchPRTimelineEvents(ghInfo, mrNumber)
	if err != nil {
		// Timeline is a nice-to-have; log the error, don't fail the whole request
		log.Printf("[WARN] Failed to fetch timeline events for PR #%d: %v", mrNumber, err)
		timelineEvents = nil
	}

	// Build a set of issue comment IDs so we skip "commented" events that duplicate them
	issueCommentIDs := make(map[int]bool)
	for _, ic := range issueComments {
		issueCommentIDs[ic.ID] = true
	}

	var discussions []changerequest.Discussion

	// 1. Build discussion threads from review comments (inline code review)
	rootByID := make(map[int]*changerequest.Discussion)
	var orderedRoots []int

	for i := range reviewComments {
		rc := &reviewComments[i]
		if rc.InReplyToID == nil {
			d := changerequest.Discussion{
				ID:             strconv.Itoa(rc.ID),
				IndividualNote: false,
				Notes: []changerequest.Note{
					convertReviewCommentToChangeRequest(rc),
				},
			}
			discussions = append(discussions, d)
			rootByID[rc.ID] = &discussions[len(discussions)-1]
			orderedRoots = append(orderedRoots, rc.ID)
		}
	}

	for i := range reviewComments {
		rc := &reviewComments[i]
		if rc.InReplyToID != nil {
			parentID := *rc.InReplyToID
			if d, ok := rootByID[parentID]; ok {
				d.Notes = append(d.Notes, convertReviewCommentToChangeRequest(rc))
			}
		}
	}

	_ = orderedRoots

	// 2. Add issue comments (general PR comments)
	for i := range issueComments {
		ic := &issueComments[i]
		d := changerequest.Discussion{
			ID:             strconv.Itoa(ic.ID),
			IndividualNote: true,
			Notes: []changerequest.Note{
				{
					ID:   ic.ID,
					Type: "DiscussionNote",
					Body: ic.Body,
					Author: changerequest.NoteAuthor{
						Username: ic.User.Login,
						Name:     ic.User.Login,
					},
					CreatedAt:  ic.CreatedAt,
					UpdatedAt:  ic.UpdatedAt,
					Resolvable: false,
					Resolved:   false,
				},
			},
		}
		discussions = append(discussions, d)
	}

	// 3. Add timeline events as system notes (skip "commented" events already covered by issue comments)
	for i := range timelineEvents {
		e := &timelineEvents[i]
		// Skip comment-type events — already in issueComments
		if e.Event == "commented" && issueCommentIDs[e.ID] {
			continue
		}

		body := timelineEventToBody(e)
		d := changerequest.Discussion{
			ID:             fmt.Sprintf("timeline-%d", e.ID),
			IndividualNote: true,
			Notes: []changerequest.Note{
				{
					ID:        e.ID,
					Type:      "TimelineEvent",
					Body:      body,
					System:    true,
					CreatedAt: e.CreatedAt,
					UpdatedAt: e.CreatedAt,
					Author: changerequest.NoteAuthor{
						Username: e.Actor.Login,
						Name:     e.Actor.Login,
					},
				},
			},
		}
		discussions = append(discussions, d)
	}

	log.Printf("[DEBUG] Fetched %d discussions (incl. %d timeline events) for PR #%d",
		len(discussions), len(timelineEvents), mrNumber)
	return discussions, nil
}

func (c *client) fetchPRReviewComments(info *RepoInfo, prNumber int) ([]ghPRReviewComment, error) {
	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls/%d/comments?per_page=100",
		info.Owner, info.Repo, prNumber)

	resp, err := c.doRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch review comments: %w", err)
	}

	body, err := readBody(resp)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	var comments []ghPRReviewComment
	if err := json.Unmarshal(body, &comments); err != nil {
		return nil, fmt.Errorf("failed to parse review comments: %w", err)
	}
	return comments, nil
}

func (c *client) fetchPRIssueComments(info *RepoInfo, prNumber int) ([]ghIssueComment, error) {
	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues/%d/comments?per_page=100",
		info.Owner, info.Repo, prNumber)

	resp, err := c.doRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch issue comments: %w", err)
	}

	body, err := readBody(resp)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	var comments []ghIssueComment
	if err := json.Unmarshal(body, &comments); err != nil {
		return nil, fmt.Errorf("failed to parse issue comments: %w", err)
	}
	return comments, nil
}

func convertReviewComment(rc *ghPRReviewComment) Note {
	return Note{
		ID:   rc.ID,
		Type: "DiffNote",
		Body: rc.Body,
		Author: NoteAuthor{
			Username: rc.User.Login,
			Name:     rc.User.Login,
		},
		CreatedAt:  rc.CreatedAt,
		UpdatedAt:  rc.UpdatedAt,
		Resolvable: true,
		Resolved:   false,
	}
}

func convertReviewCommentToChangeRequest(rc *ghPRReviewComment) changerequest.Note {
	return changerequest.Note{
		ID:   rc.ID,
		Type: "DiffNote",
		Body: rc.Body,
		Author: changerequest.NoteAuthor{
			Username: rc.User.Login,
			Name:     rc.User.Login,
		},
		CreatedAt:  rc.CreatedAt,
		UpdatedAt:  rc.UpdatedAt,
		Resolvable: true,
		Resolved:   false,
	}
}

// Approve implements changerequest.Client.Approve.
func (c *client) Approve(info *changerequest.RepoInfo, mrNumber int) error {
	ghInfo, err := FromChangeRequest(info)
	if err != nil {
		return err
	}
	return c.approvePRInternal(ghInfo, mrNumber)
}

func (c *client) approvePRInternal(info *RepoInfo, prNumber int) error {
	if info == nil {
		return fmt.Errorf("repo info is nil")
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls/%d/reviews",
		info.Owner, info.Repo, prNumber)

	payload := map[string]string{"event": "APPROVE"}
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	resp, err := c.doRequest("POST", apiURL, strings.NewReader(string(jsonPayload)))
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}

	body, err := readBody(resp)
	if err != nil {
		return err
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	return nil
}

// Unapprove implements changerequest.Client.Unapprove.
func (c *client) Unapprove(info *changerequest.RepoInfo, mrNumber int) error {
	ghInfo, err := FromChangeRequest(info)
	if err != nil {
		return err
	}
	return c.unapprovePRInternal(ghInfo, mrNumber)
}

func (c *client) unapprovePRInternal(info *RepoInfo, prNumber int) error {
	if info == nil {
		return fmt.Errorf("repo info is nil")
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls/%d/reviews?per_page=100",
		info.Owner, info.Repo, prNumber)

	resp, err := c.doRequest("GET", apiURL, nil)
	if err != nil {
		return fmt.Errorf("failed to fetch reviews: %w", err)
	}

	body, err := readBody(resp)
	if err != nil {
		return err
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	var reviews []ghReview
	if err := json.Unmarshal(body, &reviews); err != nil {
		return fmt.Errorf("failed to parse reviews: %w", err)
	}

	var reviewIDToDissmiss int
	for i := len(reviews) - 1; i >= 0; i-- {
		r := reviews[i]
		if r.State == "APPROVED" && (c.username == "" || r.User.Login == c.username) {
			reviewIDToDissmiss = r.ID
			break
		}
	}

	if reviewIDToDissmiss == 0 {
		return fmt.Errorf("no APPROVED review found to dismiss")
	}

	dismissURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls/%d/reviews/%d/dismissals",
		info.Owner, info.Repo, prNumber, reviewIDToDissmiss)

	dismissPayload := map[string]string{"message": "Unapproved via devenv-cli"}
	jsonPayload, err := json.Marshal(dismissPayload)
	if err != nil {
		return fmt.Errorf("failed to marshal dismiss payload: %w", err)
	}

	dismissResp, err := c.doRequest("PUT", dismissURL, strings.NewReader(string(jsonPayload)))
	if err != nil {
		return fmt.Errorf("failed to dismiss review: %w", err)
	}

	dismissBody, err := readBody(dismissResp)
	if err != nil {
		return err
	}

	if dismissResp.StatusCode != http.StatusOK {
		return fmt.Errorf("GitHub API error dismissing review (status %d): %s",
			dismissResp.StatusCode, string(dismissBody))
	}

	return nil
}

// ToggleApproval implements changerequest.Client.ToggleApproval.
func (c *client) ToggleApproval(info *changerequest.RepoInfo, mrNumber int) error {
	ghInfo, err := FromChangeRequest(info)
	if err != nil {
		return err
	}
	approvals, err := c.GetPRApprovals(ghInfo, mrNumber)
	if err != nil {
		return fmt.Errorf("failed to get current approvals: %w", err)
	}

	alreadyApproved := false
	for _, a := range approvals.ApprovedBy {
		if a.User.Username == c.username {
			alreadyApproved = true
			break
		}
	}

	if alreadyApproved {
		return c.unapprovePRInternal(ghInfo, mrNumber)
	}
	return c.approvePRInternal(ghInfo, mrNumber)
}

type ghWorkflowRun struct {
	ID         int       `json:"id"`
	Name       string    `json:"name"`
	Status     string    `json:"status"`
	Conclusion string    `json:"conclusion"`
	HTMLURL    string    `json:"html_url"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
	HeadSHA    string    `json:"head_sha"`
	HeadBranch string    `json:"head_branch"`
}

type ghActionJob struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Status      string    `json:"status"`
	Conclusion  string    `json:"conclusion"`
	StartedAt   time.Time `json:"started_at"`
	CompletedAt time.Time `json:"completed_at"`
	HTMLURL     string    `json:"html_url"`
	RunID       int       `json:"run_id"`
}

// mapRunStatusToGitLab maps a GitHub Actions workflow run's status/conclusion to
// a GitLab-compatible pipeline status string.
func mapRunStatusToGitLab(run ghWorkflowRun) string {
	switch run.Status {
	case "queued", "waiting", "pending":
		return "pending"
	case "in_progress":
		return "running"
	case "completed":
		switch run.Conclusion {
		case "success", "neutral", "skipped":
			return "success"
		case "failure", "timed_out":
			return "failed"
		case "cancelled":
			return "canceled"
		default:
			return "running"
		}
	default:
		return "running"
	}
}

// convertActionJob converts a ghActionJob into the GitLab Job shape that the TUI expects.
// workflowName is used as the "stage" field.
func convertActionJob(job ghActionJob, workflowName string) gitlab.Job {
	stage := strings.TrimSpace(workflowName)
	if stage == "" {
		stage = "Default"
	}

	run := ghWorkflowRun{Status: job.Status, Conclusion: job.Conclusion}
	status := mapRunStatusToGitLab(run)

	startedAt := job.StartedAt
	finishedAt := job.CompletedAt

	var duration *float64
	if !job.StartedAt.IsZero() && !job.CompletedAt.IsZero() {
		d := job.CompletedAt.Sub(job.StartedAt).Seconds()
		duration = &d
	}

	return gitlab.Job{
		ID:         job.ID,
		Name:       job.Name,
		Stage:      stage,
		Status:     status,
		WebURL:     job.HTMLURL,
		StartedAt:  &startedAt,
		FinishedAt: &finishedAt,
		Duration:   duration,
		Pipeline: struct {
			ID int `json:"id"`
		}{ID: job.RunID},
	}
}

// GetLatestRunForSHA fetches the most recent workflow run for a given commit SHA.
// Returns nil (no error) when no runs exist for that SHA.
func (c *client) GetLatestRunForSHA(info *RepoInfo, sha string) (*ghWorkflowRun, error) {
	if info == nil {
		return nil, fmt.Errorf("repo info is nil")
	}

	params := url.Values{}
	params.Set("head_sha", sha)
	params.Set("per_page", "1")
	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/actions/runs?%s",
		info.Owner, info.Repo, params.Encode())

	resp, err := c.doRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch workflow runs: %w", err)
	}

	body, err := readBody(resp)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		TotalCount   int             `json:"total_count"`
		WorkflowRuns []ghWorkflowRun `json:"workflow_runs"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse workflow runs: %w", err)
	}

	if len(result.WorkflowRuns) == 0 {
		return nil, nil
	}
	run := result.WorkflowRuns[0]
	return &run, nil
}

func (c *client) GetActionJob(info *changerequest.RepoInfo, jobID int) (*ghActionJob, error) {
	ghInfo, err := FromChangeRequest(info)
	if err != nil {
		return nil, err
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/actions/jobs/%d",
		ghInfo.Owner, ghInfo.Repo, jobID)

	resp, err := c.doRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch job: %w", err)
	}
	defer resp.Body.Close()

	body, err := readBody(resp)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	var job ghActionJob
	if err := json.Unmarshal(body, &job); err != nil {
		return nil, fmt.Errorf("failed to parse job: %w", err)
	}

	return &job, nil
}

// GetRunJobs fetches all jobs for a given workflow run ID.
func (c *client) GetRunJobs(info *RepoInfo, runID int) ([]ghActionJob, error) {
	if info == nil {
		return nil, fmt.Errorf("repo info is nil")
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/actions/runs/%d/jobs?per_page=100",
		info.Owner, info.Repo, runID)

	resp, err := c.doRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch run jobs: %w", err)
	}

	body, err := readBody(resp)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		TotalCount int           `json:"total_count"`
		Jobs       []ghActionJob `json:"jobs"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse run jobs: %w", err)
	}

	return result.Jobs, nil
}

// GetJobLogs implements changerequest.Client.GetJobLogs.
func (c *client) GetJobLogs(info *changerequest.RepoInfo, jobID int) (string, error) {
	ghInfo, err := FromChangeRequest(info)
	if err != nil {
		return "", err
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/actions/jobs/%d/logs",
		ghInfo.Owner, ghInfo.Repo, jobID)

	noRedirectClient := &http.Client{
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
		Transport: c.httpClient.Transport,
		Timeout:   c.httpClient.Timeout,
	}

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.token))
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("User-Agent", "devenv-cli")

	resp, err := noRedirectClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to fetch job logs: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusFound || resp.StatusCode == http.StatusMovedPermanently {
		location := resp.Header.Get("Location")
		if location == "" {
			return "", fmt.Errorf("redirect with no Location header")
		}
		redirectResp, err := http.Get(location)
		if err != nil {
			return "", fmt.Errorf("failed to fetch logs from redirect: %w", err)
		}
		defer redirectResp.Body.Close()
		body, err := io.ReadAll(redirectResp.Body)
		if err != nil {
			return "", fmt.Errorf("failed to read logs: %w", err)
		}
		return string(body), nil
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read logs: %w", err)
	}
	return string(body), nil
}

// GetRunJobsAsGitLabJobs fetches jobs for a workflow run and converts them to the
// GitLab Job shape consumed by the TUI.
func (c *client) GetRunJobsAsGitLabJobs(info *RepoInfo, runID int, workflowName string) ([]gitlab.Job, error) {
	rawJobs, err := c.GetRunJobs(info, runID)
	if err != nil {
		return nil, err
	}

	jobs := make([]gitlab.Job, 0, len(rawJobs))
	for _, j := range rawJobs {
		jobs = append(jobs, convertActionJob(j, workflowName))
	}
	return jobs, nil
}

// --- Diff line parsing (same algorithm as GitLab client) ---

func parseDiffLines(patch, filePath string) []DiffLine {
	if patch == "" {
		return nil
	}

	var diffLines []DiffLine
	lines := strings.Split(patch, "\n")

	var currentOldLine int
	var currentNewLine int

	for _, line := range lines {
		if len(line) == 0 {
			continue
		}

		if strings.HasPrefix(line, "@@") {
			match := regexp.MustCompile(`@@ -(\d+),?\d* \+(\d+),?\d* @@`).FindStringSubmatch(line)
			if len(match) >= 3 {
				currentOldLine, _ = strconv.Atoi(match[1])
				currentNewLine, _ = strconv.Atoi(match[2])
			}
			continue
		}

		if strings.HasPrefix(line, "---") || strings.HasPrefix(line, "+++") || strings.HasPrefix(line, "\\") {
			continue
		}

		var dl DiffLine
		dl.Text = line

		if strings.HasPrefix(line, "+") {
			dl.Type = "new"
			newLineVal := currentNewLine
			dl.NewLine = &newLineVal
			dl.LineCode = generateLineCode(filePath, &newLineVal, nil)
			currentNewLine++
		} else if strings.HasPrefix(line, "-") {
			dl.Type = "old"
			oldLineVal := currentOldLine
			dl.OldLine = &oldLineVal
			dl.LineCode = generateLineCode(filePath, nil, &oldLineVal)
			currentOldLine++
		} else {
			dl.Type = "match"
			oldLineVal := currentOldLine
			newLineVal := currentNewLine
			dl.OldLine = &oldLineVal
			dl.NewLine = &newLineVal
			dl.LineCode = generateLineCode(filePath, &newLineVal, &oldLineVal)
			currentOldLine++
			currentNewLine++
		}

		diffLines = append(diffLines, dl)
	}

	return diffLines
}

func parseDiffLinesToChangeRequest(patch, filePath string) []changerequest.DiffLine {
	if patch == "" {
		return nil
	}

	var diffLines []changerequest.DiffLine
	lines := strings.Split(patch, "\n")

	var currentOldLine int
	var currentNewLine int

	for _, line := range lines {
		if len(line) == 0 {
			continue
		}

		if strings.HasPrefix(line, "@@") {
			match := regexp.MustCompile(`@@ -(\d+),?\d* \+(\d+),?\d* @@`).FindStringSubmatch(line)
			if len(match) >= 3 {
				currentOldLine, _ = strconv.Atoi(match[1])
				currentNewLine, _ = strconv.Atoi(match[2])
			}
			continue
		}

		if strings.HasPrefix(line, "---") || strings.HasPrefix(line, "+++") || strings.HasPrefix(line, "\\") {
			continue
		}

		var dl changerequest.DiffLine
		dl.Text = line

		if strings.HasPrefix(line, "+") {
			dl.Type = "new"
			newLineVal := currentNewLine
			dl.NewLine = &newLineVal
			dl.LineCode = generateLineCode(filePath, &newLineVal, nil)
			currentNewLine++
		} else if strings.HasPrefix(line, "-") {
			dl.Type = "old"
			oldLineVal := currentOldLine
			dl.OldLine = &oldLineVal
			dl.LineCode = generateLineCode(filePath, nil, &oldLineVal)
			currentOldLine++
		} else {
			dl.Type = "match"
			oldLineVal := currentOldLine
			newLineVal := currentNewLine
			dl.OldLine = &oldLineVal
			dl.NewLine = &newLineVal
			dl.LineCode = generateLineCode(filePath, &newLineVal, &oldLineVal)
			currentOldLine++
			currentNewLine++
		}

		diffLines = append(diffLines, dl)
	}

	return diffLines
}

// parseLinkHeaderForPagination extracts current page and total pages from a GitHub Link header.
// GitHub's Link header format: <https://api.github.com/repos/.../pulls?page=2>; rel="next", <https://.../pulls?page=5>; rel="last"
// Since GitHub doesn't provide X-Total, we return -1 for total pages when unknown and
// detect boundaries by checking for rel="next" and rel="prev".
func parseLinkHeaderForPagination(linkHeader string, currentPage int) (page, totalPages int) {
	page = currentPage
	totalPages = -1

	if linkHeader == "" {
		// No Link header means only one page
		return page, currentPage
	}

	hasNext := false
	lastPageNum := -1

	// Parse each link: <url>; rel="type"
	links := strings.Split(linkHeader, ",")
	for _, link := range links {
		link = strings.TrimSpace(link)
		// Extract URL and rel
		parts := strings.Split(link, ";")
		if len(parts) < 2 {
			continue
		}
		urlPart := strings.TrimSpace(parts[0])
		relPart := strings.TrimSpace(parts[1])

		// Extract rel value
		relMatch := regexp.MustCompile(`rel="([^"]+)"`).FindStringSubmatch(relPart)
		if len(relMatch) < 2 {
			continue
		}
		rel := relMatch[1]

		// Extract page number from URL
		pageMatch := regexp.MustCompile(`[?&]page=(\d+)`).FindStringSubmatch(urlPart)
		if len(pageMatch) < 2 {
			continue
		}
		pageNum, _ := strconv.Atoi(pageMatch[1])

		switch rel {
		case "next":
			hasNext = true
		case "last":
			lastPageNum = pageNum
			if lastPageNum > 0 {
				totalPages = lastPageNum
			}
		}
	}

	// If no "next" link, we're on the last page
	if !hasNext {
		totalPages = currentPage
	}

	// If we have "last" page, use it as totalPages
	if lastPageNum > 0 {
		totalPages = lastPageNum
	}

	return page, totalPages
}

func generateLineCode(filePath string, newLine *int, oldLine *int) string {
	oldStr := ""
	if oldLine != nil {
		oldStr = strconv.Itoa(*oldLine)
	}
	newStr := ""
	if newLine != nil {
		newStr = strconv.Itoa(*newLine)
	}

	content := fmt.Sprintf("github:%s:%s:%s", filePath, oldStr, newStr)
	hash := sha1.New()
	hash.Write([]byte(content))
	return fmt.Sprintf("%x", hash.Sum(nil))
}

// ValidateConnection implements changerequest.Client.ValidateConnection.
func (c *client) ValidateConnection(info *changerequest.RepoInfo) error {
	apiURL := "https://api.github.com/user"
	resp, err := c.doRequest("GET", apiURL, nil)
	if err != nil {
		return fmt.Errorf("GitHub connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("GitHub authentication failed (status %d): %s", resp.StatusCode, string(body))
	}
	return nil
}

// GetPipelines implements changerequest.Client.GetPipelines.
func (c *client) GetPipelines(info *changerequest.RepoInfo, limit int) ([]changerequest.Pipeline, error) {
	ghInfo, err := FromChangeRequest(info)
	if err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = 20
	}

	params := url.Values{}
	params.Set("per_page", fmt.Sprintf("%d", limit))
	params.Set("exclude_pull_requests", "false")

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/actions/runs?%s",
		ghInfo.Owner, ghInfo.Repo, params.Encode())

	resp, err := c.doRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch workflow runs: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result struct {
		WorkflowRuns []ghWorkflowRun `json:"workflow_runs"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse workflow runs: %w", err)
	}

	pipelines := make([]changerequest.Pipeline, 0, len(result.WorkflowRuns))
	for _, run := range result.WorkflowRuns {
		pipelines = append(pipelines, changerequest.Pipeline{
			ID:     run.ID,
			Status: mapRunStatusToGitLab(run),
			Ref:    run.HeadBranch,
			SHA:    run.HeadSHA,
			WebURL: run.HTMLURL,
			Source: "workflow_dispatch",
		})
	}
	return pipelines, nil
}

// GetPipelineJobs implements changerequest.Client.GetPipelineJobs.
func (c *client) GetPipelineJobs(info *changerequest.RepoInfo, pipelineID int) ([]changerequest.Job, error) {
	ghInfo, err := FromChangeRequest(info)
	if err != nil {
		return nil, err
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/actions/runs/%d/jobs?per_page=100",
		ghInfo.Owner, ghInfo.Repo, pipelineID)

	resp, err := c.doRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch jobs: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result struct {
		Jobs []ghActionJob `json:"jobs"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse jobs: %w", err)
	}

	jobs := make([]changerequest.Job, 0, len(result.Jobs))
	for _, j := range result.Jobs {
		job := convertActionJobToChangeRequest(j)
		job.Pipeline.ID = pipelineID
		jobs = append(jobs, job)
	}
	return jobs, nil
}

func (c *client) RestartJob(info *changerequest.RepoInfo, jobID int) error {
	ghInfo, err := FromChangeRequest(info)
	if err != nil {
		return err
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/actions/jobs/%d/rerun",
		ghInfo.Owner, ghInfo.Repo, jobID)

	resp, err := c.doRequest("POST", apiURL, nil)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	return nil
}

func (c *client) CancelJob(info *changerequest.RepoInfo, jobID int) error {
	ghInfo, err := FromChangeRequest(info)
	if err != nil {
		return err
	}

	job, err := c.GetActionJob(info, jobID)
	if err != nil {
		return fmt.Errorf("failed to get job details: %w", err)
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/actions/runs/%d/cancel",
		ghInfo.Owner, ghInfo.Repo, job.RunID)

	resp, err := c.doRequest("POST", apiURL, nil)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	return nil
}

func convertActionJobToChangeRequest(job ghActionJob) changerequest.Job {
	startedAt := job.StartedAt
	finishedAt := job.CompletedAt

	var duration *float64
	if !job.StartedAt.IsZero() && !job.CompletedAt.IsZero() {
		d := job.CompletedAt.Sub(job.StartedAt).Seconds()
		duration = &d
	}

	return changerequest.Job{
		ID:         job.ID,
		Name:       job.Name,
		Stage:      "Default",
		Status:     mapJobStatusToGitLab(job),
		WebURL:     job.HTMLURL,
		StartedAt:  &startedAt,
		FinishedAt: &finishedAt,
		Duration:   duration,
	}
}

func mapJobStatusToGitLab(job ghActionJob) string {
	switch job.Status {
	case "queued", "waiting", "pending":
		return "pending"
	case "in_progress":
		return "running"
	case "completed":
		switch job.Conclusion {
		case "success", "neutral", "skipped":
			return "success"
		case "failure", "timed_out":
			return "failed"
		case "cancelled":
			return "canceled"
		default:
			return "running"
		}
	default:
		return "running"
	}
}

func (c *client) Close(info *changerequest.RepoInfo, mrNumber int) error {
	ghInfo, err := FromChangeRequest(info)
	if err != nil {
		return err
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls/%d",
		ghInfo.Owner, ghInfo.Repo, mrNumber)

	payload := map[string]string{"state": "closed"}
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	resp, err := c.doRequest("PATCH", apiURL, strings.NewReader(string(jsonPayload)))
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	return nil
}

func (c *client) Rebase(info *changerequest.RepoInfo, mrNumber int) error {
	return fmt.Errorf("server-side rebase is not supported on GitHub")
}

func (c *client) CreateDiffComment(info *changerequest.RepoInfo, mrNumber int, body string, position *changerequest.DiffPosition) error {
	ghInfo, err := FromChangeRequest(info)
	if err != nil {
		return err
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls/%d/comments",
		ghInfo.Owner, ghInfo.Repo, mrNumber)

	payload := map[string]interface{}{
		"body": body,
	}

	if position != nil {
		side := "RIGHT"
		if position.OldLine != nil {
			side = "LEFT"
		}
		payload["commit_id"] = position.HeadSHA
		payload["path"] = position.NewPath
		payload["side"] = side
		if position.OldLine != nil {
			payload["line"] = *position.OldLine
		} else if position.NewLine != nil {
			payload["line"] = *position.NewLine
		}
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	resp, err := c.doRequest("POST", apiURL, strings.NewReader(string(jsonPayload)))
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	return nil
}

func (c *client) ReplyToDiscussion(info *changerequest.RepoInfo, mrNumber int, discussionID string, body string) error {
	ghInfo, err := FromChangeRequest(info)
	if err != nil {
		return err
	}

	replyID, err := strconv.Atoi(discussionID)
	if err != nil {
		return fmt.Errorf("invalid discussion ID: %w", err)
	}

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls/%d/comments",
		ghInfo.Owner, ghInfo.Repo, mrNumber)

	payload := map[string]interface{}{
		"body":        body,
		"in_reply_to": replyID,
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	resp, err := c.doRequest("POST", apiURL, strings.NewReader(string(jsonPayload)))
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	return nil
}

func (c *client) ResolveDiscussion(info *changerequest.RepoInfo, mrNumber int, discussionID string, resolved bool) error {
	return fmt.Errorf("resolving discussions is not supported on GitHub")
}

func (c *client) GetTestSummary(info *changerequest.RepoInfo, pipelineID int) (*changerequest.TestSummary, error) {
	return nil, nil
}

func (c *client) StreamJobLogs(ctx context.Context, info *changerequest.RepoInfo, jobID int) (chan string, error) {
	logs, err := c.GetJobLogs(info, jobID)
	if err != nil {
		return nil, err
	}

	ch := make(chan string, 1)
	go func() {
		defer close(ch)
		lines := strings.Split(logs, "\n")
		for _, line := range lines {
			select {
			case ch <- line:
			case <-ctx.Done():
				return
			}
		}
	}()
	return ch, nil
}
