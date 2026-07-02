package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/friendsfriend/devenv/pkg/app"
	"github.com/friendsfriend/devenv/pkg/docker"
	"github.com/friendsfriend/devenv/pkg/logging"
	"github.com/friendsfriend/devenv/pkg/services"
	"github.com/friendsfriend/devenv/pkg/status"
)

type Server struct {
	port          int
	services      services.Container
	apps          []app.App
	infraServices []app.InfraService
	listeners     map[chan Event]bool
	listenerMu    sync.RWMutex
	opStatus      map[string]*OperationStatus
	opStatusMu    sync.RWMutex

	opencodeOnce      sync.Once
	opencodeServerURL string
	opencodeServerErr error
	opencodeServerCmd *exec.Cmd

	// MR review sessions: token → session (created per review, cleaned up on stream close)
	mrSessions   map[string]*mrReviewSession
	mrSessionsMu sync.Mutex
}

type OperationStatus struct {
	Operation string `json:"operation"`
	Status    string `json:"status"`
	Message   string `json:"message"`
}

type Event struct {
	Type       string      `json:"type"`
	Properties interface{} `json:"properties"`
	Timestamp  time.Time   `json:"timestamp"`
}

type AppResponse struct {
	Ident              string `json:"ident"`
	DisplayName        string `json:"displayName"`
	LocalDirectoryPath string `json:"localDirectoryPath"`
	RepositoryPath     string `json:"repositoryPath"`
	Branch             string `json:"branch"`
	AppType            string `json:"appType"`
	ContainerBaseName  string `json:"containerBaseName"`
	SourceType         string `json:"sourceType,omitempty"`
	Provider           string `json:"provider,omitempty"`
	ActiveWorktree     string `json:"activeWorktree,omitempty"`
	MainWorktreeBranch string `json:"mainWorktreeBranch,omitempty"`
}

type AppStatusResponse struct {
	Ident           string           `json:"ident"`
	DockerInfo      *docker.Info     `json:"dockerInfo,omitempty"`
	GitStatus       string           `json:"gitStatus,omitempty"`
	Branch          string           `json:"branch,omitempty"`
	ActiveWorktree  string           `json:"activeWorktree,omitempty"`
	OperationStatus *OperationStatus `json:"operationStatus,omitempty"`
	Status          string           `json:"status,omitempty"`
}

type InfraServiceResponse struct {
	Ident             string               `json:"ident"`
	DisplayName       string               `json:"displayName"`
	Type              string               `json:"type,omitempty"`
	ContainerBaseName string               `json:"containerBaseName,omitempty"`
	DockerInfo        *docker.Info         `json:"dockerInfo,omitempty"`
	Status            string               `json:"status,omitempty"`
	LogPath           string               `json:"logPath,omitempty"`
	ShellPath         string               `json:"shellPath,omitempty"`
	PowerShellPath    string               `json:"powerShellPath,omitempty"`
	DefaultRunner     string               `json:"defaultRunner,omitempty"`
	OperationStatus   *OperationStatus     `json:"operationStatus,omitempty"`
	ExecutionHandle   *app.ExecutionHandle `json:"executionHandle,omitempty"`
}

func NewServer(port int) *Server {
	s := &Server{
		port:       port,
		listeners:  make(map[chan Event]bool),
		opStatus:   make(map[string]*OperationStatus),
		mrSessions: make(map[string]*mrReviewSession),
	}
	return s
}

