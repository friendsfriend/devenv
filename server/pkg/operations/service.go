package operations

import (
	"fmt"
	"os"
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
	StopScriptInfrastructureServiceWithStatus(ident string) error
	ScriptInfrastructureStatus(ident string) (string, string)
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
	}
}

func (s *service) SetOnComplete(callback func(appIdent string)) {
	s.OnComplete = callback
}

func (s *service) newComposeArgs() []string {
	args := []string{"compose", "-p", "devenv"}
	if s.envFilePath != "" {
		args = append(args, "--env-file", s.envFilePath)
	}
	return args
}

func (s *service) StartInfrastructureServiceWithStatus(infra app.InfraService) {
	callback := s.statusMgr.StartOperation(infra.Ident, status.OpStart)
	callback("starting...")

	composeFilePath, err := s.resourceMgr.ResolveInfrastructureComposeFile(infra.Ident)
	if err != nil {
		callback("Error: " + err.Error())
		return
	}

	composeArgs := s.newComposeArgs()
	composeArgs = append(composeArgs, "-f", composeFilePath, "up", "-d")

	err, _ = s.executor.RunCommandWithLogging(infra.Ident, docker.RuntimeCommand(), composeArgs, []string{}, "")
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

	composeArgs := s.newComposeArgs()
	composeArgs = append(composeArgs, "down", "--remove-orphans")

	err, _ := s.executor.RunCommandWithLogging(a.Ident, docker.RuntimeCommand(), composeArgs, []string{}, "")
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

	composeArgs := s.newComposeArgs()
	composeArgs = append(composeArgs, "down", "--remove-orphans")

	err, _ := s.executor.RunCommandWithLogging("all-apps", docker.RuntimeCommand(), composeArgs, []string{}, "")
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
		cmdArgs := []string{"new-window", "-P", "-F", "#{window_id}", "-n", windowName, "-c", infra.Cwd, command}
		cmdArgs = append(cmdArgs, args...)
		if err, output := s.executor.RunCommandSilent("tmux", cmdArgs, scriptEnv(infra.Env), infra.Cwd); err == nil {
			windowID := strings.TrimSpace(output)
			if windowID != "" {
				s.scriptMu.Lock()
				s.scriptRuns[infra.Ident] = &scriptRunState{service: infra, runner: selectedRunner, mode: "tmux", paneID: windowID, logPath: logPath, exitCh: make(chan error)}
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
	s.scriptRuns[infra.Ident] = &scriptRunState{service: infra, runner: selectedRunner, mode: "logged", cmd: cmd, logPath: logPath, exitCh: exitCh}
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
		st.service.ExecutionHandle = &app.ExecutionHandle{Mode: st.mode, PaneID: st.paneID, Runner: st.runner, ExitCode: exitCodeFromError(err), StartedAt: time.Now().Format(time.RFC3339)}
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
		if err, _ := s.executor.RunCommandSilent("tmux", []string{"display-message", "-p", "-t", st.paneID, "#{window_id}"}, []string{}, ""); err != nil {
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
		return app.InfraStatusRunning, st.logPath
	}
}
