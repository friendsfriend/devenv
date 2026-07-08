package server

import (
	"encoding/json"
	"net/http"
)

func (s *Server) registerRoutes(mux *http.ServeMux) {
	s.registerAppRoutes(mux)
	s.registerDockerRoutes(mux)
	s.registerKubernetesRoutes(mux)
	s.registerLogRoutes(mux)
	s.registerGitRoutes(mux)
	s.registerActionRoutes(mux)
	s.registerGitLabRoutes(mux)
	s.registerGitHubRoutes(mux)
	s.registerAIRoutes(mux)
	s.registerProviderRoutes(mux)
	s.registerRepositoryRoutes(mux)
	s.registerScriptRoutes(mux)
	mux.HandleFunc("/api/pi-sessions", s.handleGetPiSessions)
	mux.HandleFunc("/api/events", s.handleEvents)
	mux.HandleFunc("/api/health", s.handleHealth)
}

func (s *Server) registerAppRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/apps", s.handleGetApps)
	mux.HandleFunc("/api/infra-services", s.handleGetInfraServices)
	mux.HandleFunc("/api/infra-services/{ident}/start", s.handleInfraServiceStart)
	mux.HandleFunc("/api/infra-services/{ident}/stop", s.handleInfraServiceStop)
	mux.HandleFunc("/api/infra-services/{ident}/logs", s.handleInfraServiceLogs)
	mux.HandleFunc("/api/status", s.handleGetStatus)
	mux.HandleFunc("/api/apps/{ident}/docker", s.handleGetDockerInfo)
	mux.HandleFunc("/api/apps/{ident}/git", s.handleGetGitInfo)
	mux.HandleFunc("/api/apps/create", s.handleCreateApp)
	mux.HandleFunc("/api/example-config", s.handleCreateExampleConfig)
	mux.HandleFunc("/api/apps/{ident}/delete", s.handleDeleteApp)
	mux.HandleFunc("/api/apps/{ident}/profiles", s.handleGetProfiles)
	mux.HandleFunc("/api/apps/{ident}/actions/{action}/targets", s.handleGetActionTargets)
}

func (s *Server) registerDockerRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/docker/start", s.handleDockerStart)
	mux.HandleFunc("/api/docker/stop", s.handleDockerStop)
	mux.HandleFunc("/api/docker/restart", s.handleDockerRestart)
	mux.HandleFunc("/api/docker/logs", s.handleDockerLogs)
	mux.HandleFunc("/api/docker/logs/stream", s.handleDockerLogsStream)
	mux.HandleFunc("/api/docker/stats/stream", s.handleDockerStatsStream)
}

func (s *Server) registerKubernetesRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/kubernetes/logs", s.handleKubernetesLogs)
	mux.HandleFunc("/api/kubernetes/cluster", s.handleKubernetesClusterStatus)
	mux.HandleFunc("/api/kubernetes/cluster/create", s.handleKubernetesClusterCreate)
	mux.HandleFunc("/api/kubernetes/cluster/delete", s.handleKubernetesClusterDelete)
	mux.HandleFunc("/api/kubernetes/cluster/recreate", s.handleKubernetesClusterRecreate)
	mux.HandleFunc("/api/kubernetes/cluster/export-kubeconfig", s.handleKubernetesClusterExport)
	mux.HandleFunc("/api/kubernetes/cluster/refresh", s.handleKubernetesClusterRefresh)
}

func (s *Server) registerLogRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/logs/operation/", s.handleOperationLogs)
	mux.HandleFunc("/api/logs/action/", s.handleActionLog)
	mux.HandleFunc("/api/logs/history/", s.handleLogHistory)
	mux.HandleFunc("/api/logs/status", s.handleStatusLog)
}

func (s *Server) registerGitRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/git/pull", s.handleGitPull)
	mux.HandleFunc("/api/git/push", s.handleGitPush)
	mux.HandleFunc("/api/git/fetch", s.handleGitFetch)
	mux.HandleFunc("/api/git/branches", s.handleGitBranches)
	mux.HandleFunc("/api/git/checkout", s.handleGitCheckout)
	mux.HandleFunc("/api/git/worktrees", s.handleWorktrees)
}

func (s *Server) registerActionRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/actions/start", s.handleStart)
	mux.HandleFunc("/api/actions/build", s.handleBuild)
	mux.HandleFunc("/api/actions/test", s.handleTest)
	mux.HandleFunc("/api/actions/run", s.handleRun)
	mux.HandleFunc("/api/actions/stop", s.handleStopApp)
	mux.HandleFunc("/api/actions/shell-script", s.handleShellActionScript)
}