func (s *Server) Start() error {
	container, err := services.NewContainer()
	if err != nil {
		return fmt.Errorf("failed to initialize services: %w", err)
	}
	s.services = container

	if err := s.services.AppManager().LoadConfig(); err != nil {
		log.Printf("[WARN] Failed to load app config: %v", err)
	}
	s.apps = s.services.AppManager().GetApps()
	s.infraServices = s.services.AppManager().GetInfraServices()
	s.services.BuildService().RecoverShellTmuxRuns(s.apps)
	s.services.OperationsService().RecoverScriptInfrastructureRuns(s.infraServices)

	logging.SetStatusLogBroadcaster(func(entry logging.LogEntry) {
		s.BroadcastEvent(Event{
			Type: "statuslog.entry",
			Properties: map[string]interface{}{
				"timestamp": entry.Timestamp.Format(time.RFC3339),
				"appIdent":  entry.AppIdent,
				"appName":   entry.AppName,
				"operation": string(entry.Operation),
				"status":    string(entry.Status),
				"message":   entry.Message,
			},
			Timestamp: time.Now(),
		})
	})

	s.services.StatusManager().AddListener(s)
	log.Printf("[INFO] Registered server as StatusManager listener for SSE broadcasts")

	s.services.OperationsService().SetOnComplete(func(appIdent string) {
		s.broadcastAppStatusWithRetry(appIdent, "")
	})
	log.Printf("[INFO] Registered OperationsService.OnComplete callback")

	s.services.BuildService().SetOnComplete(func(appIdent string) {
		s.broadcastAppStatusWithRetry(appIdent, "")
	})
	log.Printf("[INFO] Registered BuildService.OnComplete callback")

	go s.startGitPoller()
	go s.startReconciliationPoller()
	go s.startDockerEventListener()
	go s.startScriptHealthPoller()
	go s.startKubernetesStatusWatchers()

	mux := http.NewServeMux()
	mux.HandleFunc("/api/apps", s.handleGetApps)
	mux.HandleFunc("/api/infra-services", s.handleGetInfraServices)
	mux.HandleFunc("/api/infra-services/{ident}/start", s.handleInfraServiceStart)
	mux.HandleFunc("/api/infra-services/{ident}/stop", s.handleInfraServiceStop)
	mux.HandleFunc("/api/infra-services/{ident}/logs", s.handleInfraServiceLogs)
	mux.HandleFunc("/api/status", s.handleGetStatus)
	mux.HandleFunc("/api/apps/{ident}/docker", s.handleGetDockerInfo)
	mux.HandleFunc("/api/apps/{ident}/git", s.handleGetGitInfo)
	mux.HandleFunc("/api/docker/start", s.handleDockerStart)
	mux.HandleFunc("/api/docker/stop", s.handleDockerStop)
	mux.HandleFunc("/api/docker/restart", s.handleDockerRestart)
	mux.HandleFunc("/api/docker/logs", s.handleDockerLogs)
	mux.HandleFunc("/api/kubernetes/logs", s.handleKubernetesLogs)
	mux.HandleFunc("/api/docker/logs/stream", s.handleDockerLogsStream)
	mux.HandleFunc("/api/docker/stats/stream", s.handleDockerStatsStream)
	mux.HandleFunc("/api/logs/operation/", s.handleOperationLogs)
	mux.HandleFunc("/api/logs/action/", s.handleActionLog)
	mux.HandleFunc("/api/logs/status", s.handleStatusLog)
	mux.HandleFunc("/api/git/pull", s.handleGitPull)
	mux.HandleFunc("/api/git/push", s.handleGitPush)
	mux.HandleFunc("/api/git/fetch", s.handleGitFetch)
	mux.HandleFunc("/api/git/branches", s.handleGitBranches)
	mux.HandleFunc("/api/git/checkout", s.handleGitCheckout)
	mux.HandleFunc("/api/git/worktrees", s.handleWorktrees)
	mux.HandleFunc("/api/actions/start", s.handleStart)
	mux.HandleFunc("/api/actions/build", s.handleBuild)
	mux.HandleFunc("/api/actions/test", s.handleTest)
	mux.HandleFunc("/api/actions/run", s.handleRun)
	mux.HandleFunc("/api/actions/stop", s.handleStopApp)
	mux.HandleFunc("/api/gitlab/merge-requests", s.handleGitLabMergeRequests)
	mux.HandleFunc("/api/gitlab/pipeline-jobs", s.handleGitLabPipelineJobs)
	mux.HandleFunc("/api/gitlab/jobs", s.handleGitLabJobs)
	mux.HandleFunc("/api/gitlab/test-summary", s.handleGitLabTestSummary)
	mux.HandleFunc("/api/gitlab/mr-changes", s.handleGitLabMRChanges)
	mux.HandleFunc("/api/gitlab/mr-versions", s.handleGitLabMRVersions)
	mux.HandleFunc("/api/gitlab/mr-comment", s.handleGitLabMRComment)
	mux.HandleFunc("/api/gitlab/mr-discussions", s.handleGitLabMRDiscussions)
	mux.HandleFunc("/api/gitlab/mr-discussion-reply", s.handleGitLabMRDiscussionReply)
	mux.HandleFunc("/api/gitlab/mr-discussion-resolve", s.handleGitLabMRDiscussionResolve)
	mux.HandleFunc("/api/gitlab/mr-approve", s.handleGitLabMRApprove)
	mux.HandleFunc("/api/gitlab/mr-unapprove", s.handleGitLabMRUnapprove)
	mux.HandleFunc("/api/gitlab/mr-toggle-approval", s.handleGitLabMRToggleApproval)
	mux.HandleFunc("/api/gitlab/mr-rebase", s.handleGitLabMRRebase)
	mux.HandleFunc("/api/gitlab/job-logs", s.handleGitLabJobLogs)
	mux.HandleFunc("/api/gitlab/job-retry", s.handleGitLabJobRetry)
	mux.HandleFunc("/api/gitlab/job-cancel", s.handleGitLabJobCancel)
	mux.HandleFunc("/api/github/pull-requests", s.handleGitHubPullRequests)
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
	mux.HandleFunc("/api/github/issues/linked-mrs", s.handleGitHubIssueLinkedMRs)
	mux.HandleFunc("/api/github/issues/references", s.handleGitHubIssueReferencedIssues)
	mux.HandleFunc("/api/github/mr/linked-issues", s.handleGitHubMRLinkedIssues)
	mux.HandleFunc("/api/github/labels", s.handleGitHubRepoLabels)
	mux.HandleFunc("/api/github/collaborators", s.handleGitHubRepoCollaborators)
	mux.HandleFunc("/api/gitlab/issues", s.handleGitLabIssues)
	mux.HandleFunc("/api/gitlab/issue", s.handleGitLabIssueDetail)
	mux.HandleFunc("/api/gitlab/issue-comments", s.handleGitLabIssueComments)
	mux.HandleFunc("/api/gitlab/issues/close", s.handleGitLabCloseIssue)
	mux.HandleFunc("/api/gitlab/issues/reopen", s.handleGitLabReopenIssue)
	mux.HandleFunc("/api/gitlab/issues/labels", s.handleGitLabSetLabels)
	mux.HandleFunc("/api/gitlab/issues/assignee", s.handleGitLabSetAssignee)
	mux.HandleFunc("/api/gitlab/issues/unassign", s.handleGitLabRemoveAssignee)
	mux.HandleFunc("/api/gitlab/issues/comment", s.handleGitLabAddComment)
	mux.HandleFunc("/api/gitlab/issues/linked-mrs", s.handleGitLabIssueLinkedMRs)
	mux.HandleFunc("/api/gitlab/issues/references", s.handleGitLabIssueReferencedIssues)
	mux.HandleFunc("/api/gitlab/mr/linked-issues", s.handleGitLabMRLinkedIssues)
	mux.HandleFunc("/api/gitlab/labels", s.handleGitLabRepoLabels)
	mux.HandleFunc("/api/gitlab/collaborators", s.handleGitLabRepoCollaborators)
	mux.HandleFunc("/api/ai/analyze-logs", s.handleAIAnalyzeLogs)
	mux.HandleFunc("/api/ai/analyze-logs-stream", s.handleAIAnalyzeLogsStream)
	mux.HandleFunc("/api/ai/mr-review-stream", s.handleAIMRReviewStream)
	mux.HandleFunc("/api/ai/mr-comment-callback/", s.handleMRCommentCallback)
	mux.HandleFunc("/api/providers", s.handleProviders)
	mux.HandleFunc("/api/providers/", s.handleProviderByName)
	mux.HandleFunc("/api/repos/search", s.handleRepoSearch)
	mux.HandleFunc("/api/repos/branches", s.handleRepoBranches)
	mux.HandleFunc("/api/apps/create", s.handleCreateApp)
	mux.HandleFunc("/api/example-config", s.handleCreateExampleConfig)
	mux.HandleFunc("/api/apps/{ident}/delete", s.handleDeleteApp)
	mux.HandleFunc("/api/apps/{ident}/profiles", s.handleGetProfiles)
	mux.HandleFunc("/api/apps/{ident}/actions/{action}/targets", s.handleGetActionTargets)
	mux.HandleFunc("/api/actions/shell-script", s.handleShellActionScript)
	mux.HandleFunc("/api/scripts", s.handleScripts)
	mux.HandleFunc("/api/scripts/create", s.handleCreateScript)
	mux.HandleFunc("/api/scripts/link", s.handleLinkScript)
	mux.HandleFunc("/api/scripts/delete", s.handleDeleteScript)
	mux.HandleFunc("/api/scripts/history", s.handleScriptArgsHistory)
	mux.HandleFunc("/api/scripts/metadata", s.handleScriptMetadataRoute)
	mux.HandleFunc("/api/agent-spaces", s.handleGetAgentSpaces)
	mux.HandleFunc("/api/agent-spaces/{id}/extract-agent", s.handleExtractAgentFile)
	mux.HandleFunc("/api/agent-sessions", s.handleGetAgentSessions)
	mux.HandleFunc("/api/opencode-agents", s.handleGetOpencodeAgents)
	mux.HandleFunc("/api/opencode-config/extract", s.handleExtractOpencodeConfig)
	mux.HandleFunc("/api/pi-sessions", s.handleGetPiSessions)
	mux.HandleFunc("/api/events", s.handleEvents)
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ok", "homeDir": s.services.HomeDir()})
	})

	addr := fmt.Sprintf("127.0.0.1:%d", s.port)
	log.Printf("Starting HTTP API server on %s", addr)

	httpSrv := &http.Server{Addr: addr, Handler: s.loggingMiddleware(s.corsMiddleware(mux))}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	errCh := make(chan error, 1)
	go func() {
		errCh <- httpSrv.ListenAndServe()
	}()

	select {
	case sig := <-quit:
		log.Printf("Received signal %s, shutting down", sig)
	case err := <-errCh:
		if err != nil && err != http.ErrServerClosed {
			s.stopOpencodeServer()
			return err
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	s.stopOpencodeServer()
	return httpSrv.Shutdown(ctx)
}

func (s *Server) loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		startTime := time.Now()
		log.Printf("[HTTP] <- %s %s from %s", r.Method, r.URL.Path, r.RemoteAddr)
		wrapper := &responseWriterWrapper{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(wrapper, r)
		duration := time.Since(startTime)
		log.Printf("[HTTP] -> %s %s [%d] in %v", r.Method, r.URL.Path, wrapper.statusCode, duration)
	})
}

