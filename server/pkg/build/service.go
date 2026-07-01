package build

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/friendsfriend/devenv/pkg/app"
	"github.com/friendsfriend/devenv/pkg/docker"
	"github.com/friendsfriend/devenv/pkg/resources"
	"github.com/friendsfriend/devenv/pkg/status"
)

type commandRunner interface {
	RunCommandWithLogging(appIdent, command string, args []string, envVars []string, workingDir string) (error, string)
	RunCommandWithLoggingToFile(appIdent, command string, args []string, envVars []string, workingDir string, logPath string) (error, string)
	RunCommandSilent(command string, args []string, envVars []string, workingDir string) (error, string)
}

type appRegistry interface {
	GetApps() []app.App
	GetInfraServices() []app.InfraService
	GetAppByIdent(ident string) (app.App, bool)
}

type infraStarter interface {
	StartInfrastructureServiceWithStatus(infra app.InfraService)
	StartScriptInfrastructureServiceWithStatus(infra app.InfraService, runner string) error
}

type resourceManager interface {
	ExistsDir(string) (bool, error)
	ResolveDockerfileForAction(appIdent, localDir string, action resources.ActionType) (string, error)
	ResolveComposeFile(appIdent, localDir string, profile string) (string, error)
	ResolveInfrastructureComposeFile(infraIdent string) (string, error)
	DiscoverProfiles(appIdent, localDir string) ([]string, error)
	DiscoverActionTargets(appIdent, localDir string, action resources.AppAction) ([]resources.ActionTarget, error)
	EnvFilePath() (string, bool)
	CopyTemplatesDir(destDir string) ([]string, error)
	CopyFile(src, dst string) error
}

// Service provides build, test, and run operations for applications.
type Service interface {
	BuildAppWithStatus(a *app.App)
	BuildAppTargetWithStatus(a *app.App, targetID string)
	TestAppWithStatus(a *app.App)
	TestAppTargetWithStatus(a *app.App, targetID string)
	RunAppWithStatus(a *app.App, profile string)
	RunAppTargetWithStatus(a *app.App, targetID string)
	StopShellTmuxRun(appIdent string) error
	RestartShellTmuxRun(a *app.App) error
	IsShellTmuxRunActive(appIdent string) bool
	RecoverShellTmuxRuns(apps []app.App)
	ActiveOperationLogPath(appIdent string) (string, bool)
	LastRunRuntime(appIdent string) string
	SetLastRunRuntime(appIdent string, runtime resources.ActionRuntime)
	SetOnComplete(callback func(appIdent string))
	ConfigureRunDependencies(apps appRegistry, infra infraStarter)
}

type service struct {
	resourceMgr    resourceManager
	executor       commandRunner
	statusMgr      status.Manager
	OnComplete     func(appIdent string)
	tmuxMu         sync.Mutex
	tmuxRuns       map[string]ShellTmuxRunState
	activeLogMu    sync.RWMutex
	activeLogMap   map[string]string
	lastRunMu      sync.RWMutex
	lastRunRuntime map[string]resources.ActionRuntime
	appRegistry    appRegistry
	infraStarter   infraStarter
}

func NewService(resourceMgr resourceManager, exec commandRunner, statusMgr status.Manager) Service {
	return &service{
		resourceMgr:    resourceMgr,
		executor:       exec,
		statusMgr:      statusMgr,
		tmuxRuns:       make(map[string]ShellTmuxRunState),
		activeLogMap:   make(map[string]string),
		lastRunRuntime: make(map[string]resources.ActionRuntime),
	}
}

// ShellTmuxRunState tracks active shell run launched in tmux.
type ShellTmuxRunState struct {
	AppIdent  string
	TargetID  string
	Profile   string
	WindowID  string
	PID       int
	StartedAt time.Time
}

func (s *service) SetOnComplete(callback func(appIdent string)) {
	s.OnComplete = callback
}

func (s *service) LastRunRuntime(appIdent string) string {
	s.lastRunMu.RLock()
	defer s.lastRunMu.RUnlock()
	return string(s.lastRunRuntime[appIdent])
}

