package resources

import (
	"bufio"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// AppAction identifies a user-invoked app operation.
type AppAction string

const (
	AppActionBuild AppAction = "build"
	AppActionTest  AppAction = "test"
	AppActionRun   AppAction = "run"
)

// ActionRuntime identifies how an action target executes.
type ActionRuntime string

const (
	ActionRuntimeDocker ActionRuntime = "docker"
	ActionRuntimeShell  ActionRuntime = "shell"
)

// LaunchMode identifies how a shell action target launches.
type LaunchMode string

const (
	LaunchModeLogged LaunchMode = "logged"
	LaunchModeTmux   LaunchMode = "tmux"
)

// ActionTarget is normalized action target data for clients.
type ActionTarget struct {
	ID         string        `json:"id"`
	Action     AppAction     `json:"action"`
	Runtime    ActionRuntime `json:"runtime"`
	Label      string        `json:"label"`
	Profile    string        `json:"profile,omitempty"`
	LaunchMode LaunchMode    `json:"launchMode,omitempty"`
	SourcePath string        `json:"sourcePath"`
}

type shellScriptMetadata struct {
	Name string
	Mode LaunchMode
}

// DiscoverActionTargets returns configured action targets for app/action.
func (m *manager) DiscoverActionTargets(appIdent, localDir string, action AppAction) ([]ActionTarget, error) {
	var targets []ActionTarget

	switch action {
	case AppActionBuild, AppActionTest:
		dockerTarget, ok, err := m.discoverDockerBuildTestTarget(appIdent, action)
		if err != nil {
			return nil, err
		}
		if ok {
			targets = append(targets, dockerTarget)
		}
		shellTarget, ok, err := m.discoverShellBuildTestTarget(appIdent, action)
		if err != nil {
			return nil, err
		}
		if ok {
			targets = append(targets, shellTarget)
		}
	case AppActionRun:
		dockerTargets, err := m.discoverDockerRunTargets(appIdent)
		if err != nil {
			return nil, err
		}
		targets = append(targets, dockerTargets...)
		shellTargets, err := m.discoverShellRunTargets(appIdent)
		if err != nil {
			return nil, err
		}
		targets = append(targets, shellTargets...)
	default:
		return nil, fmt.Errorf("unsupported app action %q", action)
	}

	sort.SliceStable(targets, func(i, j int) bool {
		if targets[i].Runtime != targets[j].Runtime {
			return targets[i].Runtime < targets[j].Runtime
		}
		return targets[i].ID < targets[j].ID
	})
	return targets, nil
}

func (m *manager) discoverDockerBuildTestTarget(appIdent string, action AppAction) (ActionTarget, bool, error) {
	path := filepath.Join(m.configDir, "apps", "build", fmt.Sprintf("%s-%s.Dockerfile", appIdent, action))
	if _, err := os.Stat(path); err == nil {
		return ActionTarget{ID: actionTargetID(action, ActionRuntimeDocker, ""), Action: action, Runtime: ActionRuntimeDocker, Label: "Docker", SourcePath: path}, true, nil
	} else if !errors.Is(err, fs.ErrNotExist) {
		return ActionTarget{}, false, err
	}
	return ActionTarget{}, false, nil
}

func (m *manager) discoverShellBuildTestTarget(appIdent string, action AppAction) (ActionTarget, bool, error) {
	path := filepath.Join(m.configDir, "apps", "build", fmt.Sprintf("%s-%s.sh", appIdent, action))
	if _, err := os.Stat(path); err == nil {
		meta, err := parseShellScriptMetadata(path, LaunchModeLogged)
		if err != nil {
			return ActionTarget{}, false, err
		}
		label := meta.Name
		if label == "" {
			label = "Shell"
		}
		return ActionTarget{ID: actionTargetID(action, ActionRuntimeShell, ""), Action: action, Runtime: ActionRuntimeShell, Label: label, LaunchMode: meta.Mode, SourcePath: path}, true, nil
	} else if !errors.Is(err, fs.ErrNotExist) {
		return ActionTarget{}, false, err
	}
	return ActionTarget{}, false, nil
}

func (m *manager) discoverDockerRunTargets(appIdent string) ([]ActionTarget, error) {
	composeDir := filepath.Join(m.configDir, "apps", "compose")
	entries, err := os.ReadDir(composeDir)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil, nil
		}
		return nil, fmt.Errorf("reading compose directory: %w", err)
	}

	var targets []ActionTarget
	defaultNames := map[string]bool{
		appIdent + "-compose.yml":  true,
		appIdent + "-compose.yaml": true,
	}
	prefix := appIdent + "-"
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		path := filepath.Join(composeDir, name)
		if defaultNames[name] {
			targets = append(targets, ActionTarget{ID: actionTargetID(AppActionRun, ActionRuntimeDocker, "default"), Action: AppActionRun, Runtime: ActionRuntimeDocker, Label: "default", Profile: "", SourcePath: path})
			continue
		}
		for _, suffix := range []string{"-compose.yml", "-compose.yaml"} {
			if strings.HasPrefix(name, prefix) && strings.HasSuffix(name, suffix) && len(name) > len(prefix)+len(suffix) {
				profile := name[len(prefix) : len(name)-len(suffix)]
				targets = append(targets, ActionTarget{ID: actionTargetID(AppActionRun, ActionRuntimeDocker, profile), Action: AppActionRun, Runtime: ActionRuntimeDocker, Label: profile, Profile: profile, SourcePath: path})
			}
		}
	}
	return targets, nil
}