type responseWriterWrapper struct {
	http.ResponseWriter
	statusCode int
}

func (w *responseWriterWrapper) WriteHeader(statusCode int) {
	w.statusCode = statusCode
	w.ResponseWriter.WriteHeader(statusCode)
}

func (w *responseWriterWrapper) Flush() {
	if flusher, ok := w.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func (s *Server) startDockerEventListener() {
	backoff := 1 * time.Second
	const maxBackoff = 30 * time.Second

	log.Println("[Docker] Starting Docker event stream listener")

	for {
		ctx, cancel := context.WithCancel(context.Background())
		eventCh, errCh := s.services.DockerClient().SubscribeToEvents(ctx)

		log.Println("[Docker] Subscribed to Docker event stream")
		backoff = 1 * time.Second

		streamDone := false
		for !streamDone {
			select {
			case ev, ok := <-eventCh:
				if !ok {
					streamDone = true
					break
				}
				appIdent := s.findIdentByContainerName(ev.ContainerName)
				if appIdent == "" {
					log.Printf("[Docker] Event %s for unrecognised container %q – ignoring", ev.Action, ev.ContainerName)
					continue
				}
				log.Printf("[Docker] Event %s for %s (container %s) – triggering status broadcast", ev.Action, appIdent, ev.ContainerName)
				s.broadcastAppStatusWithRetry(appIdent, "")
			case err, ok := <-errCh:
				if !ok {
					streamDone = true
					break
				}
				if err != nil {
					log.Printf("[Docker] Event stream error: %v – reconnecting in %s", err, backoff)
				}
				streamDone = true
			}
		}

		cancel()
		log.Printf("[Docker] Event stream closed – reconnecting in %s", backoff)
		time.Sleep(backoff)
		backoff *= 2
		if backoff > maxBackoff {
			backoff = maxBackoff
		}
	}
}

func (s *Server) findIdentByContainerName(containerName string) string {
	for i := range s.apps {
		if docker.ContainerNameMatches(containerName, s.apps[i].Ident, s.apps[i].GetContainerBaseName()) {
			return s.apps[i].Ident
		}
	}
	for i := range s.infraServices {
		if docker.ContainerNameMatches(containerName, s.infraServices[i].Ident, s.infraServices[i].GetContainerBaseName()) {
			return s.infraServices[i].Ident
		}
	}
	return ""
}

func (s *Server) startScriptHealthPoller() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		for i := range s.apps {
			_ = s.services.BuildService().IsShellTmuxRunActive(s.apps[i].Ident)
			s.broadcastAppStatus(s.apps[i].Ident)
		}
		for i := range s.infraServices {
			if s.infraServices[i].Type != app.InfraServiceTypeScript {
				continue
			}
			_, _ = s.services.OperationsService().ScriptInfrastructureStatus(s.infraServices[i].Ident)
			s.broadcastAppStatus(s.infraServices[i].Ident)
		}
	}
}