func (s *service) SetLastRunRuntime(appIdent string, runtime resources.ActionRuntime) {
	s.lastRunMu.Lock()
	defer s.lastRunMu.Unlock()
	if s.lastRunRuntime == nil {
		s.lastRunRuntime = make(map[string]resources.ActionRuntime)
	}
	s.lastRunRuntime[appIdent] = runtime
}

func (s *service) ConfigureRunDependencies(apps appRegistry, infra infraStarter) {
	s.appRegistry = apps
	s.infraStarter = infra
}

func (s *service) BuildAppWithStatus(a *app.App) {
	callback := s.statusMgr.StartOperation(a.Ident, status.OpBuild)
	s.buildAppInternal(a, "", callback)
}

func (s *service) BuildAppTargetWithStatus(a *app.App, targetID string) {
	callback := s.statusMgr.StartOperation(a.Ident, status.OpBuild)
	s.buildAppInternal(a, targetID, callback)
}

func (s *service) TestAppWithStatus(a *app.App) {
	callback := s.statusMgr.StartOperation(a.Ident, status.OpTest)
	s.testAppInternal(a, "", callback)
}

func (s *service) TestAppTargetWithStatus(a *app.App, targetID string) {
	callback := s.statusMgr.StartOperation(a.Ident, status.OpTest)
	s.testAppInternal(a, targetID, callback)
}

func (s *service) RunAppWithStatus(a *app.App, profile string) {
	callback := s.statusMgr.StartOperation(a.Ident, status.OpRun)
	s.runAppInternal(a, profile, "", callback)
}

func (s *service) RunAppTargetWithStatus(a *app.App, targetID string) {
	callback := s.statusMgr.StartOperation(a.Ident, status.OpRun)
	s.runAppInternal(a, "", targetID, callback)
}

func (s *service) buildAppInternal(a *app.App, targetID string, statusCb func(string)) {
	folderExists, _ := s.resourceMgr.ExistsDir(a.LocalDirectoryPath)
	if !folderExists {
		statusCb("Error: Checkout needed")
		return
	}

	target, ok, err := s.selectActionTarget(a, resources.AppActionBuild, targetID, "")
	if err != nil {
		statusCb("Error: " + err.Error())
		return
	}
	if !ok {
		statusCb("Error: no build target configured")
		return
	}
	if target.Runtime != resources.ActionRuntimeDocker {
		s.runShellLogged(a, target, "build", statusCb)
		return
	}

	statusCb("resolving dockerfile...")

	dockerFilePath := target.SourcePath

	copied, err := s.resourceMgr.CopyTemplatesDir(a.LocalDirectoryPath)
	if err != nil {
		statusCb("Error: " + err.Error())
		return
	}
	defer func() {
		for _, p := range copied {
			_ = os.Remove(p)
		}
	}()

	imageName := fmt.Sprintf("%s:latest", a.Ident)

	// Copy Dockerfile into build context so Docker Desktop can access it
	// (Docker does not allow -f paths outside the build context on some drivers)
	localDockerfilePath := filepath.Join(a.LocalDirectoryPath, ".devenv-build.Dockerfile")
	if err := s.resourceMgr.CopyFile(dockerFilePath, localDockerfilePath); err != nil {
		statusCb("Error: " + err.Error())
		return
	}
	defer os.Remove(localDockerfilePath)

	logPath, err := s.startOperationLog(a.Ident, "build")
	if err != nil {
		statusCb("Error: " + err.Error())
		return
	}

	statusCb("building image...")
	buildArgs, buildEnv := s.dockerBuildCommandArgs(imageName, localDockerfilePath, a.LocalDirectoryPath)
	if buildErr, _ := s.executor.RunCommandWithLoggingToFile(a.Ident, docker.RuntimeCommand(), buildArgs, buildEnv, a.LocalDirectoryPath, logPath); buildErr != nil {
		statusCb("Error: " + buildErr.Error())
		return
	}

	statusCb("extracting artifacts...")
	artifactsPath, err := s.readArtifactsLabel(imageName)
	if err != nil {
		statusCb("Error: " + err.Error())
		return
	}

	if artifactsPath != "" {
		if err := s.extractArtifacts(a.Ident, a.LocalDirectoryPath, imageName, artifactsPath); err != nil {
			statusCb("Error: artifact extraction failed: " + err.Error())
			return
		}
	}

	statusCb("build successful")
	if s.OnComplete != nil {
		s.OnComplete(a.Ident)
	}
}

