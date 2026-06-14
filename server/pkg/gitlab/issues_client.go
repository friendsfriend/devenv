package gitlab

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/friendsfriend/devenv/pkg/issues"
)

// --- GitLab API raw types for issues ---

type glIssue struct {
	ID          int        `json:"id"`
	IID         int        `json:"iid"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	State       string     `json:"state"`
	WebURL      string     `json:"web_url"`
	Author      NoteAuthor `json:"author"`
	Labels      []string   `json:"labels"`
	Assignees   []struct {
		Name     string `json:"name"`
		Username string `json:"username"`
	} `json:"assignees"`
	Milestone *struct {
		Title string `json:"title"`
	} `json:"milestone,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type glIssueNote struct {
	ID        int        `json:"id"`
	Body      string     `json:"body"`
	Author    NoteAuthor `json:"author"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	System    bool       `json:"system"`
}

// --- Conversion helpers ---

func convertGLIssue(issue glIssue) issues.Issue {
	result := issues.Issue{
		ID:          issue.ID,
		IID:         issue.IID,
		Title:       issue.Title,
		Description: issue.Description,
		State:       issue.State,
		WebURL:      issue.WebURL,
		CreatedAt:   issue.CreatedAt,
		UpdatedAt:   issue.UpdatedAt,
		Labels:      issue.Labels,
		Assignees:   issue.Assignees,
		Milestone:   issue.Milestone,
	}
	result.Author.Name = issue.Author.Name
	result.Author.Username = issue.Author.Username
	return result
}

func convertGLIssueNote(note glIssueNote) issues.IssueComment {
	result := issues.IssueComment{
		ID:        note.ID,
		Body:      note.Body,
		CreatedAt: note.CreatedAt,
		UpdatedAt: note.UpdatedAt,
		System:    note.System,
	}
	result.Author.Name = note.Author.Name
	result.Author.Username = note.Author.Username
	return result
}

// --- issues.Client implementation ---

// IssuesClient wraps a GitLab client to implement issues.Client.
type IssuesClient struct {
	c       *client
	project *ProjectInfo
}

// NewIssuesClient creates a new IssuesClient for the given project.
func NewIssuesClient(c Client, project *ProjectInfo) issues.Client {
	glClient := c.(*client)
	return &IssuesClient{
		c:       glClient,
		project: project,
	}
}

func (ic *IssuesClient) projectToIssueRepo() *issues.RepoInfo {
	return &issues.RepoInfo{
		Host:      ic.project.Host,
		Namespace: ic.project.Namespace,
		Project:   ic.project.Project,
	}
}

func (ic *IssuesClient) doGet(url string) ([]byte, int, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("PRIVATE-TOKEN", ic.c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")

	resp, err := ic.c.httpClient.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to read response: %w", err)
	}
	return body, resp.StatusCode, nil
}

// doGetWithHeaders is like doGet but also returns response headers.
func (ic *IssuesClient) doGetWithHeaders(url string) ([]byte, int, http.Header, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, 0, nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("PRIVATE-TOKEN", ic.c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")

	resp, err := ic.c.httpClient.Do(req)
	if err != nil {
		return nil, 0, nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, 0, nil, fmt.Errorf("failed to read response: %w", err)
	}
	return body, resp.StatusCode, resp.Header, nil
}

// GetIssues implements issues.Client.GetIssues.
func (ic *IssuesClient) GetIssues(info *issues.RepoInfo, options *issues.IssueListOptions) (*issues.IssueListResult, error) {
	proj := ic.project
	if info != nil && info.Namespace != "" && info.Project != "" {
		proj = &ProjectInfo{
			Host:      info.Host,
			Namespace: info.Namespace,
			Project:   info.Project,
		}
	}

	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", proj.Namespace, proj.Project))

	page := 1
	perPage := 50
	scope := ""
	search := ""
	state := "opened"
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

	params := url.Values{}
	params.Set("state", state)
	params.Set("page", fmt.Sprintf("%d", page))
	params.Set("per_page", fmt.Sprintf("%d", perPage))
	params.Set("sort", "updated_desc")

	// Map scope to GitLab API params.
	// GitLab uses underscore-separated values for the scope parameter.
	switch scope {
	case "all":
		params.Set("scope", "all")
	case "assigned-to-me":
		params.Set("scope", "assigned_to_me")
	case "created-by-me":
		params.Set("scope", "created_by_me")
	case "no-assignee":
		params.Set("assignee_id", "None")
	}

	if search != "" {
		params.Set("search", search)
	}

	// GitLab state values: "opened", "closed", "all"
	glState := state
	if glState == "open" {
		glState = "opened"
	}
	params.Set("state", glState)

	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/issues?%s",
		ic.c.baseURL, projectPath, params.Encode())

	body, statusCode, headers, err := ic.doGetWithHeaders(apiURL)
	if err != nil {
		return nil, err
	}

	if statusCode != http.StatusOK {
		return nil, fmt.Errorf("GitLab API error (status %d): %s", statusCode, string(body))
	}

	// Parse pagination headers
	totalCount := -1
	totalPages := -1
	currentPage := page

	if totalStr := headers.Get("X-Total"); totalStr != "" {
		if t, err := strconv.Atoi(totalStr); err == nil {
			totalCount = t
		}
	}
	if totalPagesStr := headers.Get("X-Total-Pages"); totalPagesStr != "" {
		if tp, err := strconv.Atoi(totalPagesStr); err == nil {
			totalPages = tp
		}
	}
	if pageStr := headers.Get("X-Page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil {
			currentPage = p
		}
	}

	var glIssues []glIssue
	if err := json.Unmarshal(body, &glIssues); err != nil {
		return nil, fmt.Errorf("failed to parse issues: %w", err)
	}

	results := make([]issues.Issue, 0, len(glIssues))
	for _, iss := range glIssues {
		results = append(results, convertGLIssue(iss))
	}

	return &issues.IssueListResult{
		Issues:      results,
		TotalCount:  totalCount,
		TotalPages:  totalPages,
		CurrentPage: currentPage,
		PerPage:     perPage,
	}, nil
}

// GetIssue implements issues.Client.GetIssue.
func (ic *IssuesClient) GetIssue(info *issues.RepoInfo, number int) (*issues.Issue, error) {
	proj := ic.project
	if info != nil && info.Namespace != "" && info.Project != "" {
		proj = &ProjectInfo{
			Host:      info.Host,
			Namespace: info.Namespace,
			Project:   info.Project,
		}
	}

	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", proj.Namespace, proj.Project))
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/issues/%d",
		ic.c.baseURL, projectPath, number)

	body, statusCode, err := ic.doGet(apiURL)
	if err != nil {
		return nil, err
	}

	if statusCode != http.StatusOK {
		return nil, fmt.Errorf("GitLab API error (status %d): %s", statusCode, string(body))
	}

	var glIss glIssue
	if err := json.Unmarshal(body, &glIss); err != nil {
		return nil, fmt.Errorf("failed to parse issue: %w", err)
	}

	result := convertGLIssue(glIss)
	return &result, nil
}

// GetIssueComments implements issues.Client.GetIssueComments.
func (ic *IssuesClient) GetIssueComments(info *issues.RepoInfo, number int) (*issues.IssueCommentListResult, error) {
	proj := ic.project
	if info != nil && info.Namespace != "" && info.Project != "" {
		proj = &ProjectInfo{
			Host:      info.Host,
			Namespace: info.Namespace,
			Project:   info.Project,
		}
	}

	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", proj.Namespace, proj.Project))
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/issues/%d/notes?per_page=100",
		ic.c.baseURL, projectPath, number)

	body, statusCode, err := ic.doGet(apiURL)
	if err != nil {
		return nil, err
	}

	if statusCode != http.StatusOK {
		return nil, fmt.Errorf("GitLab API error (status %d): %s", statusCode, string(body))
	}

	var glNotes []glIssueNote
	if err := json.Unmarshal(body, &glNotes); err != nil {
		return nil, fmt.Errorf("failed to parse issue notes: %w", err)
	}

	results := make([]issues.IssueComment, 0, len(glNotes))
	for _, n := range glNotes {
		results = append(results, convertGLIssueNote(n))
	}

	return &issues.IssueCommentListResult{
		Comments:    results,
		TotalCount:  -1,
		TotalPages:  -1,
		CurrentPage: 1,
		PerPage:     100,
	}, nil
}

var _ = log.Printf