func (s *Server) startGitPoller() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	previousGit := make(map[string]struct{ branch, status string })
	log.Println("[Git poller] Starting (5s interval)")

	for range ticker.C {
		gitRepo := s.services.GitRepository()
		dockerClient := s.services.DockerClient()

		for i := range s.apps {
			app := &s.apps[i]
			if app.AppType != "APP" {
				continue
			}

			time.Sleep(10 * time.Millisecond)

			adapter := &appAdapter{app: app}
			branch := gitRepo.GetCurrentBranch(adapter)
			if branch == "" {
				// Repo not yet cloned or unreadable — fall back to the last
				// known branch so we never broadcast an empty value that would
				// overwrite valid state in the TUI.
				branch = app.Branch
			} else {
				// Keep the in-memory branch current for future fallbacks.
				app.Branch = branch
			}
			gitStatus := gitRepo.GetStatus(adapter)

			prev := previousGit[app.Ident]
			if prev.branch == branch && prev.status == gitStatus {
				continue
			}

			previousGit[app.Ident] = struct{ branch, status string }{branch, gitStatus}
			dockerInfo := dockerClient.GetInfo(adapter)

			s.opStatusMu.RLock()
			opStatus := s.opStatus[app.Ident]
			s.opStatusMu.RUnlock()

			s.BroadcastEvent(Event{
				Type: "status.updated",
				Properties: map[string]interface{}{
					"ident":           app.Ident,
					"dockerInfo":      dockerInfo,
					"gitStatus":       gitStatus,
					"branch":          branch,
					"operationStatus": opStatus,
					"status":          s.appRuntimeStatus(app.Ident, dockerInfo),
				},
				Timestamp: time.Now(),
			})

			log.Printf("[Git poller] Change detected for %s — branch: %s, gitStatus: %s", app.Ident, branch, gitStatus)
		}
	}
}