func (s *service) dockerBuildCommandArgs(imageName, dockerfilePath, workingDir string) ([]string, []string) {
	args := []string{"build", "--rm"}
	envVars := []string{}

	switch docker.RuntimeName() {
	case "docker":
		envVars = append(envVars, "DOCKER_BUILDKIT=1")
		args = append(args, "--progress=plain", "--cache-from", imageName, "--build-arg", "BUILDKIT_INLINE_CACHE=1")
	case "podman":
		if s.containerBuildSupportsFlag("--layers", workingDir) {
			args = append(args, "--layers")
		}
		if s.containerBuildSupportsFlag("--cache-from", workingDir) {
			args = append(args, "--cache-from", podmanCacheRepository(imageName))
		}
	}

	args = append(args, "-f", dockerfilePath, "-t", imageName, ".")
	return args, envVars
}

func (s *service) containerBuildSupportsFlag(flag, workingDir string) bool {
	err, output := s.executor.RunCommandSilent(docker.RuntimeCommand(), []string{"build", "--help"}, []string{}, workingDir)
	if err != nil {
		return false
	}
	return strings.Contains(output, flag)
}

func podmanCacheRepository(imageName string) string {
	if at := strings.Index(imageName, "@"); at >= 0 {
		return imageName[:at]
	}
	lastSlash := strings.LastIndex(imageName, "/")
	lastColon := strings.LastIndex(imageName, ":")
	if lastColon > lastSlash {
		return imageName[:lastColon]
	}
	return imageName
}

func (s *service) selectActionTarget(a *app.App, action resources.AppAction, targetID, profile string) (resources.ActionTarget, bool, error) {
	targets, err := s.resourceMgr.DiscoverActionTargets(a.Ident, a.LocalDirectoryPath, action)
	if err != nil {
		return resources.ActionTarget{}, false, err
	}
	if len(targets) == 0 {
		return resources.ActionTarget{}, false, nil
	}
	if targetID != "" {
		for _, target := range targets {
			if target.ID == targetID {
				return target, true, nil
			}
		}
		return resources.ActionTarget{}, false, nil
	}
	if action == resources.AppActionRun {
		for _, target := range targets {
			if target.Runtime == resources.ActionRuntimeDocker && target.Profile == profile {
				return target, true, nil
			}
		}
		return resources.ActionTarget{}, false, nil
	}
	if len(targets) == 1 {
		return targets[0], true, nil
	}
	for _, target := range targets {
		if target.Runtime == resources.ActionRuntimeDocker {
			return target, true, nil
		}
	}
	return targets[0], true, nil
}

func parseTmuxWindowAndPID(output string) (string, int) {
	windowID, _, pid := parseTmuxWindowLine(output)
	return windowID, pid
}

func parseTmuxWindowLine(output string) (string, string, int) {
	parts := strings.Split(strings.TrimSpace(output), ":")
	if len(parts) == 0 || strings.TrimSpace(parts[0]) == "" {
		return "", "", 0
	}
	if len(parts) == 2 {
		pid := 0
		_, _ = fmt.Sscanf(strings.TrimSpace(parts[1]), "%d", &pid)
		return strings.TrimSpace(parts[0]), "", pid
	}
	pid := 0
	if len(parts) > 2 {
		_, _ = fmt.Sscanf(strings.TrimSpace(parts[len(parts)-1]), "%d", &pid)
	}
	windowName := ""
	if len(parts) > 2 {
		windowName = strings.TrimSpace(strings.Join(parts[1:len(parts)-1], ":"))
	}
	return strings.TrimSpace(parts[0]), windowName, pid
}

func processAlive(pid int) bool {
	if pid <= 0 {
		return false
	}
	if runtime.GOOS == "windows" {
		proc, err := os.FindProcess(pid)
		if err != nil {
			return false
		}
		return proc.Signal(syscall.Signal(0)) == nil
	}
	return syscall.Kill(pid, 0) == nil
}

