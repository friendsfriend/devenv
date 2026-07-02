package operations

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/friendsfriend/devenv/pkg/app"
	"github.com/friendsfriend/devenv/pkg/docker"
	"github.com/friendsfriend/devenv/pkg/resources"
	"github.com/friendsfriend/devenv/pkg/status"
)

// Service manages container lifecycle operations for applications.
type Service interface {
	StartInfrastructureServiceWithStatus(infra app.InfraService)
	StartScriptInfrastructureServiceWithStatus(infra app.InfraService, runner string) error
	StartKubernetesInfrastructureServiceWithStatus(infra app.InfraService) error
	StartKubernetesInfrastructureServiceWithLog(infra app.InfraService, logPath string) error
	StopKubernetesInfrastructureServiceWithStatus(infra app.InfraService) error
	KubernetesInfrastructureStatus(infra app.InfraService) string
	KubernetesInfrastructureLogs(infra app.InfraService) (string, error)
	StopScriptInfrastructureServiceWithStatus(ident string) error
	ScriptInfrastructureStatus(ident string) (string, string)
	ScriptInfrastructureExecutionHandle(ident string) *app.ExecutionHandle
	RecoverScriptInfrastructureRuns(infra []app.InfraService)
	ActiveOperationLogPath(ident string) (string, bool)
	KillAndRemoveAllContainersForAppWithStatus(a *app.App)
	KillAllRunningContainersWithStatus(apps []app.App)
	SetOnComplete(callback func(appIdent string))
}

type service struct {
	dockerClient   docker.Client
	executor       *Executor
	statusMgr      status.Manager
	resourceMgr    resources.Manager
	envFilePath    string
	homeDir        string
	scriptMu       sync.Mutex
	scriptRuns     map[string]*scriptRunState
	activeLogMu    sync.RWMutex
	activeLogMap   map[string]string
	scriptTerminal map[string]scriptTerminalState
	OnComplete     func(appIdent string)
}

func NewService(dockerClient docker.Client, exec *Executor, statusMgr status.Manager, resourceMgr resources.Manager, envFilePath string) Service {
	return &service{
		dockerClient:   dockerClient,
		executor:       exec,
		statusMgr:      statusMgr,
		resourceMgr:    resourceMgr,
		envFilePath:    envFilePath,
		scriptRuns:     make(map[string]*scriptRunState),
		scriptTerminal: make(map[string]scriptTerminalState),
		activeLogMap:   make(map[string]string),
	}
}

func (s *service) SetOnComplete(callback func(appIdent string)) {
	s.OnComplete = callback
}

func (s *service) newComposeArgs() []string {
	args := []string{"-p", "devenv"}
	if s.envFilePath != "" {
		args = append(args, "--env-file", s.envFilePath)
	}
	return args
}

func (s *service) StartInfrastructureServiceWithStatus(infra app.InfraService) {
	if infra.Type == app.InfraServiceTypeKubernetes {
		_ = s.StartKubernetesInfrastructureServiceWithStatus(infra)
		return
	}
	callback := s.statusMgr.StartOperation(infra.Ident, status.OpStart)
	callback("starting...")
	logPath, err := s.startOperationLog(infra.Ident, "start")
	if err != nil {
		callback("Error: " + err.Error())
		return
	}

	composeFilePath, err := s.resourceMgr.ResolveInfrastructureComposeFile(infra.Ident)

	if err != nil {
		callback("Error: " + err.Error())
		return
	}

	composeArgs := s.newComposeArgs()
	composeArgs = append(composeArgs, "-f", composeFilePath, "up", "-d")

	err, _ = s.executor.RunCommandWithLoggingToFile(infra.Ident, docker.ComposeCommand(), composeArgs, []string{}, "", logPath)
	if err != nil {
		callback("Error: " + err.Error())
		return
	}

	s.dockerClient.InvalidateContainerCache()

	callback("start successful")

	if s.OnComplete != nil {
		s.OnComplete(infra.Ident)
	}
}

func (s *service) KillAndRemoveAllContainersForAppWithStatus(a *app.App) {
	callback := s.statusMgr.StartOperation(a.Ident, status.OpStop)
	s.killAndRemoveContainersForAppInternal(a, callback)
}