func (s *Server) startReconciliationPoller() {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	log.Println("[Reconciliation poller] Starting (60s interval)")

	for range ticker.C {
		dockerClient := s.services.DockerClient()
		gitRepo := s.services.GitRepository()

		appAdapters := make([]docker.App, 0, len(s.apps))
		for i := range s.apps {
			appAdapters = append(appAdapters, &appAdapter{app: &s.apps[i]})
		}

		dockerInfoMap, err := dockerClient.BatchGetInfo(appAdapters, nil)
		if err != nil {
			log.Printf("[Reconciliation poller] BatchGetInfo (apps) error: %v", err)
		} else {
			for i := range s.apps {
				app := &s.apps[i]
				if app.AppType != "APP" {
					continue
				}

				time.Sleep(10 * time.Millisecond)
				adapter := &appAdapter{app: app}
				dockerInfo := dockerInfoMap[app.Ident]
				branch := gitRepo.GetCurrentBranch(adapter)
				gitStatus := gitRepo.GetStatus(adapter)

				s.opStatusMu.RLock()
				opStatus := s.opStatus[app.Ident]
				s.opStatusMu.RUnlock()

				s.BroadcastEvent(Event{
					Type: "status.updated",
					Properties: map[string]interface{}{
						"ident":           app.Ident,
						"dockerInfo":      dockerInfo,
						"gitStatus":       gitStatus,
						"branch":          branch,
						"operationStatus": opStatus,
						"status":          s.appRuntimeStatus(app.Ident, dockerInfo),
					},
					Timestamp: time.Now(),
				})
			}
		}

		if len(s.infraServices) > 0 {
			infraAdapters := make([]docker.InfraService, 0, len(s.infraServices))
			for i := range s.infraServices {
				infraAdapters = append(infraAdapters, &infraServiceAdapter{service: &s.infraServices[i]})
			}

			infraDockerMap, err := dockerClient.BatchGetInfo(nil, infraAdapters)
			if err != nil {
				log.Printf("[Reconciliation poller] BatchGetInfo (infra) error: %v", err)
			} else {
				for _, svc := range s.infraServices {
					dockerInfo := infraDockerMap[svc.Ident]

					s.opStatusMu.RLock()
					opStatus := s.opStatus[svc.Ident]
					s.opStatusMu.RUnlock()

					s.BroadcastEvent(Event{
						Type: "status.updated",
						Properties: map[string]interface{}{
							"ident":           svc.Ident,
							"dockerInfo":      dockerInfo,
							"operationStatus": opStatus,
							"status":          dockerRuntimeStatus(dockerInfo),
						},
						Timestamp: time.Now(),
					})
				}
			}
		}

		log.Printf("[Reconciliation poller] Full status broadcast complete (%d apps, %d infra)", len(s.apps), len(s.infraServices))
	}
}