func (s *service) runShellTmux(a *app.App, target resources.ActionTarget, statusCb func(string)) {
	if target.LaunchMode != resources.LaunchModeTmux {
		statusCb("Error: unsupported shell run launch mode " + string(target.LaunchMode))
		return
	}
	command, args := scriptCommandForTarget(target)
	if err := ensureCommandAvailable(command, a.LocalDirectoryPath); err != nil {
		statusCb("Error: required tool not found: " + command)
		return
	}
	if strings.TrimSpace(os.Getenv("TMUX")) == "" {
		statusCb("tmux unavailable; running logged")
		s.runShellLogged(a, target, "run", statusCb)
		return
	}

	windowName := fmt.Sprintf("devenv - %s - %s", a.Ident, target.Profile)
	statusCb("opening tmux window...")
	tmuxArgs := []string{"new-window", "-P", "-F", "#{window_id}:#{pane_pid}", "-n", windowName, "-c", a.LocalDirectoryPath, command}
	tmuxArgs = append(tmuxArgs, args...)
	if err, output := s.executor.RunCommandSilent("tmux", tmuxArgs, []string{}, a.LocalDirectoryPath); err != nil {
		statusCb("Error: tmux launch failed: " + err.Error())
		return
	} else {
		windowID, panePID := parseTmuxWindowAndPID(output)
		if windowID == "" {
			statusCb("Error: tmux launch did not return a window id")
			return
		}
		s.tmuxMu.Lock()
		if s.tmuxRuns == nil {
			s.tmuxRuns = make(map[string]ShellTmuxRunState)
		}
		s.tmuxRuns[a.Ident] = ShellTmuxRunState{AppIdent: a.Ident, TargetID: target.ID, Profile: target.Profile, WindowID: windowID, PID: panePID, StartedAt: time.Now()}
		s.tmuxMu.Unlock()
	}
	s.SetLastRunRuntime(a.Ident, resources.ActionRuntimeShell)
	statusCb("run successful")
	if s.OnComplete != nil {
		s.OnComplete(a.Ident)
	}
}

func (s *service) StopShellTmuxRun(appIdent string) error {
	s.tmuxMu.Lock()
	state, ok := s.tmuxRuns[appIdent]
	if ok {
		delete(s.tmuxRuns, appIdent)
	}
	s.tmuxMu.Unlock()
	if !ok {
		return fmt.Errorf("no active shell tmux run for %s", appIdent)
	}
	if err, _ := s.executor.RunCommandSilent("tmux", []string{"kill-window", "-t", state.WindowID}, []string{}, ""); err != nil {
		return err
	}
	return nil
}

func (s *service) IsShellTmuxRunActive(appIdent string) bool {
	s.tmuxMu.Lock()
	state, ok := s.tmuxRuns[appIdent]
	s.tmuxMu.Unlock()
	if !ok {
		return false
	}
	if err, output := s.executor.RunCommandSilent("tmux", []string{"display-message", "-p", "-t", state.WindowID, "#{window_id}:#{pane_pid}"}, []string{}, ""); err != nil {
		s.tmuxMu.Lock()
		delete(s.tmuxRuns, appIdent)
		s.tmuxMu.Unlock()
		return false
	} else if _, panePID := parseTmuxWindowAndPID(output); panePID > 0 {
		state.PID = panePID
		s.tmuxMu.Lock()
		s.tmuxRuns[appIdent] = state
		s.tmuxMu.Unlock()
	}
	if state.PID > 0 && !processAlive(state.PID) {
		s.tmuxMu.Lock()
		delete(s.tmuxRuns, appIdent)
		s.tmuxMu.Unlock()
		return false
	}
	return true
}