func (s *service) killAndRemoveContainersForAppInternal(a *app.App, statusCb func(string)) {
	statusCb("killing containers...")
	logPath, err := s.startOperationLog(a.Ident, "stop")
	if err != nil {
		statusCb("Error: " + err.Error())
		return
	}

	composeArgs := s.newComposeArgs()
	composeArgs = append(composeArgs, "down", "--remove-orphans")

	err, _ = s.executor.RunCommandWithLoggingToFile(a.Ident, docker.ComposeCommand(), composeArgs, []string{}, "", logPath)
	if err != nil {
		statusCb("Error: " + err.Error())
		return
	}

	s.dockerClient.InvalidateContainerCache()

	statusCb("containers stopped")

	if s.OnComplete != nil {
		s.OnComplete(a.Ident)
	}
}

func (s *service) KillAllRunningContainersWithStatus(apps []app.App) {
	callback := s.statusMgr.StartOperation("all-apps", status.OpStop)
	s.killAllRunningContainersInternal(apps, callback)
}

func (s *service) killAllRunningContainersInternal(apps []app.App, statusCb func(string)) {
	statusCb("killing all containers...")
	logPath, err := s.startOperationLog("all-apps", "stop")
	if err != nil {
		statusCb("Error: " + err.Error())
		return
	}

	composeArgs := s.newComposeArgs()
	composeArgs = append(composeArgs, "down", "--remove-orphans")

	err, _ = s.executor.RunCommandWithLoggingToFile("all-apps", docker.ComposeCommand(), composeArgs, []string{}, "", logPath)
	if err != nil {
		statusCb("Error: " + err.Error())
		return
	}

	s.dockerClient.InvalidateContainerCache()

	statusCb("all containers stopped")
}

func (s *service) StartScriptInfrastructureServiceWithStatus(infra app.InfraService, runner string) error {
	if infra.Type != app.InfraServiceTypeScript {
		return fmt.Errorf("infra service %s is not a script service", infra.Ident)
	}
	s.scriptMu.Lock()
	if existing, ok := s.scriptRuns[infra.Ident]; ok {
		if existing.mode == "tmux" {
			s.scriptMu.Unlock()
			if err, _ := s.executor.RunCommandSilent("tmux", []string{"display-message", "-p", "-t", existing.paneID, "#{window_id}"}, []string{}, ""); err == nil {
				return nil
			}
			s.scriptMu.Lock()
			delete(s.scriptRuns, infra.Ident)
			s.scriptTerminal[infra.Ident] = scriptTerminalState{status: app.InfraStatusStopped}
		} else {
			select {
			case err := <-existing.exitCh:
				delete(s.scriptRuns, infra.Ident)
				if err != nil {
					break
				}
			default:
				s.scriptMu.Unlock()
				return nil
			}
		}
	}
	s.scriptMu.Unlock()

	statusCb := s.statusMgr.StartOperation(infra.Ident, status.OpStart)
	statusCb("starting script...")
	selectedRunner, command, args, err := resolveScriptRunner(infra, runner)
	if err != nil {
		statusCb("Error: " + err.Error())
		return err
	}
	logPath := infra.LogPath
	if logPath == "" {
		logPath = defaultScriptLogPath(s.resourceMgr.ConfigDir(), infra.Ident)
	}

	if strings.TrimSpace(os.Getenv("TMUX")) != "" {
		windowName := fmt.Sprintf("devenv - infra - %s", infra.Ident)
		cmdArgs := []string{"new-window", "-P", "-F", "#{window_id}:#{pane_pid}", "-n", windowName, "-c", infra.Cwd, command}
		cmdArgs = append(cmdArgs, args...)
		if err, output := s.executor.RunCommandSilent("tmux", cmdArgs, scriptEnv(infra.Env), infra.Cwd); err == nil {
			windowID, panePID := parseTmuxWindowAndPID(output)
			if windowID != "" {
				s.scriptMu.Lock()
				s.scriptRuns[infra.Ident] = &scriptRunState{service: infra, runner: selectedRunner, mode: "tmux", paneID: windowID, pid: panePID, logPath: logPath, startedAt: time.Now(), exitCh: make(chan error)}
				s.scriptMu.Unlock()
				statusCb("start successful")
				if s.OnComplete != nil {
					s.OnComplete(infra.Ident)
				}
				return nil
			}
		}
		statusCb("tmux window unavailable; running logged")
	}

	cmd, exitCh, err := startLoggedProcess(infra, command, args, logPath)
	if err != nil {
		statusCb("Error: " + err.Error())
		return err
	}
	s.scriptMu.Lock()
	delete(s.scriptTerminal, infra.Ident)
	s.scriptRuns[infra.Ident] = &scriptRunState{service: infra, runner: selectedRunner, mode: "logged", pid: cmd.Process.Pid, cmd: cmd, logPath: logPath, startedAt: time.Now(), exitCh: exitCh}
	s.scriptMu.Unlock()
	go s.watchScriptExit(infra.Ident, exitCh)
	statusCb("start successful")
	if s.OnComplete != nil {
		s.OnComplete(infra.Ident)
	}
	return nil
}

