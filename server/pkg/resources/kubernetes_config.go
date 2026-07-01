package resources

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const KubernetesConfigFileName = "devenv.k8s.json"

// KubernetesRunTargetConfig describes one Helm-backed app run target.
type KubernetesRunTargetConfig struct {
	Profile   string                        `json:"profile,omitempty"`
	Name      string                        `json:"name,omitempty"`
	Chart     KubernetesHelmChartConfig     `json:"chart"`
	Release   string                        `json:"release,omitempty"`
	Namespace string                        `json:"namespace,omitempty"`
	Values    []string                      `json:"values,omitempty"`
	Image     *KubernetesImageConfig        `json:"image,omitempty"`
	Secrets   []KubernetesSecretConfig      `json:"secrets,omitempty"`
	Wait      KubernetesWaitConfig          `json:"wait,omitempty"`
	Ports     []KubernetesPortForwardConfig `json:"ports,omitempty"`
	Requires  []DependencyRef               `json:"requires,omitempty"`
}

// KubernetesHelmChartConfig describes Helm chart location and values.
type KubernetesHelmChartConfig struct {
	Path   string   `json:"path,omitempty"`
	Values []string `json:"values,omitempty"`
}

// KubernetesImageConfig describes optional local image build/load behavior.
type KubernetesImageConfig struct {
	Build      *KubernetesImageBuildConfig `json:"build,omitempty"`
	Repository string                      `json:"repository,omitempty"`
	Tag        string                      `json:"tag,omitempty"`
	PullPolicy string                      `json:"pullPolicy,omitempty"`
	ValuePaths KubernetesImageValuePaths   `json:"valuePaths,omitempty"`
}

type KubernetesImageBuildConfig struct {
	Context    string `json:"context,omitempty"`
	Dockerfile string `json:"dockerfile,omitempty"`
	Enabled    *bool  `json:"enabled,omitempty"`
}

type KubernetesImageValuePaths struct {
	Repository string `json:"repository,omitempty"`
	Tag        string `json:"tag,omitempty"`
	PullPolicy string `json:"pullPolicy,omitempty"`
}

// KubernetesSecretConfig allowlists .env keys for one Kubernetes Secret.
type KubernetesSecretConfig struct {
	Name string   `json:"name"`
	Keys []string `json:"keys"`
}

type KubernetesWaitConfig struct {
	Enabled *bool  `json:"enabled,omitempty"`
	Timeout string `json:"timeout,omitempty"`
}

type KubernetesPortForwardConfig struct {
	Name       string `json:"name,omitempty"`
	Resource   string `json:"resource"`
	LocalPort  int    `json:"localPort"`
	RemotePort int    `json:"remotePort"`
}

// KubernetesInfrastructureServiceConfig describes one Helm-backed infra target.
type KubernetesInfrastructureServiceConfig struct {
	Ident     string                        `json:"ident,omitempty"`
	Profile   string                        `json:"profile,omitempty"`
	Chart     KubernetesHelmChartConfig     `json:"chart"`
	Release   string                        `json:"release,omitempty"`
	Namespace string                        `json:"namespace,omitempty"`
	Values    []string                      `json:"values,omitempty"`
	Secrets   []KubernetesSecretConfig      `json:"secrets,omitempty"`
	Wait      KubernetesWaitConfig          `json:"wait,omitempty"`
	Ports     []KubernetesPortForwardConfig `json:"ports,omitempty"`
}

type KubernetesConfig struct {
	Targets        []KubernetesRunTargetConfig             `json:"targets,omitempty"`
	Infrastructure []KubernetesInfrastructureServiceConfig `json:"infrastructure,omitempty"`
}

func LoadKubernetesConfig(path, appDir, configDir string) (KubernetesConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return KubernetesConfig{}, err
	}
	var cfg KubernetesConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return KubernetesConfig{}, fmt.Errorf("parse %s: %w", path, err)
	}
	baseDir := filepath.Dir(path)
	for i := range cfg.Targets {
		expandRunTargetPaths(&cfg.Targets[i], appDir, configDir, baseDir)
	}
	for i := range cfg.Infrastructure {
		expandInfraPaths(&cfg.Infrastructure[i], appDir, configDir, baseDir)
	}
	return cfg, nil
}

func expandRunTargetPaths(target *KubernetesRunTargetConfig, appDir, configDir, baseDir string) {
	target.Chart.Path = expandKubernetesPath(target.Chart.Path, appDir, configDir, baseDir)
	expandStringSlice(target.Chart.Values, appDir, configDir, baseDir)
	expandStringSlice(target.Values, appDir, configDir, baseDir)
	if target.Image != nil && target.Image.Build != nil {
		target.Image.Build.Context = expandKubernetesPath(target.Image.Build.Context, appDir, configDir, baseDir)
		target.Image.Build.Dockerfile = expandKubernetesPath(target.Image.Build.Dockerfile, appDir, configDir, baseDir)
	}
}

func expandInfraPaths(target *KubernetesInfrastructureServiceConfig, appDir, configDir, baseDir string) {
	target.Chart.Path = expandKubernetesPath(target.Chart.Path, appDir, configDir, baseDir)
	expandStringSlice(target.Chart.Values, appDir, configDir, baseDir)
	expandStringSlice(target.Values, appDir, configDir, baseDir)
}

func expandStringSlice(values []string, appDir, configDir, baseDir string) {
	for i := range values {
		values[i] = expandKubernetesPath(values[i], appDir, configDir, baseDir)
	}
}

func expandKubernetesPath(value, appDir, configDir, baseDir string) string {
	if value == "" {
		return ""
	}
	value = strings.ReplaceAll(value, "$APP", appDir)
	value = strings.ReplaceAll(value, "$CONFIG", configDir)
	if filepath.IsAbs(value) {
		return filepath.Clean(value)
	}
	return filepath.Clean(filepath.Join(baseDir, value))
}
