package operations

import (
	"github.com/friendsfriend/devenv/pkg/app"
	"github.com/friendsfriend/devenv/pkg/docker"
	k8s "github.com/friendsfriend/devenv/pkg/kubernetes"
	"github.com/friendsfriend/devenv/pkg/status"
)

func (s *service) StartKubernetesInfrastructureServiceWithStatus(infra app.InfraService) error {
	callback := s.statusMgr.StartOperation(infra.Ident, status.OpStart)
	callback("starting Kubernetes infrastructure...")
	if infra.Kubernetes == nil {
		callback("Error: missing Kubernetes infrastructure config")
		return nil
	}
	runner := k8s.NewRunner(docker.Runtime{Name: docker.RuntimeName(), Command: docker.RuntimeCommand()})
	if err := runner.Preflight(); err != nil {
		callback("Error: " + err.Error())
		return err
	}
	statusCmd := runner.HelmCommandFor("status", infra.Kubernetes.Release, "--namespace", infra.Kubernetes.Namespace)
	if err, _ := s.executor.RunCommandSilent(statusCmd.Name, statusCmd.Args, statusCmd.Env, ""); err == nil {
		callback("already running")
		return nil
	}
	args := []string{"install", infra.Kubernetes.Release, infra.Kubernetes.ChartPath, "--namespace", infra.Kubernetes.Namespace, "--create-namespace"}
	for _, values := range infra.Kubernetes.Values {
		args = append(args, "-f", values)
	}
	if infra.Kubernetes.Wait {
		timeout := infra.Kubernetes.Timeout
		if timeout == "" {
			timeout = "5m"
		}
		args = append(args, "--wait", "--timeout", timeout)
	}
	cmd := runner.HelmCommandFor(args...)
	if err, _ := s.executor.RunCommandWithLogging(infra.Ident, cmd.Name, cmd.Args, cmd.Env, ""); err != nil {
		callback("Error: " + err.Error())
		return err
	}
	callback("start successful")
	if s.OnComplete != nil {
		s.OnComplete(infra.Ident)
	}
	return nil
}

func (s *service) StopKubernetesInfrastructureServiceWithStatus(infra app.InfraService) error {
	callback := s.statusMgr.StartOperation(infra.Ident, status.OpStop)
	callback("stopping Kubernetes infrastructure...")
	if infra.Kubernetes == nil {
		callback("Error: missing Kubernetes infrastructure config")
		return nil
	}
	runner := k8s.NewRunner(docker.Runtime{Name: docker.RuntimeName(), Command: docker.RuntimeCommand()})
	cmd := runner.HelmCommandFor("uninstall", infra.Kubernetes.Release, "--namespace", infra.Kubernetes.Namespace, "--ignore-not-found")
	if err, _ := s.executor.RunCommandWithLogging(infra.Ident, cmd.Name, cmd.Args, cmd.Env, ""); err != nil {
		callback("Error: " + err.Error())
		return err
	}
	callback("stop successful")
	if s.OnComplete != nil {
		s.OnComplete(infra.Ident)
	}
	return nil
}