func (s *service) watchScriptExit(ident string, exitCh chan error) {
	err := <-exitCh
	scriptStatus := app.InfraStatusStopped
	if err != nil {
		scriptStatus = app.InfraStatusFailed
	}
	s.scriptMu.Lock()
	if st, ok := s.scriptRuns[ident]; ok {
		st.service.Status = scriptStatus
		st.service.ExecutionHandle = &app.ExecutionHandle{Mode: st.mode, PaneID: st.paneID, PID: st.pid, Runner: st.runner, ExitCode: exitCodeFromError(err), StartedAt: st.startedAt.Format(time.RFC3339)}
		s.scriptTerminal[ident] = scriptTerminalState{status: scriptStatus, logPath: st.logPath}
		delete(s.scriptRuns, ident)
	}
	s.scriptMu.Unlock()
	if s.OnComplete != nil {
		s.OnComplete(ident)
	}
}

func (s *service) StopScriptInfrastructureServiceWithStatus(ident string) error {
	statusCb := s.statusMgr.StartOperation(ident, status.OpStop)
	s.scriptMu.Lock()
	st, ok := s.scriptRuns[ident]
	if ok {
		delete(s.scriptRuns, ident)
	}
	s.scriptMu.Unlock()
	if !ok {
		statusCb("already stopped")
		return nil
	}
	var err error
	if st.mode == "tmux" {
		err, _ = s.executor.RunCommandSilent("tmux", []string{"kill-window", "-t", st.paneID}, []string{}, "")
	} else {
		err = killProcessGroup(st.cmd)
	}
	if err != nil {
		statusCb("Error: " + err.Error())
		return err
	}
	statusCb("stop successful")
	if s.OnComplete != nil {
		s.OnComplete(ident)
	}
	return nil
}

func (s *service) RecoverScriptInfrastructureRuns(infra []app.InfraService) {
	if strings.TrimSpace(os.Getenv("TMUX")) == "" {
		return
	}
	err, output := s.executor.RunCommandSilent("tmux", []string{"list-windows", "-a", "-F", "#{window_id}:#{window_name}:#{pane_pid}"}, []string{}, "")
	if err != nil {
		return
	}
	known := make(map[string]app.InfraService, len(infra))
	for _, svc := range infra {
		if svc.Type == app.InfraServiceTypeScript {
			known[svc.Ident] = svc
		}
	}
	for _, line := range strings.Split(output, "\n") {
		windowID, windowName, panePID := parseTmuxWindowLine(line)
		if windowID == "" || !strings.HasPrefix(windowName, "devenv - infra - ") {
			continue
		}
		ident := strings.TrimSpace(strings.TrimPrefix(windowName, "devenv - infra - "))
		svc, ok := known[ident]
		if !ok || (panePID > 0 && !processAlive(panePID)) {
			continue
		}
		s.scriptMu.Lock()
		if _, exists := s.scriptRuns[ident]; !exists {
			s.scriptRuns[ident] = &scriptRunState{service: svc, runner: svc.DefaultRunner, mode: "tmux", paneID: windowID, pid: panePID, logPath: svc.LogPath, startedAt: time.Now(), exitCh: make(chan error)}
		}
		s.scriptMu.Unlock()
	}
}