func (s *service) RecoverShellTmuxRuns(apps []app.App) {
	if strings.TrimSpace(os.Getenv("TMUX")) == "" {
		return
	}
	err, output := s.executor.RunCommandSilent("tmux", []string{"list-windows", "-a", "-F", "#{window_id}:#{window_name}:#{pane_pid}"}, []string{}, "")
	if err != nil {
		return
	}
	known := make(map[string]app.App, len(apps))
	for _, a := range apps {
		known[a.Ident] = a
	}
	for _, line := range strings.Split(output, "\n") {
		windowID, windowName, panePID := parseTmuxWindowLine(line)
		if windowID == "" || !strings.HasPrefix(windowName, "devenv - ") || strings.HasPrefix(windowName, "devenv - infra - ") {
			continue
		}
		parts := strings.Split(windowName, " - ")
		if len(parts) < 3 {
			continue
		}
		ident, profile := strings.TrimSpace(parts[1]), strings.TrimSpace(parts[2])
		if _, ok := known[ident]; !ok {
			continue
		}
		if panePID > 0 && !processAlive(panePID) {
			continue
		}
		s.tmuxMu.Lock()
		if s.tmuxRuns == nil {
			s.tmuxRuns = make(map[string]ShellTmuxRunState)
		}
		if _, exists := s.tmuxRuns[ident]; !exists {
			s.tmuxRuns[ident] = ShellTmuxRunState{AppIdent: ident, Profile: profile, WindowID: windowID, PID: panePID, StartedAt: time.Now()}
		}
		s.tmuxMu.Unlock()
	}
}

func (s *service) RestartShellTmuxRun(a *app.App) error {
	s.tmuxMu.Lock()
	state, ok := s.tmuxRuns[a.Ident]
	s.tmuxMu.Unlock()
	if !ok {
		return fmt.Errorf("no active shell tmux run for %s", a.Ident)
	}
	_ = s.StopShellTmuxRun(a.Ident)
	s.RunAppTargetWithStatus(a, state.TargetID)
	return nil
}

func (s *service) runShellLogged(a *app.App, target resources.ActionTarget, operation string, statusCb func(string)) {
	statusCb("running shell " + operation + " script...")
	logPath, err := s.startOperationLog(a.Ident, operation)
	if err != nil {
		statusCb("Error: " + err.Error())
		return
	}
	command, args := scriptCommandForTarget(target)
	if err := ensureCommandAvailable(command, a.LocalDirectoryPath); err != nil {
		statusCb("Error: required tool not found: " + command)
		return
	}
	if runErr, _ := s.executor.RunCommandWithLoggingToFile(a.Ident, command, args, []string{}, a.LocalDirectoryPath, logPath); runErr != nil {
		statusCb("Error: " + runErr.Error())
		return
	}
	if operation == "run" {
		s.SetLastRunRuntime(a.Ident, resources.ActionRuntimeShell)
	}
	statusCb(operation + " successful")
	if s.OnComplete != nil {
		s.OnComplete(a.Ident)
	}
}

func scriptCommandForTarget(target resources.ActionTarget) (string, []string) {
	if target.Command != "" {
		return target.Command, target.Args
	}
	if target.Runtime == resources.ActionRuntimePowerShell {
		command := "powershell"
		if _, err := exec.LookPath("pwsh"); err == nil {
			command = "pwsh"
		}
		return command, []string{"-NoProfile", "-ExecutionPolicy", "Bypass", "-File", target.SourcePath}
	}
	return "sh", []string{target.SourcePath}
}

func ensureCommandAvailable(command, workingDir string) error {
	if strings.ContainsAny(command, `/\\`) {
		path := command
		if !filepath.IsAbs(path) {
			path = filepath.Join(workingDir, path)
		}
		info, err := os.Stat(path)
		if err != nil {
			return err
		}
		if info.IsDir() || info.Mode()&0111 == 0 {
			return fmt.Errorf("not executable")
		}
		return nil
	}
	_, err := exec.LookPath(command)
	return err
}

func (s *service) startOperationLog(appIdent, operation string) (string, error) {
	path := filepath.Join(os.TempDir(), "devenv-action-logs", fmt.Sprintf("%s-%s-%d.log", appIdent, operation, time.Now().UnixNano()))
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return "", err
	}
	s.activeLogMu.Lock()
	if s.activeLogMap == nil {
		s.activeLogMap = make(map[string]string)
	}
	s.activeLogMap[appIdent] = path
	s.activeLogMu.Unlock()
	return path, nil
}

func (s *service) ActiveOperationLogPath(appIdent string) (string, bool) {
	s.activeLogMu.RLock()
	defer s.activeLogMu.RUnlock()
	path, ok := s.activeLogMap[appIdent]
	return path, ok
}

