package gitlab

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
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/friendsfriend/devenv/pkg/mr"
)

// Client is the GitLab API client used internally.
type Client interface {
	Username() string
	GetMergeRequests(projectInfo *ProjectInfo, sourceBranch, targetBranch string) ([]MergeRequest, error)
	GetMergeRequestsWithOptions(projectInfo *ProjectInfo, opts *mr.MRListOptions) (*mr.MRListResult, error)
	GetPipelineJobs(projectInfo *ProjectInfo, pipelineID int) ([]Job, error)
	GetTestSummary(projectInfo *ProjectInfo, pipelineID int) (*TestSummary, error)
	GetMRChanges(projectInfo *ProjectInfo, mrIID int) ([]MRChange, error)
	GetMRVersions(projectInfo *ProjectInfo, mrIID int) ([]map[string]interface{}, error)
	CreateMRDiffComment(projectInfo *ProjectInfo, mrIID int, body string, position *DiffPosition) error
	GetMRDiscussions(projectInfo *ProjectInfo, mrIID int) ([]Discussion, error)
	ReplyToDiscussion(projectInfo *ProjectInfo, mrIID int, discussionID string, body string) error
	ResolveDiscussion(projectInfo *ProjectInfo, mrIID int, discussionID string, resolved bool) error
	ApproveMergeRequest(projectInfo *ProjectInfo, mrIID int) error
	UnapproveMergeRequest(projectInfo *ProjectInfo, mrIID int) error
	ToggleMRApproval(projectInfo *ProjectInfo, mrIID int, username string) error
	RebaseMergeRequest(projectInfo *ProjectInfo, mrIID int) error
	CloseMergeRequest(projectInfo *ProjectInfo, mrIID int) error
	GetJobLogs(projectInfo *ProjectInfo, jobID int) (string, error)
	StreamJobLogs(ctx context.Context, projectInfo *ProjectInfo, jobID int) (chan string, error)
	SearchProjects(query string, limit int) ([]SearchResult, error)
	ValidateConnection() error
	GetPipelines(projectInfo *ProjectInfo, limit int) ([]Pipeline, error)
	RestartJob(projectInfo *ProjectInfo, jobID int) error
	CancelJob(projectInfo *ProjectInfo, jobID int) error
}

type client struct {
	baseURL    string
	token      string
	username   string
	httpClient *http.Client
}

// Username returns the authenticated username for approval toggling.
func (c *client) Username() string {
	return c.username
}

// Pipeline represents a GitLab pipeline from the API
type Pipeline struct {
	ID        int       `json:"id"`
	IID       int       `json:"iid"`
	ProjectID int       `json:"project_id"`
	Status    string    `json:"status"`
	Ref       string    `json:"ref"`
	SHA       string    `json:"sha"`
	WebURL    string    `json:"web_url"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	User      struct {
		Name     string `json:"name"`
		Username string `json:"username"`
	} `json:"user"`
	Source string `json:"source"`
}

// Job represents a GitLab job/stage from the API
type Job struct {
	ID             int        `json:"id"`
	Name           string     `json:"name"`
	Stage          string     `json:"stage"`
	Status         string     `json:"status"`
	WebURL         string     `json:"web_url"`
	CreatedAt      *time.Time `json:"created_at,omitempty"`
	StartedAt      *time.Time `json:"started_at,omitempty"`
	FinishedAt     *time.Time `json:"finished_at,omitempty"`
	Duration       *float64   `json:"duration,omitempty"`        // Job duration in seconds
	QueuedDuration *float64   `json:"queued_duration,omitempty"` // Time spent in queue
	Runner         *struct {
		ID          int    `json:"id"`
		Description string `json:"description"`
		Name        string `json:"name"`
	} `json:"runner,omitempty"`
	Pipeline struct {
		ID int `json:"id"`
	} `json:"pipeline"`
}

// TestCase represents an individual test case
type TestCase struct {
	Name      string         `json:"name"`
	Classname string         `json:"classname"`
	Status    string         `json:"status"`
	Time      float64        `json:"execution_time"`          // GitLab uses "execution_time" not "time"
	SystemOut FlexibleString `json:"system_output,omitempty"` // GitLab uses "system_output" - can be string or object
	SystemErr string         `json:"stack_trace,omitempty"`   // GitLab uses "stack_trace" for error info
}

// FlexibleString handles both string and object formats from GitLab API
// GitLab sometimes returns system_output as a string, sometimes as {"value": "..."}
type FlexibleString string

// UnmarshalJSON implements custom unmarshaling for FlexibleString
func (fs *FlexibleString) UnmarshalJSON(data []byte) error {
	// Handle null explicitly
	if string(data) == "null" {
		*fs = ""
		return nil
	}

	// Try to unmarshal as a plain string first
	var str string
	if err := json.Unmarshal(data, &str); err == nil {
		*fs = FlexibleString(str)
		return nil
	}

	// If that fails, try to unmarshal as an object with a "value" field
	var obj struct {
		Value string `json:"value"`
	}
	if err := json.Unmarshal(data, &obj); err == nil {
		*fs = FlexibleString(obj.Value)
		return nil
	}

	// If all fail, just set empty string
	*fs = ""
	return nil
}

// MarshalJSON implements custom marshaling for FlexibleString
// Always output as a plain string for consistency
func (fs FlexibleString) MarshalJSON() ([]byte, error) {
	return json.Marshal(string(fs))
}

// TestSuite represents a test suite containing multiple test cases
type TestSuite struct {
	Name      string     `json:"name"`
	TestCases []TestCase `json:"test_cases"`
}

// FailedTestGroup represents failed tests grouped by class name
type FailedTestGroup struct {
	ClassName   string   `json:"class_name"`   // Class name without package prefix
	TestMethods []string `json:"test_methods"` // List of failed test method names
}

// TestSummary represents test results for a pipeline
type TestSummary struct {
	Total            int               `json:"total"`
	Success          int               `json:"success"`
	Failed           int               `json:"failed"`
	Skipped          int               `json:"skipped"`
	Error            int               `json:"error"`
	TestSuites       []TestSuite       `json:"test_suites,omitempty"`
	FailedTests      []string          `json:"-"` // Legacy field for backward compatibility
	FailedTestGroups []FailedTestGroup `json:"-"` // New grouped failed tests by class
}

// MRApprovals represents the approval information for a merge request
type MRApprovals struct {
	ApprovalsRequired int `json:"approvals_required"`
	ApprovalsLeft     int `json:"approvals_left"`
	ApprovedBy        []struct {
		User struct {
			Name     string `json:"name"`
			Username string `json:"username"`
		} `json:"user"`
	} `json:"approved_by"`
}

// MergeRequest represents a GitLab merge request from the API
type MergeRequest struct {
	ID           int       `json:"id"`
	IID          int       `json:"iid"`
	Title        string    `json:"title"`
	Description  string    `json:"description"`
	SourceBranch string    `json:"source_branch"`
	TargetBranch string    `json:"target_branch"`
	State        string    `json:"state"`
	WebURL       string    `json:"web_url"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	Author       struct {
		Name     string `json:"name"`
		Username string `json:"username"`
	} `json:"author"`
	// GitLab returns this as "head_pipeline" in the API response
	HeadPipeline *struct {
		ID     int    `json:"id"`
		Status string `json:"status"`
		WebURL string `json:"web_url"`
	} `json:"head_pipeline,omitempty"`
	// Approval and mergability status
	MergeStatus                 string       `json:"merge_status"`                  // can_be_merged, cannot_be_merged, unchecked, checking, cannot_be_merged_recheck
	DetailedMergeStatus         string       `json:"detailed_merge_status"`         // more detailed merge status (includes need_rebase, not_open, checking, mergeable, etc)
	Draft                       bool         `json:"draft"`                         // whether MR is marked as draft
	WorkInProgress              bool         `json:"work_in_progress"`              // legacy field for draft status
	HasConflicts                bool         `json:"has_conflicts"`                 // whether MR has merge conflicts
	BlockingDiscussionsResolved bool         `json:"blocking_discussions_resolved"` // whether all blocking discussions are resolved
	RebaseInProgress            bool         `json:"rebase_in_progress"`            // whether a rebase operation is currently in progress
	MergeError                  string       `json:"merge_error"`                   // error message if merge/rebase failed
	Approvals                   *MRApprovals `json:"approvals,omitempty"`
}

// MRChange represents a changed file in a merge request
type MRChange struct {
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
	DiffLines    []DiffLine `json:"diff_lines,omitempty"` // Parsed diff lines with line codes
}

// DiffLine represents a single line in a diff with its metadata
type DiffLine struct {
	LineCode string `json:"line_code"` // GitLab's unique identifier for this line
	Type     string `json:"type"`      // "new", "old", "match" (context)
	OldLine  *int   `json:"old_line"`  // Line number in old file (nil for added lines)
	NewLine  *int   `json:"new_line"`  // Line number in new file (nil for deleted lines)
	Text     string `json:"text"`      // The actual line content
	RichText string `json:"rich_text"` // HTML-formatted text (if available)
}

// Discussion represents a GitLab discussion thread (can contain multiple notes/comments)
type Discussion struct {
	ID             string        `json:"id"`
	IndividualNote bool          `json:"individual_note"` // true if single comment, false if thread
	Notes          []Note        `json:"notes"`
	Position       *NotePosition `json:"position,omitempty"` // Position in diff (for diff comments)
}

// Note represents a single comment/note within a discussion
type Note struct {
	ID         int           `json:"id"`
	Type       string        `json:"type"` // "DiffNote", "DiscussionNote", etc.
	Body       string        `json:"body"` // Comment text (markdown)
	Author     NoteAuthor    `json:"author"`
	CreatedAt  time.Time     `json:"created_at"`
	UpdatedAt  time.Time     `json:"updated_at"`
	System     bool          `json:"system"`             // true for system-generated notes
	Position   *NotePosition `json:"position,omitempty"` // Position in diff
	Resolvable bool          `json:"resolvable"`         // Can this note be resolved?
	Resolved   bool          `json:"resolved"`           // Is this note resolved?
	ResolvedBy *NoteAuthor   `json:"resolved_by,omitempty"`
	ResolvedAt *time.Time    `json:"resolved_at,omitempty"`
}

