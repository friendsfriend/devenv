package build

import (
	"fmt"
	"os/exec"
	"strings"

	"github.com/friendsfriend/devenv/pkg/app"
	"github.com/friendsfriend/devenv/pkg/docker"
	k8s "github.com/friendsfriend/devenv/pkg/kubernetes"
	"github.com/friendsfriend/devenv/pkg/resources"
)

func (s *service) runKubernetesTarget(a *app.App, target resources.ActionTarget, statusCb func(string)) {
	if target.Kubernetes == nil {
		statusCb("Error: missing Kubernetes target metadata")
		return
	}
	logPath, err := s.startOperationLog(a.Ident, "run")
	if err != nil {
		statusCb("Error: " + err.Error())
		return
	}
	runner := k8s.NewRunner(docker.Runtime{Name: docker.RuntimeName(), Command: docker.RuntimeCommand()})
	statusCb("checking Kubernetes tools...")
	if err := runner.Preflight(); err != nil {
		statusCb("Error: " + err.Error())
		return
	}
	if !s.ensureKubernetesCluster(a, runner, logPath, statusCb) {
		return
	}
	if !s.applyKubernetesSecrets(a, target, runner, statusCb) {
		return
	}
	statusCb("uninstalling existing Helm release...")
	uninstall := runner.HelmCommandFor("uninstall", target.Kubernetes.Release, "--namespace", target.Kubernetes.Namespace, "--ignore-not-found")
	if runErr, _ := s.executor.RunCommandWithLoggingToFile(a.Ident, uninstall.Name, uninstall.Args, uninstall.Env, a.LocalDirectoryPath, logPath); runErr != nil {
		statusCb("Error: " + runErr.Error())
		return
	}
	args := []string{"install", target.Kubernetes.Release, target.Kubernetes.ChartPath, "--namespace", target.Kubernetes.Namespace, "--create-namespace"}
	for _, values := range target.Kubernetes.ValuesFiles {
		args = append(args, "-f", values)
	}
	if target.Kubernetes.Image != nil {
		if plan, ok := k8s.ResolveImageBuild(a.Ident, a.LocalDirectoryPath, target.Kubernetes.Image, docker.RuntimeCommand()); ok {
			statusCb("building Kubernetes image...")
			if runErr, _ := s.executor.RunCommandWithLoggingToFile(a.Ident, plan.Command.Name, plan.Command.Args, plan.Command.Env, a.LocalDirectoryPath, logPath); runErr != nil {
				statusCb("Error: " + runErr.Error())
				return
			}
			load := runner.KindLoadImageCommand(plan.Image)
			statusCb("loading image into kind...")
			if runErr, _ := s.executor.RunCommandWithLoggingToFile(a.Ident, load.Name, load.Args, load.Env, a.LocalDirectoryPath, logPath); runErr != nil {
				statusCb("Error: " + runErr.Error())
				return
			}
			args = append(args, k8s.HelmImageOverrides(*target.Kubernetes.Image, plan)...)
		}
	}
	args = append(args, kubernetesWaitArgs(target.Kubernetes.Wait)...)
	statusCb("installing Helm release...")
	install := runner.HelmCommandFor(args...)
	if runErr, _ := s.executor.RunCommandWithLoggingToFile(a.Ident, install.Name, install.Args, install.Env, a.LocalDirectoryPath, logPath); runErr != nil {
		statusCb("Error: Helm install failed: " + runErr.Error())
		return
	}
	s.startKubernetesPortForwards(a.Ident, target, runner, statusCb)
	s.SetLastRunRuntime(a.Ident, resources.ActionRuntimeKubernetes)
	statusCb("run successful")
	if s.OnComplete != nil {
		s.OnComplete(a.Ident)
	}
}

func (s *service) StopKubernetesRun(a app.App, target resources.ActionTarget) error {
	if target.Kubernetes == nil {
		return fmt.Errorf("missing Kubernetes target metadata")
	}
	s.stopKubernetesPortForwards(a.Ident)
	runner := k8s.NewRunner(docker.Runtime{Name: docker.RuntimeName(), Command: docker.RuntimeCommand()})
	cmd := runner.HelmCommandFor("uninstall", target.Kubernetes.Release, "--namespace", target.Kubernetes.Namespace, "--ignore-not-found")
	if err, _ := s.executor.RunCommandWithLogging(a.Ident, cmd.Name, cmd.Args, cmd.Env, a.LocalDirectoryPath); err != nil {
		return err
	}
	return nil
}

