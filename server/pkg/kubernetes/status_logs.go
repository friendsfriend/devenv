package kubernetes

import (
	"strconv"
	"strings"

	"github.com/friendsfriend/devenv/pkg/app"
	"github.com/friendsfriend/devenv/pkg/resources"
)

func HelmStatusCommand(r Runner, release, namespace string) Command {
	return r.HelmCommandFor("status", release, "--namespace", namespace, "-o", "json")
}

func ReleaseDiagnosticsCommands(r Runner, release, namespace string) []Command {
	selector := "app.kubernetes.io/instance=" + release
	return []Command{
		r.KubectlCommandFor("get", "pods", "--namespace", namespace, "-l", selector, "-o", "wide"),
		r.KubectlCommandFor("get", "jobs", "--namespace", namespace, "-l", selector, "-o", "wide"),
		r.KubectlCommandFor("get", "events", "--namespace", namespace, "--sort-by=.lastTimestamp"),
	}
}

func MapHelmStatus(output string, err error) string {
	if err != nil {
		return app.InfraStatusStopped
	}
	lower := strings.ToLower(output)
	if strings.Contains(lower, "failed") || strings.Contains(lower, "pending-install") || strings.Contains(lower, "pending-upgrade") {
		return app.InfraStatusFailed
	}
	if strings.Contains(lower, "deployed") {
		return app.InfraStatusRunning
	}
	return app.InfraStatusStopped
}

func LogsCommand(r Runner, release, namespace string, selectors []string) Command {
	selector := "app.kubernetes.io/instance=" + release
	if len(selectors) > 0 && strings.TrimSpace(selectors[0]) != "" {
		selector = selectors[0]
	}
	return r.KubectlCommandFor("logs", "--namespace", namespace, "-l", selector, "--all-containers", "--tail", "200")
}

func PortForwardCommand(r Runner, namespace string, port resources.KubernetesPortForwardConfig) Command {
	return r.KubectlCommandFor("port-forward", "--namespace", namespace, port.Resource, intString(port.LocalPort)+":"+intString(port.RemotePort))
}

func intString(v int) string {
	return strconv.Itoa(v)
}