// NoteAuthor represents the author of a note/comment
type NoteAuthor struct {
	ID        int    `json:"id"`
	Username  string `json:"username"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
}

// NotePosition represents the position of a comment in a diff
type NotePosition struct {
	BaseSHA      string `json:"base_sha"`
	StartSHA     string `json:"start_sha"`
	HeadSHA      string `json:"head_sha"`
	OldPath      string `json:"old_path"`
	NewPath      string `json:"new_path"`
	PositionType string `json:"position_type"` // "text", "image", or "file"
	OldLine      *int   `json:"old_line,omitempty"`
	NewLine      *int   `json:"new_line,omitempty"`
	LineRange    *struct {
		Start struct {
			LineCode string `json:"line_code"`
			Type     string `json:"type"`
			OldLine  *int   `json:"old_line,omitempty"`
			NewLine  *int   `json:"new_line,omitempty"`
		} `json:"start"`
		End struct {
			LineCode string `json:"line_code"`
			Type     string `json:"type"`
			OldLine  *int   `json:"old_line,omitempty"`
			NewLine  *int   `json:"new_line,omitempty"`
		} `json:"end"`
	} `json:"line_range,omitempty"` // For multi-line comments
}

// calculateLineStats calculates lines added and deleted from the diff
func (c *MRChange) calculateLineStats() {
	if c.Diff == "" {
		return
	}

	added := 0
	deleted := 0

	lines := strings.Split(c.Diff, "\n")
	for _, line := range lines {
		if len(line) == 0 {
			continue
		}
		if line[0] == '+' && !strings.HasPrefix(line, "+++") {
			added++
		} else if line[0] == '-' && !strings.HasPrefix(line, "---") {
			deleted++
		}
	}

	c.LinesAdded = added
	c.LinesDeleted = deleted
}

// parseDiffLines parses the unified diff and generates line codes for each line
// Note: We generate line_code but GitLab requires it to match their internal codes
// For now, we parse the structure but don't use line_code in API calls
func (c *MRChange) parseDiffLines(baseSHA string) {
	if c.Diff == "" {
		log.Printf("[DEBUG] parseDiffLines: Empty diff for %s", c.NewPath)
		return
	}

	if baseSHA == "" {
		log.Printf("[DEBUG] parseDiffLines: Empty baseSHA for %s", c.NewPath)
		return
	}

	var diffLines []DiffLine
	lines := strings.Split(c.Diff, "\n")

	log.Printf("[DEBUG] parseDiffLines: Parsing %d lines for %s with baseSHA=%s", len(lines), c.NewPath, baseSHA[:8])

	var currentOldLine int
	var currentNewLine int

	for _, line := range lines {
		if len(line) == 0 {
			continue
		}

		// Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
		if strings.HasPrefix(line, "@@") {
			match := regexp.MustCompile(`@@ -(\d+),?\d* \+(\d+),?\d* @@`).FindStringSubmatch(line)
			if len(match) >= 3 {
				currentOldLine, _ = strconv.Atoi(match[1])
				currentNewLine, _ = strconv.Atoi(match[2])
			}
			continue
		}

		// Skip file headers
		if strings.HasPrefix(line, "---") || strings.HasPrefix(line, "+++") || strings.HasPrefix(line, "\\") {
			continue
		}

		// Determine line type and numbers
		var diffLine DiffLine
		diffLine.Text = line

		if strings.HasPrefix(line, "+") {
			// Added line
			diffLine.Type = "new"
			newLineVal := currentNewLine
			diffLine.NewLine = &newLineVal
			diffLine.LineCode = c.generateLineCode(baseSHA, &newLineVal, nil)
			currentNewLine++
		} else if strings.HasPrefix(line, "-") {
			// Deleted line
			diffLine.Type = "old"
			oldLineVal := currentOldLine
			diffLine.OldLine = &oldLineVal
			diffLine.LineCode = c.generateLineCode(baseSHA, nil, &oldLineVal)
			currentOldLine++
		} else {
			// Context line (unchanged)
			diffLine.Type = "match"
			oldLineVal := currentOldLine
			newLineVal := currentNewLine
			diffLine.OldLine = &oldLineVal
			diffLine.NewLine = &newLineVal
			diffLine.LineCode = c.generateLineCode(baseSHA, &newLineVal, &oldLineVal)
			currentOldLine++
			currentNewLine++
		}

		diffLines = append(diffLines, diffLine)
	}

	c.DiffLines = diffLines
}

// generateLineCode generates a GitLab-compatible line_code
// Format: SHA1("<base_sha>:<old_path>:<old_line>:<new_path>:<new_line>")
// Note: GitLab validates these strictly, so we generate them but don't use them in API calls
func (c *MRChange) generateLineCode(baseSHA string, newLine *int, oldLine *int) string {
	oldLineStr := ""
	if oldLine != nil {
		oldLineStr = strconv.Itoa(*oldLine)
	}

	newLineStr := ""
	if newLine != nil {
		newLineStr = strconv.Itoa(*newLine)
	}

	// GitLab format: base_sha:old_path:old_line:new_path:new_line
	content := fmt.Sprintf("%s:%s:%s:%s:%s", baseSHA, c.OldPath, oldLineStr, c.NewPath, newLineStr)

	hash := sha1.New()
	hash.Write([]byte(content))
	return fmt.Sprintf("%x", hash.Sum(nil))
}

// ProjectInfo represents extracted project information from a Git URL
type ProjectInfo struct {
	Host      string
	Namespace string // Group/organization name
	Project   string // Project name
}

// ToMR converts gitlab.ProjectInfo to mr.RepoInfo.
func (p *ProjectInfo) ToMR() *mr.RepoInfo {
	return &mr.RepoInfo{
		Host:      p.Host,
		Namespace: p.Namespace,
		Project:   p.Project,
	}
}

// FromMR converts mr.RepoInfo to gitlab.ProjectInfo.
func FromMR(info *mr.RepoInfo) (*ProjectInfo, error) {
	if info == nil {
		return nil, fmt.Errorf("project info is nil")
	}
	if info.Namespace == "" || info.Project == "" {
		return nil, fmt.Errorf("mr.RepoInfo missing Namespace or Project fields")
	}
	return &ProjectInfo{
		Host:      info.Host,
		Namespace: info.Namespace,
		Project:   info.Project,
	}, nil
}

// SearchResult represents a repository found via project search
type SearchResult struct {
	Name          string `json:"name"`
	FullPath      string `json:"fullPath"`
	HTTPURL       string `json:"httpUrl"`
	DefaultBranch string `json:"defaultBranch"`
}

// NewClient creates a new GitLab API client
func NewClient(baseURL, token, username string) Client {
	// Ensure baseURL has the correct format
	if !strings.HasPrefix(baseURL, "http://") && !strings.HasPrefix(baseURL, "https://") {
		baseURL = "https://" + baseURL
	}

	// Remove trailing slash
	baseURL = strings.TrimSuffix(baseURL, "/")

	return &client{
		baseURL:  baseURL,
		token:    token,
		username: username,
		httpClient: &http.Client{
			Timeout: time.Second * 15, // Reasonable timeout for API calls
			Transport: &http.Transport{
				ResponseHeaderTimeout: time.Second * 10, // Max time to wait for response headers
				TLSHandshakeTimeout:   time.Second * 5,  // Max time for TLS handshake
				DisableKeepAlives:     false,            // Enable keep-alive for better performance
			},
		},
	}
}

// --- mr.Client implementations ---

// MRClient implements mr.Client by wrapping a Client.
type MRClient struct {
	client Client
}

// NewMRClient creates a new MRClient that implements mr.Client.
func NewMRClient(client Client) mr.Client {
	return &MRClient{client: client}
}

func (c *MRClient) Search(info *mr.RepoInfo, query string, limit int) ([]mr.SearchResult, error) {
	results, err := c.client.SearchProjects(query, limit)
	if err != nil {
		return nil, err
	}
	return convertSearchResultsToMR(results), nil
}

func (c *MRClient) GetMRs(info *mr.RepoInfo, options *mr.MRListOptions) (*mr.MRListResult, error) {
	projectInfo, err := FromMR(info)
	if err != nil {
		return nil, err
	}

	return c.client.GetMergeRequestsWithOptions(projectInfo, options)
}

func (c *MRClient) GetMRChanges(info *mr.RepoInfo, mrNumber int) ([]mr.MRChange, error) {
	projectInfo, err := FromMR(info)
	if err != nil {
		return nil, err
	}
	changes, err := c.client.GetMRChanges(projectInfo, mrNumber)
	if err != nil {
		return nil, err
	}
	return convertMRChangesToMR(changes), nil
}

func (c *MRClient) GetDiscussions(info *mr.RepoInfo, mrNumber int) ([]mr.Discussion, error) {
	projectInfo, err := FromMR(info)
	if err != nil {
		return nil, err
	}
	discussions, err := c.client.GetMRDiscussions(projectInfo, mrNumber)
	if err != nil {
		return nil, err
	}
	return convertDiscussionsToMR(discussions), nil
}

func (c *MRClient) Approve(info *mr.RepoInfo, mrNumber int) error {
	projectInfo, err := FromMR(info)
	if err != nil {
		return err
	}
	return c.client.ApproveMergeRequest(projectInfo, mrNumber)
}

func (c *MRClient) Unapprove(info *mr.RepoInfo, mrNumber int) error {
	projectInfo, err := FromMR(info)
	if err != nil {
		return err
	}
	return c.client.UnapproveMergeRequest(projectInfo, mrNumber)
}

func (c *MRClient) ToggleApproval(info *mr.RepoInfo, mrNumber int) error {
	projectInfo, err := FromMR(info)
	if err != nil {
		return err
	}
	return c.client.ToggleMRApproval(projectInfo, mrNumber, c.client.Username())
}

func (c *MRClient) GetJobLogs(info *mr.RepoInfo, jobID int) (string, error) {
	projectInfo, err := FromMR(info)
	if err != nil {
		return "", err
	}
	return c.client.GetJobLogs(projectInfo, jobID)
}

func (c *MRClient) ValidateConnection(info *mr.RepoInfo) error {
	return c.client.ValidateConnection()
}

func (c *MRClient) GetPipelines(info *mr.RepoInfo, limit int) ([]mr.Pipeline, error) {
	projectInfo, err := FromMR(info)
	if err != nil {
		return nil, err
	}
	pipelines, err := c.client.GetPipelines(projectInfo, limit)
	if err != nil {
		return nil, err
	}
	return convertPipelinesToMR(pipelines), nil
}

func (c *MRClient) GetPipelineJobs(info *mr.RepoInfo, pipelineID int) ([]mr.Job, error) {
	projectInfo, err := FromMR(info)
	if err != nil {
		return nil, err
	}
	jobs, err := c.client.GetPipelineJobs(projectInfo, pipelineID)
	if err != nil {
		return nil, err
	}
	return convertJobsToMR(jobs), nil
}

func (c *MRClient) RestartJob(info *mr.RepoInfo, jobID int) error {
	projectInfo, err := FromMR(info)
	if err != nil {
		return err
	}
	return c.client.RestartJob(projectInfo, jobID)
}

func (c *MRClient) CancelJob(info *mr.RepoInfo, jobID int) error {
	projectInfo, err := FromMR(info)
	if err != nil {
		return err
	}
	return c.client.CancelJob(projectInfo, jobID)
}

func (c *MRClient) Close(info *mr.RepoInfo, mrNumber int) error {
	projectInfo, err := FromMR(info)
	if err != nil {
		return err
	}
	return c.client.CloseMergeRequest(projectInfo, mrNumber)
}

func (c *MRClient) Rebase(info *mr.RepoInfo, mrNumber int) error {
	projectInfo, err := FromMR(info)
	if err != nil {
		return err
	}
	return c.client.RebaseMergeRequest(projectInfo, mrNumber)
}

func (c *MRClient) CreateDiffComment(info *mr.RepoInfo, mrNumber int, body string, position *mr.DiffPosition) error {
	projectInfo, err := FromMR(info)
	if err != nil {
		return err
	}
	var pos *DiffPosition
	if position != nil {
		pos = &DiffPosition{
			BaseSHA:      position.BaseSHA,
			HeadSHA:      position.HeadSHA,
			StartSHA:     position.StartSHA,
			PositionType: position.PositionType,
			NewPath:      position.NewPath,
			OldPath:      position.OldPath,
			NewLine:      position.NewLine,
			OldLine:      position.OldLine,
		}
	}
	return c.client.CreateMRDiffComment(projectInfo, mrNumber, body, pos)
}

func (c *MRClient) ReplyToDiscussion(info *mr.RepoInfo, mrNumber int, discussionID string, body string) error {
	projectInfo, err := FromMR(info)
	if err != nil {
		return err
	}
	return c.client.ReplyToDiscussion(projectInfo, mrNumber, discussionID, body)
}

func (c *MRClient) ResolveDiscussion(info *mr.RepoInfo, mrNumber int, discussionID string, resolved bool) error {
	projectInfo, err := FromMR(info)
	if err != nil {
		return err
	}
	return c.client.ResolveDiscussion(projectInfo, mrNumber, discussionID, resolved)
}

func (c *MRClient) GetTestSummary(info *mr.RepoInfo, pipelineID int) (*mr.TestSummary, error) {
	projectInfo, err := FromMR(info)
	if err != nil {
		return nil, err
	}
	summary, err := c.client.GetTestSummary(projectInfo, pipelineID)
	if err != nil {
		return nil, err
	}
	if summary == nil {
		return nil, nil
	}
	return convertTestSummaryToMR(summary), nil
}

func (c *MRClient) StreamJobLogs(ctx context.Context, info *mr.RepoInfo, jobID int) (chan string, error) {
	projectInfo, err := FromMR(info)
	if err != nil {
		return nil, err
	}
	return c.client.StreamJobLogs(ctx, projectInfo, jobID)
}

// --- Conversion helpers for mr types ---

func convertSearchResultsToMR(results []SearchResult) []mr.SearchResult {
	mrResults := make([]mr.SearchResult, len(results))
	for i, r := range results {
		mrResults[i] = mr.SearchResult{
			Name:          r.Name,
			FullPath:      r.FullPath,
			HTTPURL:       r.HTTPURL,
			DefaultBranch: r.DefaultBranch,
		}
	}
	return mrResults
}

func convertMRsToMR(mrs []MergeRequest) []mr.MergeRequest {
	result := make([]mr.MergeRequest, len(mrs))
	for i, m := range mrs {
		result[i] = convertMRToMR(m)
	}
	return result
}

func convertMRToMR(m MergeRequest) mr.MergeRequest {
	result := mr.MergeRequest{
		ID:                          m.ID,
		IID:                         m.IID,
		Title:                       m.Title,
		Description:                 m.Description,
		SourceBranch:                m.SourceBranch,
		TargetBranch:                m.TargetBranch,
		State:                       m.State,
		WebURL:                      m.WebURL,
		CreatedAt:                   m.CreatedAt,
		UpdatedAt:                   m.UpdatedAt,
		Author:                      m.Author,
		MergeStatus:                 m.MergeStatus,
		DetailedMergeStatus:         m.DetailedMergeStatus,
		Draft:                       m.Draft,
		WorkInProgress:              m.WorkInProgress,
		HasConflicts:                m.HasConflicts,
		BlockingDiscussionsResolved: m.BlockingDiscussionsResolved,
		RebaseInProgress:            m.RebaseInProgress,
		MergeError:                  m.MergeError,
	}
	if m.HeadPipeline != nil {
		result.HeadPipeline = &mr.PipelineRef{
			ID:     m.HeadPipeline.ID,
			Status: m.HeadPipeline.Status,
			WebURL: m.HeadPipeline.WebURL,
		}
	}
	if m.Approvals != nil {
		result.ApproveStatus = &mr.ApproveStatus{
			ApprovalsRequired: m.Approvals.ApprovalsRequired,
			ApprovalsLeft:     m.Approvals.ApprovalsLeft,
			ApprovedBy:        m.Approvals.ApprovedBy,
		}
	}
	return result
}

func convertMRChangesToMR(changes []MRChange) []mr.MRChange {
	result := make([]mr.MRChange, len(changes))
	for i, ch := range changes {
		result[i] = mr.MRChange{
			OldPath:      ch.OldPath,
			NewPath:      ch.NewPath,
			AMode:        ch.AMode,
			BMode:        ch.BMode,
			NewFile:      ch.NewFile,
			RenamedFile:  ch.RenamedFile,
			DeletedFile:  ch.DeletedFile,
			Diff:         ch.Diff,
			LinesAdded:   ch.LinesAdded,
			LinesDeleted: ch.LinesDeleted,
		}
		if len(ch.DiffLines) > 0 {
			result[i].DiffLines = make([]mr.DiffLine, len(ch.DiffLines))
			for j, dl := range ch.DiffLines {
				result[i].DiffLines[j] = mr.DiffLine{
					LineCode: dl.LineCode,
					Type:     dl.Type,
					OldLine:  dl.OldLine,
					NewLine:  dl.NewLine,
					Text:     dl.Text,
					RichText: dl.RichText,
				}
			}
		}
	}
	return result
}

func convertDiscussionsToMR(discussions []Discussion) []mr.Discussion {
	result := make([]mr.Discussion, len(discussions))
	for i, d := range discussions {
		result[i] = mr.Discussion{
			ID:             d.ID,
			IndividualNote: d.IndividualNote,
			Notes:          make([]mr.Note, len(d.Notes)),
		}
		for j, n := range d.Notes {
			result[i].Notes[j] = mr.Note{
				ID:         n.ID,
				Type:       n.Type,
				Body:       n.Body,
				Author:     mr.NoteAuthor(n.Author),
				CreatedAt:  n.CreatedAt,
				UpdatedAt:  n.UpdatedAt,
				System:     n.System,
				Resolvable: n.Resolvable,
				Resolved:   n.Resolved,
			}
		}
	}
	return result
}

func convertPipelinesToMR(pipelines []Pipeline) []mr.Pipeline {
	result := make([]mr.Pipeline, len(pipelines))
	for i, p := range pipelines {
		result[i] = mr.Pipeline{
			ID:        p.ID,
			IID:       p.IID,
			ProjectID: p.ProjectID,
			Status:    p.Status,
			Ref:       p.Ref,
			SHA:       p.SHA,
			WebURL:    p.WebURL,
			CreatedAt: p.CreatedAt,
			UpdatedAt: p.UpdatedAt,
			User:      p.User,
			Source:    p.Source,
		}
	}
	return result
}

func convertJobsToMR(jobs []Job) []mr.Job {
	result := make([]mr.Job, len(jobs))
	for i, j := range jobs {
		result[i] = mr.Job{
			ID:             j.ID,
			Name:           j.Name,
			Stage:          j.Stage,
			Status:         j.Status,
			WebURL:         j.WebURL,
			CreatedAt:      j.CreatedAt,
			StartedAt:      j.StartedAt,
			FinishedAt:     j.FinishedAt,
			Duration:       j.Duration,
			QueuedDuration: j.QueuedDuration,
		}
		result[i].Pipeline.ID = j.Pipeline.ID
	}
	return result
}

func convertTestSummaryToMR(summary *TestSummary) *mr.TestSummary {
	if summary == nil {
		return nil
	}
	result := &mr.TestSummary{
		Total:   summary.Total,
		Success: summary.Success,
		Failed:  summary.Failed,
		Skipped: summary.Skipped,
		Error:   summary.Error,
	}
	if len(summary.TestSuites) > 0 {
		result.TestSuites = make([]mr.TestSuite, len(summary.TestSuites))
		for i, ts := range summary.TestSuites {
			result.TestSuites[i] = mr.TestSuite{
				Name: ts.Name,
			}
			if len(ts.TestCases) > 0 {
				result.TestSuites[i].TestCases = make([]mr.TestCase, len(ts.TestCases))
				for j, tc := range ts.TestCases {
					result.TestSuites[i].TestCases[j] = mr.TestCase{
						Name:      tc.Name,
						Classname: tc.Classname,
						Status:    tc.Status,
						Time:      tc.Time,
						SystemOut: string(tc.SystemOut),
						SystemErr: tc.SystemErr,
					}
				}
			}
		}
	}
	if len(summary.FailedTestGroups) > 0 {
		result.FailedTestGroups = make([]mr.FailedTestGroup, len(summary.FailedTestGroups))
		for i, fg := range summary.FailedTestGroups {
			result.FailedTestGroups[i] = mr.FailedTestGroup{
				ClassName:   fg.ClassName,
				TestMethods: fg.TestMethods,
			}
		}
	}
	return result
}

// ExtractProjectInfo extracts GitLab project information from a Git repository URL
func ExtractProjectInfo(gitURL string) (*ProjectInfo, error) {
	if gitURL == "" {
		return nil, fmt.Errorf("empty Git URL")
	}

	// Trim whitespace
	gitURL = strings.TrimSpace(gitURL)

	var host, projectPath string

	// Handle SSH format: git@hostname:group/project.git
	if strings.HasPrefix(gitURL, "git@") {
		parts := strings.SplitN(gitURL, ":", 2)
		if len(parts) != 2 {
			return nil, fmt.Errorf("invalid SSH Git URL format: %s", gitURL)
		}

		host = strings.TrimPrefix(parts[0], "git@")
		projectPath = strings.TrimSuffix(parts[1], ".git")
	} else if strings.HasPrefix(gitURL, "https://") || strings.HasPrefix(gitURL, "http://") {
		// Handle HTTPS/HTTP format: https://hostname/group/project.git
		parsedURL, err := url.Parse(gitURL)
		if err != nil {
			return nil, fmt.Errorf("failed to parse Git URL: %w", err)
		}

		host = parsedURL.Host
		projectPath = strings.TrimPrefix(parsedURL.Path, "/")
		projectPath = strings.TrimSuffix(projectPath, ".git")
	} else {
		return nil, fmt.Errorf("unsupported Git URL format: %s", gitURL)
	}

	// Validate host and project path
	if host == "" || projectPath == "" {
		return nil, fmt.Errorf("could not extract host and project path from URL: %s", gitURL)
	}

	// Split project path into namespace and project
	pathParts := strings.SplitN(projectPath, "/", 2)
	if len(pathParts) != 2 {
		return nil, fmt.Errorf("invalid project path format (expected group/project): %s", projectPath)
	}

	return &ProjectInfo{
		Host:      host,
		Namespace: pathParts[0],
		Project:   pathParts[1],
	}, nil
}

// GetPipelines fetches pipelines for a given project
func (c *client) GetPipelines(projectInfo *ProjectInfo, limit int) ([]Pipeline, error) {
	if projectInfo == nil {
		return nil, fmt.Errorf("project info is nil")
	}

	// URL encode the project path (namespace/project)
	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", projectInfo.Namespace, projectInfo.Project))

	// Construct API URL
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/pipelines", c.baseURL, projectPath)

	// Add query parameters
	params := url.Values{}
	if limit > 0 {
		params.Set("per_page", fmt.Sprintf("%d", limit))
	}
	params.Set("order_by", "id")
	params.Set("sort", "desc") // Get newest first

	if len(params) > 0 {
		apiURL += "?" + params.Encode()
	}

	// Create request
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add authentication header
	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	switch resp.StatusCode {
	case http.StatusOK:
		// Success, continue processing
	case http.StatusUnauthorized:
		return nil, fmt.Errorf("GitLab authentication failed - check your token")
	case http.StatusForbidden:
		return nil, fmt.Errorf("access forbidden - token may lack permissions for project %s/%s", projectInfo.Namespace, projectInfo.Project)
	case http.StatusNotFound:
		return nil, fmt.Errorf("project not found: %s/%s - check if the project exists and you have access", projectInfo.Namespace, projectInfo.Project)
	case http.StatusTooManyRequests:
		return nil, fmt.Errorf("GitLab API rate limit exceeded - please try again later")
	case http.StatusInternalServerError:
		return nil, fmt.Errorf("GitLab server error - please try again later")
	default:
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitLab API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Parse JSON response
	var pipelines []Pipeline
	if err := json.Unmarshal(body, &pipelines); err != nil {
		return nil, fmt.Errorf("failed to parse JSON response: %w", err)
	}

	return pipelines, nil
}

// GetMergeRequests fetches merge requests for the project (used for MR pipeline detection)
func (c *client) GetMergeRequests(projectInfo *ProjectInfo, sourceBranch, targetBranch string) ([]MergeRequest, error) {
	if projectInfo == nil {
		return nil, fmt.Errorf("project info is nil")
	}

	// URL encode the project path (namespace/project)
	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", projectInfo.Namespace, projectInfo.Project))

	// Construct API URL
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/merge_requests", c.baseURL, projectPath)

	// Add query parameters for filtering
	params := url.Values{}
	params.Set("state", "opened") // Only get open MRs
	if sourceBranch != "" {
		params.Set("source_branch", sourceBranch)
	}
	if targetBranch != "" {
		params.Set("target_branch", targetBranch)
	}
	params.Set("per_page", "100")                   // Get up to 100 MRs
	params.Set("with_merge_status_recheck", "true") // Ensure merge status is up to date

	apiURL += "?" + params.Encode()

	// Create request
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add authentication header
	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitLab API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Parse JSON response
	var mergeRequests []MergeRequest
	if err := json.Unmarshal(body, &mergeRequests); err != nil {
		return nil, fmt.Errorf("failed to parse JSON response: %w", err)
	}

	// For each MR, fetch the full details to get head_pipeline
	// This is necessary because the list endpoint doesn't always populate head_pipeline
	for i := range mergeRequests {
		fullMR, err := c.GetMergeRequest(projectInfo, mergeRequests[i].IID)
		if err == nil && fullMR != nil {
			mergeRequests[i] = *fullMR
		}
		// If fetching full details fails, we still have basic MR info
	}

	return mergeRequests, nil
}

// GetMergeRequestsWithOptions fetches merge requests with pagination and filter options.
func (c *client) GetMergeRequestsWithOptions(projectInfo *ProjectInfo, opts *mr.MRListOptions) (*mr.MRListResult, error) {
	if projectInfo == nil {
		return nil, fmt.Errorf("project info is nil")
	}

	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", projectInfo.Namespace, projectInfo.Project))

	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/merge_requests", c.baseURL, projectPath)

	params := url.Values{}

	state := "opened"
	page := 1
	perPage := 50
	if opts != nil {
		if opts.State != "" {
			state = opts.State
		}
		if opts.Page > 0 {
			page = opts.Page
		}
		if opts.PerPage > 0 {
			perPage = opts.PerPage
		}
		if opts.SourceBranch != "" {
			params.Set("source_branch", opts.SourceBranch)
		}
		if opts.TargetBranch != "" {
			params.Set("target_branch", opts.TargetBranch)
		}
		if opts.Search != "" {
			params.Set("search", opts.Search)
		}
	}

	params.Set("state", state)
	params.Set("page", fmt.Sprintf("%d", page))
	params.Set("per_page", fmt.Sprintf("%d", perPage))
	params.Set("with_merge_status_recheck", "true")

	apiURL += "?" + params.Encode()

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitLab API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Parse pagination headers
	totalCount := -1
	totalPages := -1
	currentPage := page

	if totalStr := resp.Header.Get("X-Total"); totalStr != "" {
		if t, err := strconv.Atoi(totalStr); err == nil {
			totalCount = t
		}
	}
	if totalPagesStr := resp.Header.Get("X-Total-Pages"); totalPagesStr != "" {
		if tp, err := strconv.Atoi(totalPagesStr); err == nil {
			totalPages = tp
		}
	}
	if pageStr := resp.Header.Get("X-Page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil {
			currentPage = p
		}
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var mergeRequests []MergeRequest
	if err := json.Unmarshal(body, &mergeRequests); err != nil {
		return nil, fmt.Errorf("failed to parse JSON response: %w", err)
	}

	// SkipDetails mode: when true, skip per-MR detail and approval fetches
	skipDetails := opts != nil && opts.SkipDetails

	if !skipDetails {
		// For each MR, fetch full details to get head_pipeline.
		// GetMergeRequest already fetches approval info internally.
		for i := range mergeRequests {
			fullMR, err := c.GetMergeRequest(projectInfo, mergeRequests[i].IID)
			if err == nil && fullMR != nil {
				mergeRequests[i] = *fullMR
			}
		}
	}

	return &mr.MRListResult{
		MergeRequests: convertMRsToMR(mergeRequests),
		TotalCount:    totalCount,
		TotalPages:    totalPages,
		CurrentPage:   currentPage,
		PerPage:       perPage,
	}, nil
}

// GetMergeRequest fetches a single merge request by IID with full details including pipeline
func (c *client) GetMergeRequest(projectInfo *ProjectInfo, mrIID int) (*MergeRequest, error) {
	if projectInfo == nil {
		return nil, fmt.Errorf("project info is nil")
	}

	// URL encode the project path (namespace/project)
	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", projectInfo.Namespace, projectInfo.Project))

	// Construct API URL for single MR
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/merge_requests/%d", c.baseURL, projectPath, mrIID)

	// Create request
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add authentication header
	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitLab API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Parse JSON response
	var mergeRequest MergeRequest
	if err := json.Unmarshal(body, &mergeRequest); err != nil {
		return nil, fmt.Errorf("failed to parse JSON response: %w", err)
	}

	// Fetch approval information separately
	approvals, err := c.GetMRApprovals(projectInfo, mrIID)
	if err == nil && approvals != nil {
		mergeRequest.Approvals = approvals
	}
	// If fetching approvals fails, we still return the MR without approval info

	return &mergeRequest, nil
}

// GetMRApprovals fetches approval information for a merge request
func (c *client) GetMRApprovals(projectInfo *ProjectInfo, mrIID int) (*MRApprovals, error) {
	if projectInfo == nil {
		return nil, fmt.Errorf("project info is nil")
	}

	// URL encode the project path (namespace/project)
	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", projectInfo.Namespace, projectInfo.Project))

	// Construct API URL for MR approvals
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/merge_requests/%d/approvals", c.baseURL, projectPath, mrIID)

	// Create request
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add authentication header
	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		// Approvals API might not be available for all GitLab instances (e.g., CE vs EE)
		// Return nil without error so we can continue without approval info
		return nil, fmt.Errorf("approvals endpoint returned status %d", resp.StatusCode)
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Parse JSON response
	var approvals MRApprovals
	if err := json.Unmarshal(body, &approvals); err != nil {
		return nil, fmt.Errorf("failed to parse JSON response: %w", err)
	}

	return &approvals, nil
}

// GetPipelineJobs fetches jobs for a specific pipeline
func (c *client) GetPipelineJobs(projectInfo *ProjectInfo, pipelineID int) ([]Job, error) {
	if projectInfo == nil {
		return nil, fmt.Errorf("project info is nil")
	}

	// URL encode the project path (namespace/project)
	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", projectInfo.Namespace, projectInfo.Project))

	// Construct API URL
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/pipelines/%d/jobs", c.baseURL, projectPath, pipelineID)

	// Create request
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add authentication header
	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	switch resp.StatusCode {
	case http.StatusOK:
		// Success, continue processing
	case http.StatusUnauthorized:
		return nil, fmt.Errorf("GitLab authentication failed - check your token")
	case http.StatusForbidden:
		return nil, fmt.Errorf("access forbidden - token may lack permissions for project %s/%s", projectInfo.Namespace, projectInfo.Project)
	case http.StatusNotFound:
		return nil, fmt.Errorf("pipeline or project not found: pipeline %d in %s/%s", pipelineID, projectInfo.Namespace, projectInfo.Project)
	case http.StatusTooManyRequests:
		return nil, fmt.Errorf("GitLab API rate limit exceeded - please try again later")
	case http.StatusInternalServerError:
		return nil, fmt.Errorf("GitLab server error - please try again later")
	default:
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitLab API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Parse JSON response
	var jobs []Job
	if err := json.Unmarshal(body, &jobs); err != nil {
		return nil, fmt.Errorf("failed to parse JSON response: %w", err)
	}

	return jobs, nil
}

// PipelineLoader provides high-level pipeline loading functionality
type PipelineLoader struct {
	client Client
}

// PipelineLoadResult represents the result of loading pipelines
type PipelineLoadResult struct {
	Pipelines []Pipeline
	Error     string
}

// JobsLoadResult represents the result of loading jobs for a pipeline
type JobsLoadResult struct {
	PipelineID int
	Jobs       []Job
	Error      string
}

// NewPipelineLoader creates a new pipeline loader with GitLab configuration
func NewPipelineLoader(baseURL, token, username string) *PipelineLoader {
	return &PipelineLoader{
		client: NewClient(baseURL, token, username),
	}
}

// LoadPipelines loads pipelines for a given repository URL with full error handling
func (pl *PipelineLoader) LoadPipelines(repositoryURL string, limit int) PipelineLoadResult {
	// Extract project information from the app's repository URL
	if repositoryURL == "" {
		return PipelineLoadResult{
			Error: "No repository URL provided",
		}
	}

	projectInfo, err := ExtractProjectInfo(repositoryURL)
	if err != nil {
		return PipelineLoadResult{
			Error: fmt.Sprintf("Invalid repository URL '%s': %v", repositoryURL, err),
		}
	}

	// Validate connection first
	if err := pl.client.ValidateConnection(); err != nil {
		return PipelineLoadResult{
			Error: fmt.Sprintf("GitLab connection failed: %v", err),
		}
	}

	// Fetch pipelines
	pipelines, err := pl.client.GetPipelines(projectInfo, limit)
	if err != nil {
		return PipelineLoadResult{
			Error: fmt.Sprintf("Failed to fetch pipelines: %v", err),
		}
	}

	// Sort pipelines by creation time (newest first) - API should already return them sorted
	sort.Slice(pipelines, func(i, j int) bool {
		return pipelines[i].CreatedAt.After(pipelines[j].CreatedAt)
	})

	return PipelineLoadResult{
		Pipelines: pipelines,
		Error:     "", // No error
	}
}

// LoadPipelineJobs loads jobs for a specific pipeline with full error handling
func (pl *PipelineLoader) LoadPipelineJobs(repositoryURL string, pipelineID int) JobsLoadResult {
	if repositoryURL == "" {
		return JobsLoadResult{
			PipelineID: pipelineID,
			Error:      "No repository URL provided",
		}
	}

	// Extract project information
	projectInfo, err := ExtractProjectInfo(repositoryURL)
	if err != nil {
		return JobsLoadResult{
			PipelineID: pipelineID,
			Error:      fmt.Sprintf("Invalid repository URL: %v", err),
		}
	}

	// Fetch jobs for this pipeline
	jobs, err := pl.client.GetPipelineJobs(projectInfo, pipelineID)
	if err != nil {
		return JobsLoadResult{
			PipelineID: pipelineID,
			Error:      fmt.Sprintf("Failed to fetch jobs: %v", err),
		}
	}

	return JobsLoadResult{
		PipelineID: pipelineID,
		Jobs:       jobs,
		Error:      "",
	}
}

// TestSummaryLoadResult represents the result of loading test summary for a pipeline
type TestSummaryLoadResult struct {
	PipelineID  int
	TestSummary *TestSummary
	Error       string
}

// JobLogsLoadResult represents the result of loading job logs
type JobLogsLoadResult struct {
	JobID int
	Logs  string
	Error string
}

// LoadJobLogs loads logs for a specific job with full error handling
func (pl *PipelineLoader) LoadJobLogs(repositoryURL string, jobID int) JobLogsLoadResult {
	if repositoryURL == "" {
		return JobLogsLoadResult{
			JobID: jobID,
			Error: "No repository URL provided",
		}
	}

	// Extract project information
	projectInfo, err := ExtractProjectInfo(repositoryURL)
	if err != nil {
		return JobLogsLoadResult{
			JobID: jobID,
			Error: fmt.Sprintf("Invalid repository URL: %v", err),
		}
	}

	// Fetch logs for this job
	logs, err := pl.client.GetJobLogs(projectInfo, jobID)
	if err != nil {
		return JobLogsLoadResult{
			JobID: jobID,
			Error: fmt.Sprintf("Failed to fetch job logs: %v", err),
		}
	}

	return JobLogsLoadResult{
		JobID: jobID,
		Logs:  logs,
		Error: "",
	}
}

// JobRestartResult represents the result of restarting a job
type JobRestartResult struct {
	JobID int
	Error string
}

// JobCancelResult represents the result of cancelling a job
type JobCancelResult struct {
	JobID int
	Error string
}

// RestartJob restarts a specific job with full error handling
func (pl *PipelineLoader) RestartJob(repositoryURL string, jobID int) JobRestartResult {
	if repositoryURL == "" {
		return JobRestartResult{
			JobID: jobID,
			Error: "No repository URL provided",
		}
	}

	// Extract project information
	projectInfo, err := ExtractProjectInfo(repositoryURL)
	if err != nil {
		return JobRestartResult{
			JobID: jobID,
			Error: fmt.Sprintf("Invalid repository URL: %v", err),
		}
	}

	// Restart the job
	err = pl.client.RestartJob(projectInfo, jobID)
	if err != nil {
		return JobRestartResult{
			JobID: jobID,
			Error: fmt.Sprintf("Failed to restart job: %v", err),
		}
	}

	return JobRestartResult{
		JobID: jobID,
		Error: "",
	}
}

// CancelJob cancels a specific job with full error handling
func (pl *PipelineLoader) CancelJob(repositoryURL string, jobID int) JobCancelResult {
	if repositoryURL == "" {
		return JobCancelResult{
			JobID: jobID,
			Error: "No repository URL provided",
		}
	}

	// Extract project information
	projectInfo, err := ExtractProjectInfo(repositoryURL)
	if err != nil {
		return JobCancelResult{
			JobID: jobID,
			Error: fmt.Sprintf("Invalid repository URL: %v", err),
		}
	}

	// Cancel the job
	err = pl.client.CancelJob(projectInfo, jobID)
	if err != nil {
		return JobCancelResult{
			JobID: jobID,
			Error: fmt.Sprintf("Failed to cancel job: %v", err),
		}
	}

	return JobCancelResult{
		JobID: jobID,
		Error: "",
	}
}

// LoadTestSummary loads test summary for a specific pipeline with full error handling
func (pl *PipelineLoader) LoadTestSummary(repositoryURL string, pipelineID int) TestSummaryLoadResult {
	if repositoryURL == "" {
		return TestSummaryLoadResult{
			PipelineID: pipelineID,
			Error:      "No repository URL provided",
		}
	}

	// Extract project information
	projectInfo, err := ExtractProjectInfo(repositoryURL)
	if err != nil {
		return TestSummaryLoadResult{
			PipelineID: pipelineID,
			Error:      fmt.Sprintf("Invalid repository URL: %v", err),
		}
	}

	// Fetch test summary for this pipeline
	testSummary, err := pl.client.GetTestSummary(projectInfo, pipelineID)
	if err != nil {
		return TestSummaryLoadResult{
			PipelineID: pipelineID,
			Error:      fmt.Sprintf("Failed to fetch test summary: %v", err),
		}
	}

	return TestSummaryLoadResult{
		PipelineID:  pipelineID,
		TestSummary: testSummary, // May be nil if no tests available
		Error:       "",
	}
}

// ValidateConnection tests the GitLab API connection and authentication
func (c *client) ValidateConnection() error {
	// Try to get user info to validate connection and authentication
	apiURL := fmt.Sprintf("%s/api/v4/user", c.baseURL)

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create validation request: %w", err)
	}

	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		// Check for common network errors
		if strings.Contains(err.Error(), "no such host") {
			return fmt.Errorf("GitLab server not found - check if %s is accessible", c.baseURL)
		}
		if strings.Contains(err.Error(), "connection refused") {
			return fmt.Errorf("connection refused - GitLab server may be down at %s", c.baseURL)
		}
		if strings.Contains(err.Error(), "timeout") {
			return fmt.Errorf("connection timeout - GitLab server at %s is not responding", c.baseURL)
		}
		return fmt.Errorf("failed to connect to GitLab API at %s: %w", c.baseURL, err)
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusUnauthorized:
		return fmt.Errorf("GitLab authentication failed - check your token and permissions")
	case http.StatusForbidden:
		return fmt.Errorf("GitLab access forbidden - token may lack required permissions")
	case http.StatusNotFound:
		return fmt.Errorf("GitLab API endpoint not found - check server URL: %s", c.baseURL)
	case http.StatusTooManyRequests:
		return fmt.Errorf("GitLab API rate limit exceeded - please try again later")
	case http.StatusInternalServerError:
		return fmt.Errorf("GitLab server error - please try again later")
	case http.StatusOK:
		return nil // Success
	default:
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("GitLab API validation failed with status %d: %s", resp.StatusCode, string(body))
	}
}

// SearchProjects searches for GitLab projects the authenticated user has access to.
func (c *client) SearchProjects(query string, limit int) ([]SearchResult, error) {
	if limit <= 0 {
		limit = 20
	}

	params := url.Values{}
	params.Set("search", query)
	params.Set("membership", "true")
	params.Set("per_page", fmt.Sprintf("%d", limit))
	params.Set("order_by", "last_activity_at")

	apiURL := fmt.Sprintf("%s/api/v4/projects?%s", c.baseURL, params.Encode())

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitLab API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var projects []struct {
		Name              string `json:"name"`
		PathWithNamespace string `json:"path_with_namespace"`
		HTTPURLToRepo     string `json:"http_url_to_repo"`
		DefaultBranch     string `json:"default_branch"`
	}

	if err := json.Unmarshal(body, &projects); err != nil {
		return nil, fmt.Errorf("failed to parse JSON response: %w", err)
	}

	results := make([]SearchResult, 0, len(projects))
	for _, p := range projects {
		results = append(results, SearchResult{
			Name:          p.Name,
			FullPath:      p.PathWithNamespace,
			HTTPURL:       p.HTTPURLToRepo,
			DefaultBranch: p.DefaultBranch,
		})
	}

	return results, nil
}

// GetJobLogs fetches the log/trace for a specific job
func (c *client) GetJobLogs(projectInfo *ProjectInfo, jobID int) (string, error) {
	if projectInfo == nil {
		return "", fmt.Errorf("project info is nil")
	}

	// URL encode the project path (namespace/project)
	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", projectInfo.Namespace, projectInfo.Project))

	// Construct API URL for job trace
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/jobs/%d/trace", c.baseURL, projectPath, jobID)

	// Create request
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// Add authentication header
	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "text/plain")

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Handle different response codes
	switch resp.StatusCode {
	case http.StatusOK:
		// Read the job logs
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return "", fmt.Errorf("failed to read job logs: %w", err)
		}
		return string(body), nil
	case http.StatusNotFound:
		return "", fmt.Errorf("job not found or logs not available")
	case http.StatusUnauthorized:
		return "", fmt.Errorf("GitLab authentication failed - check your token")
	case http.StatusForbidden:
		return "", fmt.Errorf("access forbidden - token may lack permissions for project %s/%s", projectInfo.Namespace, projectInfo.Project)
	default:
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("GitLab API request failed with status %d: %s", resp.StatusCode, string(body))
	}
}

func (c *client) StreamJobLogs(ctx context.Context, projectInfo *ProjectInfo, jobID int) (chan string, error) {
	if projectInfo == nil {
		return nil, fmt.Errorf("project info is nil")
	}

	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", projectInfo.Namespace, projectInfo.Project))
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/jobs/%d/trace", c.baseURL, projectPath, jobID)

	lineCh := make(chan string, 64)

	go func() {
		defer close(lineCh)

		var offset int64
		pollInterval := 3 * time.Second

		for {
			select {
			case <-ctx.Done():
				return
			default:
			}

			req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
			if err != nil {
				log.Printf("[ERROR] StreamJobLogs: failed to create request: %v", err)
				return
			}
			req.Header.Set("PRIVATE-TOKEN", c.token)
			req.Header.Set("User-Agent", "devenv-cli")
			req.Header.Set("Accept", "text/plain")
			if offset > 0 {
				req.Header.Set("Range", fmt.Sprintf("bytes=%d-", offset))
			}

			resp, err := c.httpClient.Do(req)
			if err != nil {
				if ctx.Err() != nil {
					return
				}
				log.Printf("[ERROR] StreamJobLogs: request failed: %v", err)
				return
			}

			if resp.StatusCode == http.StatusRequestedRangeNotSatisfiable {
				resp.Body.Close()
				select {
				case <-ctx.Done():
					return
				case <-time.After(pollInterval):
					continue
				}
			}

			if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusPartialContent {
				resp.Body.Close()
				log.Printf("[ERROR] StreamJobLogs: unexpected status %d", resp.StatusCode)
				return
			}

			body, err := io.ReadAll(resp.Body)
			resp.Body.Close()
			if err != nil {
				if ctx.Err() != nil {
					return
				}
				log.Printf("[ERROR] StreamJobLogs: failed to read body: %v", err)
				return
			}

			if len(body) > 0 {
				offset += int64(len(body))
				chunk := string(body)
				lines := strings.Split(chunk, "\n")
				for _, line := range lines {
					if line == "" {
						continue
					}
					select {
					case lineCh <- line:
					case <-ctx.Done():
						return
					}
				}
			}

			if interval := resp.Header.Get("X-GitLab-Trace-Update-Interval"); interval != "" {
				if secs, err := strconv.Atoi(interval); err == nil && secs > 0 {
					pollInterval = time.Duration(secs) * time.Second
				}
			}

			select {
			case <-ctx.Done():
				return
			case <-time.After(pollInterval):
			}
		}
	}()

	return lineCh, nil
}

func (c *client) GetTestSummary(projectInfo *ProjectInfo, pipelineID int) (*TestSummary, error) {
	// Build API URL for test reports
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/pipelines/%d/test_report",
		c.baseURL,
		url.QueryEscape(fmt.Sprintf("%s/%s", projectInfo.Namespace, projectInfo.Project)),
		pipelineID)

	// Create request with shorter timeout for test reports
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add authentication header
	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		// Be more specific about timeout errors
		if strings.Contains(err.Error(), "timeout") {
			return nil, fmt.Errorf("test report request timed out - API may not be available")
		}
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Handle different response codes
	switch resp.StatusCode {
	case http.StatusOK:
		// Parse the test report response
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to read test report response: %w", err)
		}

		// GitLab test report has this structure
		var testReport struct {
			TotalTime    float64     `json:"total_time"`
			TotalCount   int         `json:"total_count"`
			SuccessCount int         `json:"success_count"`
			FailedCount  int         `json:"failed_count"`
			SkippedCount int         `json:"skipped_count"`
			ErrorCount   int         `json:"error_count"`
			TestSuites   []TestSuite `json:"test_suites"`
		}

		if err := json.Unmarshal(body, &testReport); err != nil {
			return nil, fmt.Errorf("failed to parse test report JSON: %w", err)
		}

		// Group failing tests by class name
		classToFailedTests := make(map[string][]string)
		var failedTests []string // Keep legacy field for backward compatibility
		maxFailingTests := 3

		for _, suite := range testReport.TestSuites {
			for _, testCase := range suite.TestCases {
				if testCase.Status == "failed" || testCase.Status == "error" {
					// Determine the class name without package prefix
					className := testCase.Classname
					if className == "" {
						// If no classname, use suite name or "Unknown"
						className = suite.Name
						if className == "" {
							className = "Unknown"
						}
					}

					// Extract just the class name from full package path (e.g., com.example.TestClass -> TestClass)
					if strings.Contains(className, ".") {
						parts := strings.Split(className, ".")
						className = parts[len(parts)-1] // Take the last part
					}

					// Get the test method name
					methodName := testCase.Name

					// Group by class name
					classToFailedTests[className] = append(classToFailedTests[className], methodName)

					// Also maintain legacy failedTests list (first 3 for backward compatibility)
					if len(failedTests) < maxFailingTests {
						failedTests = append(failedTests, methodName)
					}
				}
			}
		}

		// Convert map to FailedTestGroup slice
		var failedTestGroups []FailedTestGroup
		for className, methods := range classToFailedTests {
			failedTestGroups = append(failedTestGroups, FailedTestGroup{
				ClassName:   className,
				TestMethods: methods,
			})
		}

		// Sort groups by class name for consistent display
		sort.Slice(failedTestGroups, func(i, j int) bool {
			return failedTestGroups[i].ClassName < failedTestGroups[j].ClassName
		})

		return &TestSummary{
			Total:            testReport.TotalCount,
			Success:          testReport.SuccessCount,
			Failed:           testReport.FailedCount,
			Skipped:          testReport.SkippedCount,
			Error:            testReport.ErrorCount,
			TestSuites:       testReport.TestSuites,
			FailedTests:      failedTests,      // Legacy field
			FailedTestGroups: failedTestGroups, // New grouped tests
		}, nil
	case http.StatusNotFound:
		// No test report available - this is normal for pipelines without tests
		return nil, nil
	case http.StatusUnauthorized:
		return nil, fmt.Errorf("GitLab authentication failed - check your token")
	case http.StatusForbidden:
		return nil, fmt.Errorf("access forbidden - token may lack permissions for project %s/%s", projectInfo.Namespace, projectInfo.Project)
	case http.StatusNotImplemented:
		// Some GitLab instances might not support test reports API
		return nil, nil
	default:
		// For unknown errors, return nil instead of error to avoid blocking UI
		// This makes test reports a nice-to-have feature rather than required
		return nil, nil
	}
}

// RestartJob restarts/retries a specific job
func (c *client) RestartJob(projectInfo *ProjectInfo, jobID int) error {
	if projectInfo == nil {
		return fmt.Errorf("project info is nil")
	}

	// URL encode the project path (namespace/project)
	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", projectInfo.Namespace, projectInfo.Project))

	// Construct API URL for job retry
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/jobs/%d/retry", c.baseURL, projectPath, jobID)

	// Create request
	req, err := http.NewRequest("POST", apiURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Add authentication header
	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Handle different response codes
	switch resp.StatusCode {
	case http.StatusCreated:
		// Job restart was successful
		return nil
	case http.StatusNotFound:
		return fmt.Errorf("job not found or cannot be restarted")
	case http.StatusUnauthorized:
		return fmt.Errorf("GitLab authentication failed - check your token")
	case http.StatusForbidden:
		return fmt.Errorf("access forbidden - you may not have permission to restart jobs in project %s/%s", projectInfo.Namespace, projectInfo.Project)
	case http.StatusBadRequest:
		return fmt.Errorf("job cannot be restarted (may already be running or in a non-restartable state)")
	default:
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("GitLab API request failed with status %d: %s", resp.StatusCode, string(body))
	}
}

// CancelJob cancels/aborts a specific job
func (c *client) CancelJob(projectInfo *ProjectInfo, jobID int) error {
	if projectInfo == nil {
		return fmt.Errorf("project info is nil")
	}

	// URL encode the project path (namespace/project)
	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", projectInfo.Namespace, projectInfo.Project))

	// Construct API URL for job cancel
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/jobs/%d/cancel", c.baseURL, projectPath, jobID)

	// Create request
	req, err := http.NewRequest("POST", apiURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Add authentication header
	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Handle different response codes
	switch resp.StatusCode {
	case http.StatusCreated:
		// Job cancel was successful
		return nil
	case http.StatusNotFound:
		return fmt.Errorf("job not found or cannot be cancelled")
	case http.StatusUnauthorized:
		return fmt.Errorf("GitLab authentication failed - check your token")
	case http.StatusForbidden:
		return fmt.Errorf("access forbidden - you may not have permission to cancel jobs in project %s/%s", projectInfo.Namespace, projectInfo.Project)
	case http.StatusBadRequest:
		return fmt.Errorf("job cannot be cancelled (may already be finished or in a non-cancellable state)")
	default:
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("GitLab API request failed with status %d: %s", resp.StatusCode, string(body))
	}
}

// GetMRChanges fetches the list of changed files in a merge request
func (c *client) GetMRChanges(projectInfo *ProjectInfo, mrIID int) ([]MRChange, error) {
	if projectInfo == nil {
		return nil, fmt.Errorf("project info is nil")
	}

	// URL encode the project path (namespace/project)
	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", projectInfo.Namespace, projectInfo.Project))

	// Construct API URL for MR changes
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/merge_requests/%d/changes", c.baseURL, projectPath, mrIID)

	// Create request
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add authentication header
	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Handle different response codes
	switch resp.StatusCode {
	case http.StatusOK:
		// Parse response
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to read response body: %w", err)
		}

		// The API returns a single MR object with changes array and diff_refs
		var mrWithChanges struct {
			Changes  []MRChange `json:"changes"`
			DiffRefs struct {
				BaseSHA  string `json:"base_sha"`
				HeadSHA  string `json:"head_sha"`
				StartSHA string `json:"start_sha"`
			} `json:"diff_refs"`
		}

		if err := json.Unmarshal(body, &mrWithChanges); err != nil {
			return nil, fmt.Errorf("failed to parse response: %w", err)
		}

		// Calculate lines added/deleted and parse diff lines with line codes for each change
		for i := range mrWithChanges.Changes {
			mrWithChanges.Changes[i].calculateLineStats()
			mrWithChanges.Changes[i].parseDiffLines(mrWithChanges.DiffRefs.BaseSHA)
			log.Printf("[DEBUG] Parsed %d diff lines for %s (base_sha: %s)",
				len(mrWithChanges.Changes[i].DiffLines),
				mrWithChanges.Changes[i].NewPath,
				mrWithChanges.DiffRefs.BaseSHA)
		}

		return mrWithChanges.Changes, nil
	case http.StatusNotFound:
		return nil, fmt.Errorf("merge request not found")
	case http.StatusUnauthorized:
		return nil, fmt.Errorf("GitLab authentication failed - check your token")
	case http.StatusForbidden:
		return nil, fmt.Errorf("access forbidden - you may not have permission to view this merge request")
	default:
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitLab API request failed with status %d: %s", resp.StatusCode, string(body))
	}
}

// CloseMergeRequest closes a merge request
func (c *client) CloseMergeRequest(projectInfo *ProjectInfo, mrIID int) error {
	if projectInfo == nil {
		return fmt.Errorf("project info is nil")
	}

	// URL encode the project path (namespace/project)
	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", projectInfo.Namespace, projectInfo.Project))

	// Construct API URL with state_event parameter
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/merge_requests/%d", c.baseURL, projectPath, mrIID)

	// Create request body with state_event=close
	reqBody := strings.NewReader("state_event=close")

	// Create request
	req, err := http.NewRequest("PUT", apiURL, reqBody)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Add authentication header
	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Handle different response codes
	switch resp.StatusCode {
	case http.StatusOK:
		// MR successfully closed
		return nil
	case http.StatusNotFound:
		return fmt.Errorf("merge request not found")
	case http.StatusUnauthorized:
		return fmt.Errorf("GitLab authentication failed - check your token")
	case http.StatusForbidden:
		return fmt.Errorf("access forbidden - you may not have permission to close this merge request")
	case http.StatusBadRequest:
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("cannot close merge request: %s", string(body))
	default:
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("GitLab API request failed with status %d: %s", resp.StatusCode, string(body))
	}
}

// RebaseMergeRequest triggers a rebase operation on a merge request
func (c *client) RebaseMergeRequest(projectInfo *ProjectInfo, mrIID int) error {
	if projectInfo == nil {
		return fmt.Errorf("project info is nil")
	}

	// URL encode the project path (namespace/project)
	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", projectInfo.Namespace, projectInfo.Project))

	// Construct API URL for rebasing MR
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/merge_requests/%d/rebase", c.baseURL, projectPath, mrIID)

	// Create request
	req, err := http.NewRequest("PUT", apiURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Add authentication header
	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Handle different response codes
	switch resp.StatusCode {
	case http.StatusOK, http.StatusAccepted:
		// Rebase successfully triggered (202 Accepted means it's queued)
		return nil
	case http.StatusNotFound:
		return fmt.Errorf("merge request not found")
	case http.StatusUnauthorized:
		return fmt.Errorf("GitLab authentication failed - check your token")
	case http.StatusForbidden:
		return fmt.Errorf("access forbidden - you may not have permission to rebase this merge request")
	case http.StatusBadRequest:
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("cannot rebase merge request: %s", string(body))
	case http.StatusConflict:
		return fmt.Errorf("rebase already in progress")
	default:
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("GitLab API request failed with status %d: %s", resp.StatusCode, string(body))
	}
}

// ApproveMergeRequest approves a merge request
func (c *client) ApproveMergeRequest(projectInfo *ProjectInfo, mrIID int) error {
	if projectInfo == nil {
		return fmt.Errorf("project info is nil")
	}

	// URL encode the project path (namespace/project)
	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", projectInfo.Namespace, projectInfo.Project))

	// Construct API URL for approving MR
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/merge_requests/%d/approve", c.baseURL, projectPath, mrIID)

	// Create request
	req, err := http.NewRequest("POST", apiURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Add authentication header
	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Handle different response codes
	switch resp.StatusCode {
	case http.StatusOK, http.StatusCreated:
		// Approval successfully added
		return nil
	case http.StatusNotFound:
		return fmt.Errorf("merge request not found")
	case http.StatusUnauthorized:
		return fmt.Errorf("GitLab authentication failed - check your token")
	case http.StatusForbidden:
		return fmt.Errorf("access forbidden - you may not have permission to approve this merge request")
	case http.StatusConflict:
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("cannot approve merge request: %s", string(body))
	case http.StatusBadRequest:
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("cannot approve merge request: %s", string(body))
	default:
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("GitLab API request failed with status %d: %s", resp.StatusCode, string(body))
	}
}

// UnapproveMergeRequest removes an approval from a merge request
func (c *client) UnapproveMergeRequest(projectInfo *ProjectInfo, mrIID int) error {
	if projectInfo == nil {
		return fmt.Errorf("project info is nil")
	}

	// URL encode the project path (namespace/project)
	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", projectInfo.Namespace, projectInfo.Project))

	// Construct API URL for unapproving MR
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/merge_requests/%d/unapprove", c.baseURL, projectPath, mrIID)

	// Create request
	req, err := http.NewRequest("POST", apiURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Add authentication header
	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Handle different response codes
	switch resp.StatusCode {
	case http.StatusOK, http.StatusCreated:
		// Approval successfully removed
		log.Printf("[DEBUG] UnapproveMergeRequest: Success (status %d)", resp.StatusCode)
		return nil
	case http.StatusNotFound:
		log.Printf("[DEBUG] UnapproveMergeRequest: NotFound (status 404)")
		return fmt.Errorf("merge request not found")
	case http.StatusUnauthorized:
		log.Printf("[DEBUG] UnapproveMergeRequest: Unauthorized (status 401)")
		return fmt.Errorf("GitLab authentication failed - check your token")
	case http.StatusForbidden:
		log.Printf("[DEBUG] UnapproveMergeRequest: Forbidden (status 403)")
		return fmt.Errorf("access forbidden - you may not have permission to unapprove this merge request")
	case http.StatusConflict:
		body, _ := io.ReadAll(resp.Body)
		log.Printf("[DEBUG] UnapproveMergeRequest: Conflict (status 409): %s", string(body))
		return fmt.Errorf("cannot unapprove merge request: %s", string(body))
	case http.StatusBadRequest:
		body, _ := io.ReadAll(resp.Body)
		log.Printf("[DEBUG] UnapproveMergeRequest: BadRequest (status 400): %s", string(body))
		return fmt.Errorf("cannot unapprove merge request: %s", string(body))
	default:
		body, _ := io.ReadAll(resp.Body)
		log.Printf("[DEBUG] UnapproveMergeRequest: Unknown status %d: %s", resp.StatusCode, string(body))
		return fmt.Errorf("GitLab API request failed with status %d: %s", resp.StatusCode, string(body))
	}
}

// ToggleMRApproval toggles the approval status of a merge request
// If the user has already approved, it removes the approval; otherwise it adds it
func (c *client) ToggleMRApproval(projectInfo *ProjectInfo, mrIID int, currentUsername string) error {
	if projectInfo == nil {
		return fmt.Errorf("project info is nil")
	}

	// Get current MR details to check approval status
	mr, err := c.GetMergeRequest(projectInfo, mrIID)
	if err != nil {
		return fmt.Errorf("failed to get merge request details: %w", err)
	}

	// Debug: Log approval details
	log.Printf("[DEBUG] ToggleMRApproval: currentUsername=%s", currentUsername)
	if mr.Approvals != nil {
		log.Printf("[DEBUG] MR has %d approvals", len(mr.Approvals.ApprovedBy))
		for i, approval := range mr.Approvals.ApprovedBy {
			log.Printf("[DEBUG] Approval[%d]: username=%s, name=%s", i, approval.User.Username, approval.User.Name)
		}
	} else {
		log.Printf("[DEBUG] MR Approvals is nil")
	}

	// Check if current user has already approved
	// Compare against both username (login ID like "F19918") and name (display name like "Kellner, Fabian")
	alreadyApproved := false
	if mr.Approvals != nil {
		for _, approval := range mr.Approvals.ApprovedBy {
			if approval.User.Username == currentUsername || approval.User.Name == currentUsername {
				log.Printf("[DEBUG] Match found: comparing '%s' with username='%s' or name='%s'",
					currentUsername, approval.User.Username, approval.User.Name)
				alreadyApproved = true
				break
			}
		}
	}

	log.Printf("[DEBUG] alreadyApproved=%v", alreadyApproved)

	// Toggle based on current state
	if alreadyApproved {
		log.Printf("[DEBUG] Calling UnapproveMergeRequest")
		return c.UnapproveMergeRequest(projectInfo, mrIID)
	}
	log.Printf("[DEBUG] Calling ApproveMergeRequest")
	return c.ApproveMergeRequest(projectInfo, mrIID)
}

// DiffPosition represents the position information for a diff comment
type DiffPosition struct {
	BaseSHA      string `json:"base_sha"`
	HeadSHA      string `json:"head_sha"`
	StartSHA     string `json:"start_sha"`
	PositionType string `json:"position_type"` // "text", "image", or "file"
	NewPath      string `json:"new_path"`
	OldPath      string `json:"old_path"`
	NewLine      *int   `json:"new_line,omitempty"` // For added or context lines
	OldLine      *int   `json:"old_line,omitempty"` // For removed or context lines
}

// CreateMRDiffComment creates a new diff comment on a merge request
func (c *client) CreateMRDiffComment(projectInfo *ProjectInfo, mrIID int, body string, position *DiffPosition) error {
	if projectInfo == nil {
		return fmt.Errorf("project info is nil")
	}

	// URL encode the project path (namespace/project)
	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", projectInfo.Namespace, projectInfo.Project))

	// Construct API URL for creating MR discussion
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/merge_requests/%d/discussions", c.baseURL, projectPath, mrIID)

	// Prepare request payload
	payload := map[string]interface{}{
		"body": body,
	}

	// Add position if provided (for diff comments)
	if position != nil {
		posMap := map[string]interface{}{
			"base_sha":      position.BaseSHA,
			"head_sha":      position.HeadSHA,
			"start_sha":     position.StartSHA,
			"position_type": position.PositionType,
			"new_path":      position.NewPath,
			"old_path":      position.OldPath,
		}
		if position.NewLine != nil {
			posMap["new_line"] = *position.NewLine
		}
		if position.OldLine != nil {
			posMap["old_line"] = *position.OldLine
		}
		payload["position"] = posMap
	}

	// Marshal payload to JSON
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal request payload: %w", err)
	}

	// Create request
	req, err := http.NewRequest("POST", apiURL, strings.NewReader(string(jsonPayload)))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Add authentication header
	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Handle different response codes
	switch resp.StatusCode {
	case http.StatusCreated:
		// Comment successfully created
		return nil
	case http.StatusNotFound:
		return fmt.Errorf("merge request not found")
	case http.StatusUnauthorized:
		return fmt.Errorf("GitLab authentication failed - check your token")
	case http.StatusForbidden:
		return fmt.Errorf("access forbidden - you may not have permission to comment on this merge request")
	case http.StatusBadRequest:
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("cannot create comment: %s", string(body))
	default:
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("GitLab API request failed with status %d: %s", resp.StatusCode, string(body))
	}
}

// GetMRDiscussions fetches all discussions (comment threads) for a merge request
func (c *client) GetMRDiscussions(projectInfo *ProjectInfo, mrIID int) ([]Discussion, error) {
	if projectInfo == nil {
		return nil, fmt.Errorf("project info is nil")
	}

	// URL encode the project path (namespace/project)
	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", projectInfo.Namespace, projectInfo.Project))

	// Construct API URL for fetching discussions
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/merge_requests/%d/discussions", c.baseURL, projectPath, mrIID)

	// Create request
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add authentication header
	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitLab API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Read and parse response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var discussions []Discussion
	if err := json.Unmarshal(body, &discussions); err != nil {
		return nil, fmt.Errorf("failed to unmarshal discussions: %w", err)
	}

	log.Printf("[DEBUG] Fetched %d discussions for MR %d", len(discussions), mrIID)
	return discussions, nil
}

// ReplyToDiscussion adds a reply note to an existing discussion
func (c *client) ReplyToDiscussion(projectInfo *ProjectInfo, mrIID int, discussionID string, body string) error {
	if projectInfo == nil {
		return fmt.Errorf("project info is nil")
	}

	// URL encode the project path (namespace/project)
	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", projectInfo.Namespace, projectInfo.Project))

	// Construct API URL for adding note to discussion
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/merge_requests/%d/discussions/%s/notes",
		c.baseURL, projectPath, mrIID, discussionID)

	// Prepare request payload
	payload := map[string]interface{}{
		"body": body,
	}

	// Marshal payload to JSON
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal request payload: %w", err)
	}

	// Create request
	req, err := http.NewRequest("POST", apiURL, strings.NewReader(string(jsonPayload)))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Add authentication header
	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("GitLab API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	log.Printf("[DEBUG] Reply added to discussion %s for MR %d", discussionID, mrIID)
	return nil
}

// ResolveDiscussion resolves or unresolves a discussion thread
func (c *client) ResolveDiscussion(projectInfo *ProjectInfo, mrIID int, discussionID string, resolved bool) error {
	if projectInfo == nil {
		return fmt.Errorf("project info is nil")
	}

	// URL encode the project path (namespace/project)
	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", projectInfo.Namespace, projectInfo.Project))

	// Construct API URL for resolving discussion
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/merge_requests/%d/discussions/%s",
		c.baseURL, projectPath, mrIID, discussionID)

	// Prepare request payload
	payload := map[string]interface{}{
		"resolved": resolved,
	}

	// Marshal payload to JSON
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal request payload: %w", err)
	}

	// Create request
	req, err := http.NewRequest("PUT", apiURL, strings.NewReader(string(jsonPayload)))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Add authentication header
	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("GitLab API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	action := "resolved"
	if !resolved {
		action = "unresolved"
	}
	log.Printf("[DEBUG] Discussion %s %s for MR %d", discussionID, action, mrIID)
	return nil
}

// GetMRVersions fetches the diff versions for a merge request (needed for getting SHAs)
// Falls back to MR details if versions endpoint is not available
func (c *client) GetMRVersions(projectInfo *ProjectInfo, mrIID int) ([]map[string]interface{}, error) {
	if projectInfo == nil {
		return nil, fmt.Errorf("project info is nil")
	}

	// URL encode the project path (namespace/project)
	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", projectInfo.Namespace, projectInfo.Project))

	// Try the versions endpoint first
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/merge_requests/%d/versions", c.baseURL, projectPath, mrIID)

	// Create request
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add authentication header
	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Handle different response codes
	switch resp.StatusCode {
	case http.StatusOK:
		// Parse response
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to read response body: %w", err)
		}

		var versions []map[string]interface{}
		if err := json.Unmarshal(body, &versions); err != nil {
			return nil, fmt.Errorf("failed to parse response: %w", err)
		}

		return versions, nil
	case http.StatusNotFound:
		// Versions endpoint not available - fall back to MR details
		return c.getMRVersionsFromDetails(projectInfo, mrIID)
	case http.StatusUnauthorized:
		return nil, fmt.Errorf("GitLab authentication failed - check your token")
	case http.StatusForbidden:
		return nil, fmt.Errorf("access forbidden - you may not have permission to view this merge request")
	default:
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitLab API request failed with status %d: %s", resp.StatusCode, string(body))
	}
}

// getMRVersionsFromDetails fallback: gets SHAs from MR details endpoint
func (c *client) getMRVersionsFromDetails(projectInfo *ProjectInfo, mrIID int) ([]map[string]interface{}, error) {
	projectPath := url.QueryEscape(fmt.Sprintf("%s/%s", projectInfo.Namespace, projectInfo.Project))
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/merge_requests/%d", c.baseURL, projectPath, mrIID)

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("PRIVATE-TOKEN", c.token)
	req.Header.Set("User-Agent", "devenv-cli")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to fetch MR details (status %d): %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var mr map[string]interface{}
	if err := json.Unmarshal(body, &mr); err != nil {
		return nil, fmt.Errorf("failed to parse MR details: %w", err)
	}

	// Extract SHAs from MR details
	diffRefs, ok := mr["diff_refs"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("diff_refs not found in MR details")
	}

	baseSHA, _ := diffRefs["base_sha"].(string)
	headSHA, _ := diffRefs["head_sha"].(string)
	startSHA, _ := diffRefs["start_sha"].(string)

	// Create a fake "version" object that matches the structure expected by the frontend
	version := map[string]interface{}{
		"base_commit_sha":  baseSHA,
		"head_commit_sha":  headSHA,
		"start_commit_sha": startSHA,
	}

	return []map[string]interface{}{version}, nil
}