func (s *service) readArtifactsLabel(imageName string) (string, error) {
	inspectErr, output := s.executor.RunCommandSilent(docker.RuntimeCommand(), []string{"inspect", "--format", "{{json .Config.Labels}}", imageName}, []string{}, "")
	if inspectErr != nil {
		return "", fmt.Errorf("failed to inspect image %s: %w", imageName, inspectErr)
	}

	var labels map[string]string
	if err := json.Unmarshal([]byte(strings.TrimSpace(output)), &labels); err != nil {
		return "", fmt.Errorf("failed to parse image labels: %w", err)
	}

	return labels["devenv.artifacts"], nil
}

func (s *service) extractArtifacts(appIdent, localDir, imageName, artifactsPath string) error {
	containerName := fmt.Sprintf("%s-extract", appIdent)

	if createErr, _ := s.executor.RunCommandSilent(docker.RuntimeCommand(), []string{"create", "--name", containerName, imageName}, []string{}, ""); createErr != nil {
		return fmt.Errorf("failed to create extraction container: %w", createErr)
	}

	defer func() {
		s.executor.RunCommandSilent(docker.RuntimeCommand(), []string{"rm", containerName}, []string{}, "")
	}()

	destPath := filepath.Join(localDir, artifactsPath)
	if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
		return fmt.Errorf("failed to create destination directory: %w", err)
	}

	containerSrc := fmt.Sprintf("%s:%s", containerName, artifactsPath)
	if cpErr, _ := s.executor.RunCommandSilent(docker.RuntimeCommand(), []string{"cp", containerSrc, destPath}, []string{}, ""); cpErr != nil {
		return fmt.Errorf("failed to copy artifacts: %w", cpErr)
	}

	return nil
}

func (s *service) testAppInternal(a *app.App, targetID string, statusCb func(string)) {
	folderExists, _ := s.resourceMgr.ExistsDir(a.LocalDirectoryPath)
	if !folderExists {
		statusCb("Error: Checkout needed")
		return
	}

	target, ok, err := s.selectActionTarget(a, resources.AppActionTest, targetID, "")
	if err != nil {
		statusCb("Error: " + err.Error())
		return
	}
	if !ok {
		statusCb("Error: no test target configured")
		return
	}
	if target.Runtime != resources.ActionRuntimeDocker {
		s.runShellLogged(a, target, "test", statusCb)
		return
	}

	statusCb("resolving test dockerfile...")

	dockerFilePath := target.SourcePath

	testImageName := fmt.Sprintf("%s-test:latest", a.Ident)

	localDockerfilePath := filepath.Join(a.LocalDirectoryPath, ".devenv-test.Dockerfile")
	if err := s.resourceMgr.CopyFile(dockerFilePath, localDockerfilePath); err != nil {
		statusCb("Error: " + err.Error())
		return
	}
	defer os.Remove(localDockerfilePath)

	logPath, err := s.startOperationLog(a.Ident, "test")
	if err != nil {
		statusCb("Error: " + err.Error())
		return
	}

	statusCb("building test image...")
	buildArgs, buildEnv := s.dockerBuildCommandArgs(testImageName, localDockerfilePath, a.LocalDirectoryPath)
	if buildErr, _ := s.executor.RunCommandWithLoggingToFile(a.Ident, docker.RuntimeCommand(), buildArgs, buildEnv, a.LocalDirectoryPath, logPath); buildErr != nil {
		statusCb("Error: " + buildErr.Error())
		return
	}

	statusCb("running tests...")
	if runErr, _ := s.executor.RunCommandWithLoggingToFile(a.Ident, docker.RuntimeCommand(), []string{"run", "--rm", testImageName}, []string{}, a.LocalDirectoryPath, logPath); runErr != nil {
		statusCb("Error: tests failed")
		return
	}

	statusCb("tests passed")
}

func (s *service) runAppInternal(a *app.App, profile string, targetID string, statusCb func(string)) {
	folderExists, _ := s.resourceMgr.ExistsDir(a.LocalDirectoryPath)
	if !folderExists {
		statusCb("Error: Checkout needed")
		return
	}

	target, ok, err := s.selectActionTarget(a, resources.AppActionRun, targetID, profile)
	if err != nil {
		statusCb("Error: " + err.Error())
		return
	}
	if !ok {
		statusCb("Error: no run target configured")
		return
	}
	if s.appRegistry != nil && s.infraStarter != nil {
		if err := s.startRunDependencies(target, statusCb); err != nil {
			statusCb("Error: " + err.Error())
			return
		}
	}
	s.startRunTarget(a, target, statusCb)
}