func (s *service) ScriptInfrastructureExecutionHandle(ident string) *app.ExecutionHandle {
	s.scriptMu.Lock()
	defer s.scriptMu.Unlock()
	if st, ok := s.scriptRuns[ident]; ok {
		return &app.ExecutionHandle{Mode: st.mode, PaneID: st.paneID, PID: st.pid, Runner: st.runner, StartedAt: st.startedAt.Format(time.RFC3339)}
	}
	return nil
}

func (s *service) ScriptInfrastructureStatus(ident string) (string, string) {
	s.scriptMu.Lock()
	defer s.scriptMu.Unlock()
	st, ok := s.scriptRuns[ident]
	if !ok {
		if terminal, ok := s.scriptTerminal[ident]; ok {
			return terminal.status, terminal.logPath
		}
		return app.InfraStatusStopped, ""
	}
	if st.mode == "tmux" {
		if err, output := s.executor.RunCommandSilent("tmux", []string{"display-message", "-p", "-t", st.paneID, "#{window_id}:#{pane_pid}"}, []string{}, ""); err != nil {
			delete(s.scriptRuns, ident)
			s.scriptTerminal[ident] = scriptTerminalState{status: app.InfraStatusStopped}
			return app.InfraStatusStopped, ""
		} else if _, panePID := parseTmuxWindowAndPID(output); panePID > 0 {
			st.pid = panePID
		}
		if st.pid > 0 && !processAlive(st.pid) {
			delete(s.scriptRuns, ident)
			s.scriptTerminal[ident] = scriptTerminalState{status: app.InfraStatusStopped}
			return app.InfraStatusStopped, ""
		}
		return app.InfraStatusRunning, ""
	}
	select {
	case err := <-st.exitCh:
		delete(s.scriptRuns, ident)
		if err != nil {
			s.scriptTerminal[ident] = scriptTerminalState{status: app.InfraStatusFailed, logPath: st.logPath}
			return app.InfraStatusFailed, st.logPath
		}
		s.scriptTerminal[ident] = scriptTerminalState{status: app.InfraStatusStopped, logPath: st.logPath}
		return app.InfraStatusStopped, st.logPath
	default:
		if st.pid > 0 && !processAlive(st.pid) {
			delete(s.scriptRuns, ident)
			s.scriptTerminal[ident] = scriptTerminalState{status: app.InfraStatusStopped, logPath: st.logPath}
			return app.InfraStatusStopped, st.logPath
		}
		return app.InfraStatusRunning, st.logPath
	}
}

func (s *service) startOperationLog(ident, operation string) (string, error) {
	logDir := filepath.Join(os.TempDir(), "devenv-action-logs")
	cleanupOperationLogs(logDir, 24*time.Hour)
	path := filepath.Join(logDir, fmt.Sprintf("%s-%s-%d.log", ident, operation, time.Now().UnixNano()))
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return "", err
	}
	now := time.Now().Format("2006-01-02 15:04:05")
	if err := os.WriteFile(path, []byte(fmt.Sprintf("[%s] Operation log started: ident=%s operation=%s\n[%s] Retention: temporary log, auto-cleaned after 24h\n\n", now, ident, operation, now)), 0644); err != nil {
		return "", err
	}
	s.activeLogMu.Lock()
	if s.activeLogMap == nil {
		s.activeLogMap = make(map[string]string)
	}
	s.activeLogMap[ident] = path
	s.activeLogMu.Unlock()
	return path, nil
}

func (s *service) ActiveOperationLogPath(ident string) (string, bool) {
	s.activeLogMu.RLock()
	defer s.activeLogMu.RUnlock()
	path, ok := s.activeLogMap[ident]
	return path, ok
}

func cleanupOperationLogs(logDir string, maxAge time.Duration) {
	entries, err := os.ReadDir(logDir)
	if err != nil {
		return
	}
	cutoff := time.Now().Add(-maxAge)
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		if info.ModTime().Before(cutoff) {
			_ = os.Remove(filepath.Join(logDir, entry.Name()))
		}
	}
}
