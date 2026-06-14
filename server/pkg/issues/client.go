// Package issues provides a unified interface for issue operations
// across different Git providers (GitHub, GitLab, etc.).
package issues

// IssueListOptions holds pagination and filter options for listing issues.
type IssueListOptions struct {
	Scope   string
	State   string
	Search  string
	Page    int
	PerPage int
}

// RepoInfo holds repository identification for a Git provider.
type RepoInfo struct {
	Owner     string
	Repo      string
	Host      string
	Namespace string
	Project   string
}

// Client is the unified interface for issue operations across providers.
type Client interface {
	GetIssues(info *RepoInfo, options *IssueListOptions) (*IssueListResult, error)
	GetIssue(info *RepoInfo, number int) (*Issue, error)
	GetIssueComments(info *RepoInfo, number int) (*IssueCommentListResult, error)
}
