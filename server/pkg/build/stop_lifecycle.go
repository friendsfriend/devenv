package build

import (
	"fmt"
	"strings"

	"github.com/friendsfriend/devenv/pkg/app"
	"github.com/friendsfriend/devenv/pkg/docker"
	k8s "github.com/friendsfriend/devenv/pkg/kubernetes"
	"github.com/friendsfriend/devenv/pkg/resources"
	"github.com/friendsfriend/devenv/pkg/status"
)

func (s *service) StopAppWithStatus(a *app.App, targetID string) {
	callback := s.statusMgr.StartOperation(a.Ident, status.OpStop)
	logPath, err := s.startOperationLog(a.Ident, "stop")
	if err != nil {
		callback("Error: " + err.Error())
		return
	}
	if targetID != "" {
		target, ok, err := s.selectActionTarget(a, resources.AppActionRun, targetID, "")
		if err != nil {
			callback("Error: " + err.Error())
			return
		}
		if !ok {
			callback("Error: unknown run target")
			return
		}
		s.stopRunTarget(a, target, logPath, callback)
		return
	}
	stopped := false
	if s.IsShellTmuxRunActive(a.Ident) {
		if err := s.StopShellTmuxRun(a.Ident); err != nil {
			callback("Error: " + err.Error())
			return
		}
		stopped = true
	}
	targets, err := s.resourceMgr.DiscoverActionTargets(a.Ident, a.LocalDirectoryPath, resources.AppActionRun)
	if err == nil {
		for _, target := range targets {
			if target.Runtime == resources.ActionRuntimeKubernetes && target.Kubernetes != nil && !strings.HasPrefix(s.kubernetesTargetStatus(target.Kubernetes), "stopped") {
				s.stopRunTarget(a, target, logPath, callback)
				stopped = true
			}
		}
	}
	if !stopped {
		composeArgs := []string{"-p", "devenv", "down", "--remove-orphans"}
		if envFilePath, ok := s.resourceMgr.EnvFilePath(); ok {
			composeArgs = []string{"-p", "devenv", "--env-file", envFilePath, "down", "--remove-orphans"}
		}
		if runErr, _ := s.executor.RunCommandWithLoggingToFile(a.Ident, docker.ComposeCommand(), composeArgs, []string{}, a.LocalDirectoryPath, logPath); runErr != nil {
			callback("Error: " + runErr.Error())
			return
		}
	}
	callback("stop successful")
	if s.OnComplete != nil {
		s.OnComplete(a.Ident)
	}
}

func (s *service) stopRunTarget(a *app.App, target resources.ActionTarget, logPath string, callback func(string)) {
	switch target.Runtime {
	case resources.ActionRuntimeKubernetes:
		if target.Kubernetes == nil {
			callback("Error: missing Kubernetes metadata")
			return
		}
		s.stopKubernetesPortForwards(a.Ident)
		runner := k8s.NewRunner(docker.Runtime{Name: docker.RuntimeName(), Command: docker.RuntimeCommand()})
		cmd := runner.HelmCommandFor("uninstall", target.Kubernetes.Release, "--namespace", target.Kubernetes.Namespace, "--ignore-not-found")
		if err, _ := s.executor.RunCommandWithLoggingToFile(a.Ident, cmd.Name, cmd.Args, cmd.Env, a.LocalDirectoryPath, logPath); err != nil {
			callback("Error: " + err.Error())
			return
		}
	case resources.ActionRuntimeShell, resources.ActionRuntimePowerShell, resources.ActionRuntimeSystemShell:
		if err := s.StopShellTmuxRun(a.Ident); err != nil {
			callback("Error: " + err.Error())
			return
		}
	case resources.ActionRuntimeDocker:
		composeArgs := []string{"-p", "devenv", "-f", target.SourcePath, "down", "--remove-orphans"}
		if envFilePath, ok := s.resourceMgr.EnvFilePath(); ok {
			composeArgs = []string{"-p", "devenv", "--env-file", envFilePath, "-f", target.SourcePath, "down", "--remove-orphans"}
		}
		if err, _ := s.executor.RunCommandWithLoggingToFile(a.Ident, docker.ComposeCommand(), composeArgs, []string{}, a.LocalDirectoryPath, logPath); err != nil {
			callback("Error: " + err.Error())
			return
		}
	default:
		callback(fmt.Sprintf("Error: unsupported runtime %s", target.Runtime))
	}
}