func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) handleEvents(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	eventChan := make(chan Event, 100)
	s.listenerMu.Lock()
	s.listeners[eventChan] = true
	s.listenerMu.Unlock()

	defer func() {
		s.listenerMu.Lock()
		delete(s.listeners, eventChan)
		s.listenerMu.Unlock()
		close(eventChan)
	}()

	data, _ := json.Marshal(Event{Type: "connection.established", Properties: map[string]string{"status": "connected"}, Timestamp: time.Now()})
	fmt.Fprintf(w, "data: %s\n\n", data)
	w.(http.Flusher).Flush()

	for {
		select {
		case event := <-eventChan:
			data, err := json.Marshal(event)
			if err != nil {
				continue
			}
			fmt.Fprintf(w, "data: %s\n\n", data)
			w.(http.Flusher).Flush()
		case <-r.Context().Done():
			return
		}
	}
}

func (s *Server) BroadcastEvent(event Event) {
	s.listenerMu.RLock()
	defer s.listenerMu.RUnlock()

	for listener := range s.listeners {
		select {
		case listener <- event:
		default:
		}
	}
}

func (s *Server) broadcastAppStatus(appIdent string) {
	dockerClient := s.services.DockerClient()

	if targetApp := s.findAppByIdent(appIdent); targetApp != nil {
		adapter := &appAdapter{app: targetApp}
		dockerInfo := dockerClient.GetInfo(adapter)

		gitRepo := s.services.GitRepository()
		gitStatus := gitRepo.GetStatus(adapter)
		currentBranch := gitRepo.GetCurrentBranch(adapter)

		s.opStatusMu.RLock()
		opStatus := s.opStatus[appIdent]
		s.opStatusMu.RUnlock()

		appRunStatus := s.appRuntimeStatus(appIdent, dockerInfo)
		s.BroadcastEvent(Event{
			Type: "status.updated",
			Properties: map[string]interface{}{
				"ident":           appIdent,
				"dockerInfo":      dockerInfo,
				"gitStatus":       gitStatus,
				"branch":          currentBranch,
				"operationStatus": opStatus,
				"status":          appRunStatus,
			},
			Timestamp: time.Now(),
		})
		log.Printf("[DEBUG] Broadcasted status update for app %s - Docker: %s, Branch: %s", appIdent, dockerInfo.Status, currentBranch)
		return
	}

	if targetInfraService := s.findInfraServiceByIdent(appIdent); targetInfraService != nil {
		s.opStatusMu.RLock()
		opStatus := s.opStatus[appIdent]
		s.opStatusMu.RUnlock()

		props := map[string]interface{}{
			"ident":           appIdent,
			"operationStatus": opStatus,
		}
		if targetInfraService.Type == app.InfraServiceTypeScript {
			statusValue, logPath := s.services.OperationsService().ScriptInfrastructureStatus(appIdent)
			props["status"] = statusValue
			props["logPath"] = logPath
			props["executionHandle"] = s.services.OperationsService().ScriptInfrastructureExecutionHandle(appIdent)
		} else if targetInfraService.Type == app.InfraServiceTypeKubernetes {
			props["status"] = s.services.OperationsService().KubernetesInfrastructureStatus(*targetInfraService)
		} else {
			adapter := &infraServiceAdapter{service: targetInfraService}
			dockerInfo := dockerClient.GetInfoForInfra(adapter)
			props["dockerInfo"] = dockerInfo
			props["status"] = dockerRuntimeStatus(dockerInfo)
		}
		s.BroadcastEvent(Event{Type: "status.updated", Properties: props, Timestamp: time.Now()})
		return
	}

	log.Printf("[WARN] broadcastAppStatus: ident %q not found in APPS or InfraServices", appIdent)
}

// broadcastAppStatusWithBranch is like broadcastAppStatus but uses the
// provided knownBranch value instead of reading HEAD from the filesystem via
// GetCurrentBranch. This is used immediately after a worktree checkout where
// the newly created linked-worktree directory may not yet have a readable HEAD
// file on disk, even though the correct branch is already known from the
// in-memory app state. Falls back to GetCurrentBranch when knownBranch is
// empty.
func (s *Server) broadcastAppStatusWithBranch(appIdent, knownBranch string) {
	dockerClient := s.services.DockerClient()

	if targetApp := s.findAppByIdent(appIdent); targetApp != nil {
		adapter := &appAdapter{app: targetApp}
		dockerInfo := dockerClient.GetInfo(adapter)

		gitRepo := s.services.GitRepository()
		gitStatus := gitRepo.GetStatus(adapter)

		branch := knownBranch
		if branch == "" {
			branch = gitRepo.GetCurrentBranch(adapter)
		}

		s.opStatusMu.RLock()
		opStatus := s.opStatus[appIdent]
		s.opStatusMu.RUnlock()

		appRunStatus := s.appRuntimeStatus(appIdent, dockerInfo)
		props := map[string]interface{}{
			"ident":           appIdent,
			"dockerInfo":      dockerInfo,
			"gitStatus":       gitStatus,
			"branch":          branch,
			"operationStatus": opStatus,
			"status":          appRunStatus,
		}
		if targetApp.ActiveWorktree != "" {
			props["activeWorktree"] = targetApp.ActiveWorktree
		}
		s.BroadcastEvent(Event{
			Type:       "status.updated",
			Properties: props,
			Timestamp:  time.Now(),
		})
		log.Printf("[DEBUG] Broadcasted status update for app %s - Docker: %s, Branch: %s", appIdent, dockerInfo.Status, branch)
		return
	}

	log.Printf("[WARN] broadcastAppStatusWithBranch: ident %q not found in APPS", appIdent)
}