func (m *manager) discoverShellRunTargets(appIdent string) ([]ActionTarget, error) {
	runDir := filepath.Join(m.configDir, "apps", "run")
	entries, err := os.ReadDir(runDir)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil, nil
		}
		return nil, fmt.Errorf("reading run directory: %w", err)
	}

	prefix := appIdent + "-"
	suffix := ".sh"
	var targets []ActionTarget
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasPrefix(name, prefix) || !strings.HasSuffix(name, suffix) || len(name) <= len(prefix)+len(suffix) {
			continue
		}
		profile := name[len(prefix) : len(name)-len(suffix)]
		path := filepath.Join(runDir, name)
		meta, err := parseShellScriptMetadata(path, LaunchModeTmux)
		if err != nil {
			return nil, err
		}
		label := meta.Name
		if label == "" {
			label = profile
		}
		targets = append(targets, ActionTarget{ID: actionTargetID(AppActionRun, ActionRuntimeShell, profile), Action: AppActionRun, Runtime: ActionRuntimeShell, Label: label, Profile: profile, LaunchMode: meta.Mode, SourcePath: path})
	}
	return targets, nil
}

func parseShellScriptMetadata(path string, defaultMode LaunchMode) (shellScriptMetadata, error) {
	file, err := os.Open(path)
	if err != nil {
		return shellScriptMetadata{}, err
	}
	defer file.Close()

	meta := shellScriptMetadata{Mode: defaultMode}
	scanner := bufio.NewScanner(file)
	lines := 0
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		lines++
		if lines > 20 {
			break
		}
		if line == "" || strings.HasPrefix(line, "#!") {
			continue
		}
		if !strings.HasPrefix(line, "#") {
			break
		}
		comment := strings.TrimSpace(strings.TrimPrefix(line, "#"))
		if strings.HasPrefix(comment, "devenv:name=") {
			meta.Name = strings.TrimSpace(strings.TrimPrefix(comment, "devenv:name="))
		}
		if strings.HasPrefix(comment, "devenv:mode=") {
			meta.Mode = LaunchMode(strings.TrimSpace(strings.TrimPrefix(comment, "devenv:mode=")))
		}
	}
	if err := scanner.Err(); err != nil {
		return shellScriptMetadata{}, err
	}
	return meta, nil
}

func actionTargetID(action AppAction, runtime ActionRuntime, profile string) string {
	if profile == "" {
		return fmt.Sprintf("%s:%s", action, runtime)
	}
	return fmt.Sprintf("%s:%s:%s", action, runtime, profile)
}