func (s *service) ensureKubernetesCluster(a *app.App, runner k8s.Runner, logPath string, statusCb func(string)) bool {
	statusCb("checking kind cluster...")
	get := runner.KindGetClustersCommand()
	if err, output := s.executor.RunCommandSilent(get.Name, get.Args, get.Env, a.LocalDirectoryPath); err == nil {
		for _, line := range strings.Split(output, "\n") {
			if strings.TrimSpace(line) == k8s.DefaultClusterName {
				statusCb("using existing kind cluster")
				return true
			}
		}
	}
	statusCb("creating kind cluster...")
	create := runner.KindCreateClusterCommand()
	if runErr, _ := s.executor.RunCommandWithLoggingToFile(a.Ident, create.Name, create.Args, create.Env, a.LocalDirectoryPath, logPath); runErr != nil {
		statusCb("Error: " + runErr.Error())
		return false
	}
	return true
}

func (s *service) applyKubernetesSecrets(a *app.App, target resources.ActionTarget, runner k8s.Runner, statusCb func(string)) bool {
	if target.Kubernetes == nil || len(target.Kubernetes.Secrets) == 0 {
		return true
	}
	env := map[string]string{}
	if envPath, ok := s.resourceMgr.EnvFilePath(); ok {
		loaded, err := resources.LoadEnvFile(envPath)
		if err != nil {
			statusCb("Error: " + err.Error())
			return false
		}
		env = loaded
	}
	secrets := make([]resources.KubernetesSecretConfig, 0, len(target.Kubernetes.Secrets))
	for _, secret := range target.Kubernetes.Secrets {
		secrets = append(secrets, resources.KubernetesSecretConfig{Name: secret.Name, Keys: secret.Keys})
	}
	plans, err := k8s.BuildSecretPlans(runner, target.Kubernetes.Namespace, secrets, env)
	if err != nil {
		statusCb("Error: " + err.Error())
		return false
	}
	for _, plan := range plans {
		statusCb(fmt.Sprintf("creating Kubernetes Secret %s with keys %s...", plan.Name, strings.Join(plan.Keys, ",")))
		deleteCmd := runner.KubectlCommandFor("delete", "secret", plan.Name, "--namespace", plan.Namespace, "--ignore-not-found")
		if runErr, _ := s.executor.RunCommandSilent(deleteCmd.Name, deleteCmd.Args, deleteCmd.Env, a.LocalDirectoryPath); runErr != nil {
			statusCb("Error: " + runErr.Error())
			return false
		}
		createCmd := plan.Command
		createCmd.Args = secretCreateArgs(plan)
		if runErr, _ := s.executor.RunCommandSilent(createCmd.Name, createCmd.Args, createCmd.Env, a.LocalDirectoryPath); runErr != nil {
			statusCb("Error: " + runErr.Error())
			return false
		}
	}
	return true
}

func secretCreateArgs(plan k8s.SecretApplyPlan) []string {
	args := []string{"--context", k8s.DefaultContextName, "create", "secret", "generic", plan.Name, "--namespace", plan.Namespace}
	for _, key := range plan.Keys {
		args = append(args, "--from-literal", key+"="+plan.Values[key])
	}
	return args
}

func kubernetesWaitArgs(wait resources.KubernetesWaitConfig) []string {
	if wait.Enabled != nil && !*wait.Enabled {
		return nil
	}
	timeout := wait.Timeout
	if timeout == "" {
		timeout = "5m"
	}
	return []string{"--wait", "--timeout", timeout}
}

func (s *service) startKubernetesPortForwards(appIdent string, target resources.ActionTarget, runner k8s.Runner, statusCb func(string)) {
	if target.Kubernetes == nil || len(target.Kubernetes.Ports) == 0 {
		return
	}
	s.stopKubernetesPortForwards(appIdent)
	for _, port := range target.Kubernetes.Ports {
		cmdSpec := k8s.PortForwardCommand(runner, target.Kubernetes.Namespace, port)
		cmd := exec.Command(cmdSpec.Name, cmdSpec.Args...)
		cmd.Env = append(cmd.Env, cmdSpec.Env...)
		if err := cmd.Start(); err != nil {
			statusCb("Port-forward failed: " + err.Error())
			continue
		}
		s.portForwardMu.Lock()
		if s.portForwards == nil {
			s.portForwards = make(map[string][]*exec.Cmd)
		}
		s.portForwards[appIdent] = append(s.portForwards[appIdent], cmd)
		s.portForwardMu.Unlock()
		statusCb(fmt.Sprintf("port-forward %s localhost:%d -> %s:%d", port.Name, port.LocalPort, port.Resource, port.RemotePort))
	}
}

func (s *service) stopKubernetesPortForwards(appIdent string) {
	s.portForwardMu.Lock()
	cmds := s.portForwards[appIdent]
	delete(s.portForwards, appIdent)
	s.portForwardMu.Unlock()
	for _, cmd := range cmds {
		if cmd != nil && cmd.Process != nil {
			_ = cmd.Process.Kill()
			_, _ = cmd.Process.Wait()
		}
	}
}
