package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/friendsfriend/devenv/pkg/actionrun"
	"github.com/friendsfriend/devenv/pkg/app"
	"github.com/friendsfriend/devenv/pkg/docker"
	"github.com/friendsfriend/devenv/pkg/services"
	"github.com/friendsfriend/devenv/pkg/status"
)

type Server struct {
	port           int
	services       services.Container
	apps           []app.App
	infraServices  []app.InfraService
	listeners      map[chan Event]bool
	listenerMu     sync.RWMutex
	opStatus       map[string]*OperationStatus
	opStatusMu     sync.RWMutex
	statusEventMu  sync.Mutex
	statusEventSig map[string]string
	actionRuns     *actionrun.Registry

	// CR review sessions: token → session (created per review, cleaned up on stream close)
	crSessions   map[string]*crReviewSession
	crSessionsMu sync.Mutex
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
	RunTargetInfo   interface{}      `json:"runTargetInfo,omitempty"`
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
		port:           port,
		listeners:      make(map[chan Event]bool),
		opStatus:       make(map[string]*OperationStatus),
		statusEventSig: make(map[string]string),
		actionRuns:     actionrun.NewRegistry(),
		crSessions:     make(map[string]*crReviewSession),
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
	go s.startKubernetesClusterPoller()

	mux := http.NewServeMux()
	s.registerRoutes(mux)

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
			return err
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
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

	// Track last-known run-active flag / script status to avoid redundant broadcasts.
	previousApp := make(map[string]bool)
	previousInfra := make(map[string]string)

	for range ticker.C {
		for i := range s.apps {
			// Always run for side effects (tmux session cleanup/update)
			active := s.services.BuildService().IsShellTmuxRunActive(s.apps[i].Ident)
			// Only broadcast when tmux run state actually changed
			prev, ok := previousApp[s.apps[i].Ident]
			if ok && prev == active {
				continue
			}
			previousApp[s.apps[i].Ident] = active
			s.broadcastAppStatus(s.apps[i].Ident)
		}
		for i := range s.infraServices {
			if s.infraServices[i].Type != app.InfraServiceTypeScript {
				continue
			}
			status, _ := s.services.OperationsService().ScriptInfrastructureStatus(s.infraServices[i].Ident)
			prev, ok := previousInfra[s.infraServices[i].Ident]
			if ok && prev == status {
				continue
			}
			previousInfra[s.infraServices[i].Ident] = status
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

			appRunStatus := s.appRuntimeStatus(app.Ident, dockerInfo)
			s.broadcastStatusUpdated(app.Ident, s.appStatusEventProperties(app.Ident, dockerInfo, gitStatus, branch, opStatus, appRunStatus))

			if os.Getenv("DEVENV_DEBUG_POLLER") == "1" {
				log.Printf("[Git poller] Change detected for %s — branch: %s, gitStatus: %s", app.Ident, branch, gitStatus)
			}
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

				appRunStatus := s.appRuntimeStatus(app.Ident, dockerInfo)
				s.broadcastStatusUpdated(app.Ident, s.appStatusEventProperties(app.Ident, dockerInfo, gitStatus, branch, opStatus, appRunStatus))
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

					s.broadcastStatusUpdated(svc.Ident, map[string]interface{}{
						"ident":           svc.Ident,
						"dockerInfo":      dockerInfo,
						"operationStatus": opStatus,
						"status":          dockerRuntimeStatus(dockerInfo),
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

	// Action output is bursty; keep enough backlog to avoid dropping chunks while
	// TUI batches rendering. Other SSE events remain small.
	eventChan := make(chan Event, 10000)
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
	s.actionRuns.Cleanup(time.Now())
	for _, run := range s.actionRuns.Active() {
		active, _ := json.Marshal(Event{Type: "action.started", Properties: map[string]interface{}{"run": run}, Timestamp: time.Now()})
		fmt.Fprintf(w, "data: %s\n\n", active)
	}
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
	if strings.HasPrefix(event.Type, "action.") && s.services != nil {
		if payload, err := json.Marshal(event); err == nil {
			if err := s.services.StateStore().AddActionEvent(string(payload), 50000); err != nil {
				log.Printf("[WARN] Failed to persist action event: %v", err)
			}
		}
	}
	s.listenerMu.RLock()
	defer s.listenerMu.RUnlock()

	for listener := range s.listeners {
		if event.Type == "action.command.output" || event.Type == "action.step.output" {
			listener <- event
			continue
		}
		select {
		case listener <- event:
		default:
		}
	}
}

func (s *Server) broadcastStatusUpdated(ident string, props map[string]interface{}) {
	data, err := json.Marshal(props)
	if err == nil {
		sig := string(data)
		s.statusEventMu.Lock()
		if s.statusEventSig == nil {
			s.statusEventSig = make(map[string]string)
		}
		if s.statusEventSig[ident] == sig {
			s.statusEventMu.Unlock()
			return
		}
		s.statusEventSig[ident] = sig
		s.statusEventMu.Unlock()
	}

	s.BroadcastEvent(Event{Type: "status.updated", Properties: props, Timestamp: time.Now()})
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
		s.broadcastStatusUpdated(appIdent, s.appStatusEventProperties(appIdent, dockerInfo, gitStatus, currentBranch, opStatus, appRunStatus))
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
		s.broadcastStatusUpdated(appIdent, props)
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
		props := s.appStatusEventProperties(appIdent, dockerInfo, gitStatus, branch, opStatus, appRunStatus)
		if targetApp.ActiveWorktree != "" {
			props["activeWorktree"] = targetApp.ActiveWorktree
		}
		s.broadcastStatusUpdated(appIdent, props)
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

func (s *Server) appStatusEventProperties(appIdent string, dockerInfo docker.Info, gitStatus, branch string, opStatus *OperationStatus, appRunStatus string) map[string]interface{} {
	props := map[string]interface{}{
		"ident":           appIdent,
		"dockerInfo":      dockerInfo,
		"gitStatus":       gitStatus,
		"branch":          branch,
		"operationStatus": opStatus,
		"status":          appRunStatus,
	}
	if s.services != nil && s.services.BuildService() != nil {
		if info, ok := s.services.BuildService().RunTargetInfo(appIdent); ok {
			props["runTargetInfo"] = info
		}
	}
	return props
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

	s.opStatus[appIdent] = &OperationStatus{Operation: operation, Status: status, Message: message}

	s.opStatusMu.Unlock()

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

	debugLog("Operation status updated: %s - %s (%s): %s", appStatus.AppIdent, appStatus.Operation, serverStatus, appStatus.Message)
}

func (s *Server) OnStatusCleared(appIdent string) {
	s.clearOperationStatus(appIdent)
	s.broadcastAppStatusWithRetry(appIdent, "")
	debugLog("Operation status cleared: %s", appIdent)
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
		}
		if callback != nil {
			callback()
		}
	}()
}