func (s *service) startRunTarget(a *app.App, target resources.ActionTarget, statusCb func(string)) {
	if target.Runtime != resources.ActionRuntimeDocker {
		s.runShellTmux(a, target, statusCb)
		return
	}

	statusCb("resolving compose file...")

	composeFilePath := target.SourcePath

	composeArgs := []string{"-p", "devenv", "-f", composeFilePath}

	if envFilePath, ok := s.resourceMgr.EnvFilePath(); ok {
		composeArgs = append(composeArgs, "--env-file", envFilePath)
	}

	composeArgs = append(composeArgs, "up", "-d")

	statusCb("starting containers...")
	if runErr, _ := s.executor.RunCommandWithLogging(a.Ident, docker.ComposeCommand(), composeArgs, []string{}, a.LocalDirectoryPath); runErr != nil {
		statusCb("Error: " + runErr.Error())
		return
	}

	s.SetLastRunRuntime(a.Ident, resources.ActionRuntimeDocker)
	statusCb("run successful")
	if s.OnComplete != nil {
		s.OnComplete(a.Ident)
	}
}

func (s *service) startRunDependencies(target resources.ActionTarget, statusCb func(string)) error {
	registry, err := s.buildTargetRegistry()
	if err != nil {
		return err
	}
	plan, err := registry.ResolveStartPlan(target.ID)
	if err != nil {
		return err
	}
	for _, item := range plan {
		if item.ID == target.ID {
			continue
		}
		statusCb("starting dependency " + item.ID + "...")
		if item.Kind == resources.TargetKindInfra {
			infra, ok := s.findInfra(item.Infra)
			if !ok {
				return fmt.Errorf("unknown infrastructure service %q", item.Infra)
			}
			if infra.Type == app.InfraServiceTypeScript {
				if err := s.infraStarter.StartScriptInfrastructureServiceWithStatus(infra, ""); err != nil {
					return err
				}
			} else {
				s.infraStarter.StartInfrastructureServiceWithStatus(infra)
			}
			continue
		}
		depApp, ok := s.appRegistry.GetAppByIdent(item.App)
		if !ok {
			return fmt.Errorf("unknown app %q", item.App)
		}
		depTarget, ok, err := s.selectActionTarget(&depApp, resources.AppActionRun, item.ID, item.Profile)
		if err != nil {
			return err
		}
		if !ok {
			return fmt.Errorf("unknown app run target %q", item.ID)
		}
		s.startRunTarget(&depApp, depTarget, statusCb)
	}
	return nil
}

func (s *service) buildTargetRegistry() (resources.TargetRegistry, error) {
	var items []resources.RegistryTarget
	for _, a := range s.appRegistry.GetApps() {
		targets, err := s.resourceMgr.DiscoverActionTargets(a.Ident, a.LocalDirectoryPath, resources.AppActionRun)
		if err != nil {
			return resources.TargetRegistry{}, err
		}
		for _, target := range targets {
			items = append(items, resources.RegistryTarget{ID: target.ID, Kind: resources.TargetKindAppRun, App: a.Ident, Runtime: target.Runtime, Profile: target.Profile, Requires: target.Requires, Running: s.isRunTargetActive(a.Ident, target.ID)})
		}
	}
	for _, infra := range s.appRegistry.GetInfraServices() {
		items = append(items, resources.RegistryTarget{ID: resources.InfraTargetID(infra.Ident), Kind: resources.TargetKindInfra, Infra: infra.Ident, Running: infra.Status == app.InfraStatusRunning})
	}
	return resources.NewTargetRegistry(items), nil
}

func (s *service) findInfra(ident string) (app.InfraService, bool) {
	for _, infra := range s.appRegistry.GetInfraServices() {
		if infra.Ident == ident {
			return infra, true
		}
	}
	return app.InfraService{}, false
}

func (s *service) isRunTargetActive(appIdent, targetID string) bool {
	s.tmuxMu.Lock()
	state, ok := s.tmuxRuns[appIdent]
	s.tmuxMu.Unlock()
	return ok && state.TargetID == targetID
}