func (s *Server) broadcastAppStatusWithRetry(appIdent string, prevDockerStatus string) {
	go func() {
		ticker := time.NewTicker(500 * time.Millisecond)
		deadline := time.After(15 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-deadline:
				s.broadcastAppStatus(appIdent)
				return
			case <-ticker.C:
				s.broadcastAppStatus(appIdent)
				current := s.getDockerStatus(appIdent)
				if current != prevDockerStatus {
					return
				}
			}
		}
	}()
}

func (s *Server) appRuntimeStatus(appIdent string, dockerInfo docker.Info) string {
	if s.services != nil && s.services.BuildService() != nil {
		switch s.services.BuildService().LastRunRuntime(appIdent) {
		case "docker":
			return dockerRuntimeStatus(dockerInfo)
		case "kubernetes":
			return s.services.BuildService().KubernetesRunStatus(appIdent)
		case "shell", "powershell", "systemshell":
			if s.services.BuildService().IsShellTmuxRunActive(appIdent) {
				return "running"
			}
			return "stopped"
		}
		if targetApp := s.findAppByIdent(appIdent); targetApp != nil {
			if status := s.services.BuildService().DiscoverKubernetesRunStatus(appIdent, targetApp.LocalDirectoryPath); !strings.HasPrefix(status, "stopped") {
				return status
			}
		}
	}
	return dockerRuntimeStatus(dockerInfo)
}

func dockerRuntimeStatus(dockerInfo docker.Info) string {
	if dockerInfo.Status != "" && dockerInfo.Status != "not found" && dockerInfo.Status != "error" {
		return strings.ToLower(dockerInfo.Status)
	}
	return "stopped"
}

func (s *Server) getDockerStatus(appIdent string) string {
	dockerClient := s.services.DockerClient()

	if targetApp := s.findAppByIdent(appIdent); targetApp != nil {
		info := dockerClient.GetInfo(&appAdapter{app: targetApp})
		return info.Status
	}
	if targetInfraService := s.findInfraServiceByIdent(appIdent); targetInfraService != nil {
		info := dockerClient.GetInfoForInfra(&infraServiceAdapter{service: targetInfraService})
		return info.Status
	}
	return ""
}

// findAppByIdent looks up an app by its identifier and returns a pointer to it.
// Returns nil if not found.
func (s *Server) findAppByIdent(ident string) *app.App {
	for i := range s.apps {
		if s.apps[i].Ident == ident {
			return &s.apps[i]
		}
	}
	return nil
}

func (s *Server) findInfraServiceByIdent(ident string) *app.InfraService {
	for i := range s.infraServices {
		if s.infraServices[i].Ident == ident {
			return &s.infraServices[i]
		}
	}
	return nil
}

func (s *Server) findApp(ident string) *appAdapter {
	for i := range s.apps {
		if s.apps[i].Ident == ident {
			return &appAdapter{app: &s.apps[i]}
		}
	}
	return nil
}

type appAdapter struct {
	app *app.App
}

func (a *appAdapter) GetIdent() string { return a.app.Ident }

func (a *appAdapter) GetContainerBaseName() string { return a.app.GetContainerBaseName() }

func (a *appAdapter) GetRepositoryPath() string { return a.app.RepositoryPath }

func (a *appAdapter) GetLocalDirectoryPath() string { return a.app.LocalDirectoryPath }

func (a *appAdapter) GetBranch() string { return a.app.Branch }

func (a *appAdapter) GetMainWorktreeBranch() string { return a.app.MainWorktreeBranch }

type infraServiceAdapter struct {
	service *app.InfraService
}

func (i *infraServiceAdapter) GetIdent() string { return i.service.Ident }