func (s *Server) registerGitLabRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/gitlab/merge-requests", s.handleGitLabChangeRequests)
	mux.HandleFunc("/api/gitlab/jobs", s.handleGitLabJobs)
	mux.HandleFunc("/api/gitlab/test-summary", s.handleGitLabTestSummary)
	mux.HandleFunc("/api/gitlab/cr-changes", s.handleGitLabChangeRequestChanges)
	mux.HandleFunc("/api/gitlab/cr-versions", s.handleGitLabMRVersions)
	mux.HandleFunc("/api/gitlab/cr-comment", s.handleGitLabMRComment)
	mux.HandleFunc("/api/gitlab/cr-discussions", s.handleGitLabMRDiscussions)
	mux.HandleFunc("/api/gitlab/cr-discussion-reply", s.handleGitLabMRDiscussionReply)
	mux.HandleFunc("/api/gitlab/cr-discussion-resolve", s.handleGitLabMRDiscussionResolve)
	mux.HandleFunc("/api/gitlab/cr-approve", s.handleGitLabMRApprove)
	mux.HandleFunc("/api/gitlab/cr-unapprove", s.handleGitLabMRUnapprove)
	mux.HandleFunc("/api/gitlab/cr-toggle-approval", s.handleGitLabMRToggleApproval)
	mux.HandleFunc("/api/gitlab/cr-rebase", s.handleGitLabMRRebase)
	mux.HandleFunc("/api/gitlab/job-logs", s.handleGitLabJobLogs)
	mux.HandleFunc("/api/gitlab/job-retry", s.handleGitLabJobRetry)
	mux.HandleFunc("/api/gitlab/job-cancel", s.handleGitLabJobCancel)
	mux.HandleFunc("/api/gitlab/issues", s.handleGitLabIssues)
	mux.HandleFunc("/api/gitlab/issue", s.handleGitLabIssueDetail)
	mux.HandleFunc("/api/gitlab/issue-comments", s.handleGitLabIssueComments)
	mux.HandleFunc("/api/gitlab/issues/close", s.handleGitLabCloseIssue)
	mux.HandleFunc("/api/gitlab/issues/reopen", s.handleGitLabReopenIssue)
	mux.HandleFunc("/api/gitlab/issues/labels", s.handleGitLabSetLabels)
	mux.HandleFunc("/api/gitlab/issues/assignee", s.handleGitLabSetAssignee)
	mux.HandleFunc("/api/gitlab/issues/unassign", s.handleGitLabRemoveAssignee)
	mux.HandleFunc("/api/gitlab/issues/comment", s.handleGitLabAddComment)
	mux.HandleFunc("/api/gitlab/issues/linked-crs", s.handleGitLabIssueLinkedCRs)
	mux.HandleFunc("/api/gitlab/issues/references", s.handleGitLabIssueReferencedIssues)
	mux.HandleFunc("/api/gitlab/cr/linked-issues", s.handleGitLabCRLinkedIssues)
	mux.HandleFunc("/api/gitlab/labels", s.handleGitLabRepoLabels)
	mux.HandleFunc("/api/gitlab/collaborators", s.handleGitLabRepoCollaborators)
}

func (s *Server) registerGitHubRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/github/pull-requests", s.handleGitHubPullRequests)
	mux.HandleFunc("/api/github/pull-request", s.handleGitHubPullRequest)
	mux.HandleFunc("/api/github/pr-changes", s.handleGitHubPRChanges)
	mux.HandleFunc("/api/github/pr-discussions", s.handleGitHubPRDiscussions)
	mux.HandleFunc("/api/github/pr-approve", s.handleGitHubPRApprove)
	mux.HandleFunc("/api/github/pr-unapprove", s.handleGitHubPRUnapprove)
	mux.HandleFunc("/api/github/pr-toggle-approval", s.handleGitHubPRToggleApproval)
	mux.HandleFunc("/api/github/actions-jobs", s.handleGitHubActionsJobs)
	mux.HandleFunc("/api/github/actions-test-summary", s.handleGitHubActionsTestSummary)
	mux.HandleFunc("/api/github/actions-job-logs", s.handleGitHubActionsJobLogs)
	mux.HandleFunc("/api/github/issues", s.handleGitHubIssues)
	mux.HandleFunc("/api/github/issue", s.handleGitHubIssueDetail)
	mux.HandleFunc("/api/github/issue-comments", s.handleGitHubIssueComments)
	mux.HandleFunc("/api/github/issues/close", s.handleGitHubCloseIssue)
	mux.HandleFunc("/api/github/issues/reopen", s.handleGitHubReopenIssue)
	mux.HandleFunc("/api/github/issues/labels", s.handleGitHubSetLabels)
	mux.HandleFunc("/api/github/issues/assignee", s.handleGitHubSetAssignee)
	mux.HandleFunc("/api/github/issues/unassign", s.handleGitHubRemoveAssignee)
	mux.HandleFunc("/api/github/issues/comment", s.handleGitHubAddComment)
	mux.HandleFunc("/api/github/issues/linked-crs", s.handleGitHubIssueLinkedCRs)
	mux.HandleFunc("/api/github/issues/references", s.handleGitHubIssueReferencedIssues)
	mux.HandleFunc("/api/github/cr/linked-issues", s.handleGitHubCRLinkedIssues)
	mux.HandleFunc("/api/github/labels", s.handleGitHubRepoLabels)
	mux.HandleFunc("/api/github/collaborators", s.handleGitHubRepoCollaborators)
}

func (s *Server) registerAIRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/ai/analyze-logs", s.handleAIAnalyzeLogs)
	mux.HandleFunc("/api/ai/analyze-logs-stream", s.handleAIAnalyzeLogsStream)
	mux.HandleFunc("/api/ai/cr-review-stream", s.handleAICRReviewStream)
	mux.HandleFunc("/api/ai/cr-comment-callback/", s.handleCRCommentCallback)
}

func (s *Server) registerProviderRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/providers", s.handleProviders)
	mux.HandleFunc("/api/providers/", s.handleProviderByName)
}

func (s *Server) registerRepositoryRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/repos/search", s.handleRepoSearch)
	mux.HandleFunc("/api/repos/branches", s.handleRepoBranches)
}

func (s *Server) registerScriptRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/scripts", s.handleScripts)
	mux.HandleFunc("/api/scripts/create", s.handleCreateScript)
	mux.HandleFunc("/api/scripts/link", s.handleLinkScript)
	mux.HandleFunc("/api/scripts/delete", s.handleDeleteScript)
	mux.HandleFunc("/api/scripts/history", s.handleScriptArgsHistory)
	mux.HandleFunc("/api/scripts/metadata", s.handleScriptMetadataRoute)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "homeDir": s.services.HomeDir()})
}
