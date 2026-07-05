package build

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/friendsfriend/devenv/pkg/app"
	"github.com/friendsfriend/devenv/pkg/docker"
	k8s "github.com/friendsfriend/devenv/pkg/kubernetes"
	"github.com/friendsfriend/devenv/pkg/resources"
)

func (s *service) runKubernetesTarget(a *app.App, target resources.ActionTarget, logPath string, statusCb func(string)) {
	if target.Kubernetes == nil {
		statusCb("Error: missing Kubernetes target metadata")
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
	if !s.applyKubernetesSecrets(a, target, runner, logPath, statusCb) {
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
		cleanupDockerfile := s.prepareKubernetesDockerfile(a, target, statusCb)
		if cleanupDockerfile != nil {
			defer cleanupDockerfile()
		}
		if plan, ok := k8s.ResolveImageBuild(a.Ident, a.LocalDirectoryPath, target.Kubernetes.Image, docker.RuntimeCommand()); ok {
			statusCb("building Kubernetes image...")
			if runErr, _ := s.executor.RunCommandWithLoggingToFile(a.Ident, plan.Command.Name, plan.Command.Args, plan.Command.Env, a.LocalDirectoryPath, logPath); runErr != nil {
				statusCb("Error: " + runErr.Error())
				return
			}
			statusCb("loading image into kind...")
			if !s.loadKubernetesImage(a, runner, plan.Image, logPath, statusCb) {
				return
			}
			args = append(args, k8s.HelmImageOverrides(*target.Kubernetes.Image, plan)...)
		} else if plan, ok := k8s.ResolveImageReference(a.Ident, target.Kubernetes.Image, docker.RuntimeCommand()); ok {
			statusCb("loading existing image into kind...")
			if !s.loadKubernetesImage(a, runner, plan.Image, logPath, statusCb) {
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
	s.setLastKubernetesTarget(a.Ident, target.Kubernetes)
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
	err, output := s.executor.RunCommandSilent(get.Name, get.Args, get.Env, a.LocalDirectoryPath)
	s.logSilentCommand(logPath, get.Name, get.Args, get.Env, a.LocalDirectoryPath, output, err)
	if err == nil {
		for _, line := range strings.Split(output, "\n") {
			if strings.TrimSpace(line) == k8s.DefaultClusterName {
				statusCb("using existing kind cluster")
				s.refreshKindKubeconfig(a, runner, logPath)
				return true
			}
		}
	}
	statusCb("creating kind cluster...")
	create := runner.KindCreateClusterCommand()
	if runErr, output := s.executor.RunCommandWithLoggingToFile(a.Ident, create.Name, create.Args, create.Env, a.LocalDirectoryPath, logPath); runErr != nil {
		if strings.Contains(output, "already exist") || strings.Contains(output, "already exists") {
			statusCb("using existing kind cluster")
			s.refreshKindKubeconfig(a, runner, logPath)
			return true
		}
		statusCb("Error: " + runErr.Error())
		return false
	}
	s.refreshKindKubeconfig(a, runner, logPath)
	return true
}

func (s *service) refreshKindKubeconfig(a *app.App, runner k8s.Runner, logPath string) {
	cmd := runner.KindExportKubeconfigCommand()
	err, output := s.executor.RunCommandSilent(cmd.Name, cmd.Args, cmd.Env, a.LocalDirectoryPath)
	s.logSilentCommand(logPath, cmd.Name, cmd.Args, cmd.Env, a.LocalDirectoryPath, output, err)
}

func (s *service) applyKubernetesSecrets(a *app.App, target resources.ActionTarget, runner k8s.Runner, logPath string, statusCb func(string)) bool {
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
		deleteErr, deleteOut := s.executor.RunCommandSilent(deleteCmd.Name, deleteCmd.Args, deleteCmd.Env, a.LocalDirectoryPath)
		s.logSilentCommand(logPath, deleteCmd.Name, deleteCmd.Args, deleteCmd.Env, a.LocalDirectoryPath, deleteOut, deleteErr)
		if deleteErr != nil {
			statusCb("Error: " + deleteErr.Error())
			return false
		}
		createCmd := plan.Command
		createCmd.Args = secretCreateArgs(plan)
		createErr, createOut := s.executor.RunCommandSilent(createCmd.Name, createCmd.Args, createCmd.Env, a.LocalDirectoryPath)
		s.logSilentCommand(logPath, createCmd.Name, k8s.RedactSecretCommand(plan).Args, createCmd.Env, a.LocalDirectoryPath, createOut, createErr)
		if createErr != nil {
			statusCb("Error: " + createErr.Error())
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

func (s *service) ClearKubernetesRuntimeState() {
	s.portForwardMu.Lock()
	all := s.portForwards
	s.portForwards = make(map[string][]*exec.Cmd)
	s.portForwardMu.Unlock()
	for _, cmds := range all {
		for _, cmd := range cmds {
			if cmd != nil && cmd.Process != nil {
				_ = cmd.Process.Kill()
				_, _ = cmd.Process.Wait()
			}
		}
	}
	s.lastRunMu.Lock()
	for appIdent, runtime := range s.lastRunRuntime {
		if runtime == resources.ActionRuntimeKubernetes {
			delete(s.lastRunRuntime, appIdent)
		}
	}
	s.lastKubernetes = make(map[string]*resources.KubernetesTargetMetadata)
	s.lastRunMu.Unlock()
}

func (s *service) logSilentCommand(logPath, command string, args []string, envVars []string, workingDir, output string, err error) {
	if logPath == "" {
		return
	}
	timestamp := func() string { return time.Now().Format("2006-01-02 15:04:05") }
	s.appendOperationLog(logPath, "[%s] Command: %s\n", timestamp(), shellQuoteForActionLog(command, args))
	if workingDir != "" {
		s.appendOperationLog(logPath, "[%s] Working directory: %s\n", timestamp(), workingDir)
	}
	if len(envVars) > 0 {
		s.appendOperationLog(logPath, "[%s] Environment overrides: %s\n", timestamp(), strings.Join(envVars, " "))
	}
	s.appendOperationLog(logPath, "[%s] Output:\n%s", timestamp(), output)
	if output != "" && !strings.HasSuffix(output, "\n") {
		s.appendOperationLog(logPath, "\n")
	}
	if err != nil {
		s.appendOperationLog(logPath, "[%s] Exit: ERROR (%s)\n", timestamp(), err.Error())
	} else {
		s.appendOperationLog(logPath, "[%s] Exit: SUCCESS\n", timestamp())
	}
	s.appendOperationLog(logPath, "[%s] ---\n\n", timestamp())
}

func shellQuoteForActionLog(command string, args []string) string {
	parts := make([]string, 0, len(args)+1)
	parts = append(parts, strconv.Quote(command))
	for _, arg := range args {
		parts = append(parts, strconv.Quote(arg))
	}
	return strings.Join(parts, " ")
}

func (s *service) prepareKubernetesDockerfile(a *app.App, target resources.ActionTarget, statusCb func(string)) func() {
	if target.Kubernetes == nil || target.Kubernetes.Image == nil || target.Kubernetes.Image.Build == nil {
		return nil
	}
	dockerfile := target.Kubernetes.Image.Build.Dockerfile
	if dockerfile == "" || !filepath.IsAbs(dockerfile) || strings.HasPrefix(filepath.Clean(dockerfile), filepath.Clean(a.LocalDirectoryPath)+string(os.PathSeparator)) {
		return nil
	}
	localDockerfile := filepath.Join(a.LocalDirectoryPath, ".devenv-k8s.Dockerfile")
	if err := s.resourceMgr.CopyFile(dockerfile, localDockerfile); err != nil {
		statusCb("Error: " + err.Error())
		return nil
	}
	target.Kubernetes.Image.Build.Dockerfile = localDockerfile
	return func() {
		_ = os.Remove(localDockerfile)
	}
}

func (s *service) loadKubernetesImage(a *app.App, runner k8s.Runner, image, logPath string, statusCb func(string)) bool {
	if docker.RuntimeName() == "podman" {
		archive := filepath.Join(os.TempDir(), fmt.Sprintf("devenv-%s-%d.tar", strings.ReplaceAll(a.Ident, string(os.PathSeparator), "-"), time.Now().UnixNano()))
		defer os.Remove(archive)
		saveArgs := []string{"save", "-o", archive, image}
		if runErr, _ := s.executor.RunCommandWithLoggingToFile(a.Ident, docker.RuntimeCommand(), saveArgs, []string{}, a.LocalDirectoryPath, logPath); runErr != nil {
			statusCb("Error: " + runErr.Error())
			return false
		}
		load := runner.KindLoadImageArchiveCommand(archive)
		if runErr, _ := s.executor.RunCommandWithLoggingToFile(a.Ident, load.Name, load.Args, load.Env, a.LocalDirectoryPath, logPath); runErr != nil {
			statusCb("Error: " + runErr.Error())
			return false
		}
		return true
	}
	load := runner.KindLoadImageCommand(image)
	if runErr, _ := s.executor.RunCommandWithLoggingToFile(a.Ident, load.Name, load.Args, load.Env, a.LocalDirectoryPath, logPath); runErr != nil {
		statusCb("Error: " + runErr.Error())
		return false
	}
	return true
}