func (i *infraServiceAdapter) GetContainerBaseName() string { return i.service.GetContainerBaseName() }

func (s *Server) setOperationStatus(appIdent, operation, status, message string) {
	s.opStatusMu.Lock()
	defer s.opStatusMu.Unlock()

	s.opStatus[appIdent] = &OperationStatus{Operation: operation, Status: status, Message: message}

	s.BroadcastEvent(Event{
		Type: "operation.status.changed",
		Properties: map[string]interface{}{
			"appIdent":  appIdent,
			"operation": operation,
			"status":    status,
			"message":   message,
		},
		Timestamp: time.Now(),
	})
}

func (s *Server) getOperationStatus(appIdent string) *OperationStatus {
	s.opStatusMu.RLock()
	defer s.opStatusMu.RUnlock()

	if status, exists := s.opStatus[appIdent]; exists {
		statusCopy := *status
		return &statusCopy
	}
	return nil
}

func (s *Server) clearOperationStatus(appIdent string) {
	s.opStatusMu.Lock()
	defer s.opStatusMu.Unlock()

	delete(s.opStatus, appIdent)

	s.BroadcastEvent(Event{
		Type: "operation.status.cleared",
		Properties: map[string]interface{}{
			"appIdent": appIdent,
		},
		Timestamp: time.Now(),
	})
}

func (s *Server) OnStatusUpdate(appStatus *status.AppStatus) {
	if appStatus == nil {
		return
	}

	serverStatus := "active"
	statusTypeStr := string(appStatus.StatusType)
	switch statusTypeStr {
	case "pending":
		serverStatus = "pending"
	case "active":
		serverStatus = "active"
	case "completed":
		serverStatus = "completed"
	case "failed":
		serverStatus = "failed"
	}

	s.opStatusMu.Lock()
	s.opStatus[appStatus.AppIdent] = &OperationStatus{Operation: string(appStatus.Operation), Status: serverStatus, Message: appStatus.Message}
	s.opStatusMu.Unlock()

	s.BroadcastEvent(Event{
		Type: "operation.status.changed",
		Properties: map[string]interface{}{
			"appIdent":  appStatus.AppIdent,
			"operation": string(appStatus.Operation),
			"status":    serverStatus,
			"message":   appStatus.Message,
		},
		Timestamp: time.Now(),
	})

	log.Printf("[DEBUG] Operation status updated: %s - %s (%s): %s", appStatus.AppIdent, appStatus.Operation, serverStatus, appStatus.Message)
}

func (s *Server) OnStatusCleared(appIdent string) {
	s.clearOperationStatus(appIdent)
	s.broadcastAppStatusWithRetry(appIdent, "")
	log.Printf("[DEBUG] Operation status cleared: %s", appIdent)
}

func (s *Server) reloadAppConfig() {
	if err := s.services.AppManager().LoadConfig(); err != nil {
		log.Printf("[WARN] Failed to reload app config: %v", err)
	}
	s.apps = s.services.AppManager().GetApps()
	s.infraServices = s.services.AppManager().GetInfraServices()
	s.services.BuildService().RecoverShellTmuxRuns(s.apps)
	s.services.OperationsService().RecoverScriptInfrastructureRuns(s.infraServices)
}

func (s *Server) updateOrCreateRepoWithStatus(targetApp *app.App, callback func()) {
	go func() {
		statusCallback := s.services.StatusManager().StartOperation(targetApp.Ident, status.OpCheckout)
		gitApp := &appAdapter{app: targetApp}
		actualBranch, err := s.services.GitRepository().UpdateOrCreateRepo(gitApp)
		if err != nil {
			statusCallback("Failed: " + err.Error())
			s.services.Logger().LogStatus(targetApp.Ident, targetApp.DisplayName, logging.OpCheckout, logging.StatusFailed, err.Error())
		} else {
			// Record the actual branch that was checked out as the primary
			// worktree branch. This may differ from the requested branch when
			// the remote redirected to its default branch.
			if actualBranch != "" {
				if setErr := s.services.AppManager().SetMainWorktreeBranch(targetApp.Ident, actualBranch); setErr != nil {
					log.Printf("[WARN] devenv: failed to persist MainWorktreeBranch for %s: %v", targetApp.Ident, setErr)
				}
			}
			statusCallback("Checkout completed")
			s.services.Logger().LogStatus(targetApp.Ident, targetApp.DisplayName, logging.OpCheckout, logging.StatusCompleted, "Repository updated successfully")
		}
		if callback != nil {
			callback()
		}
	}()
}
