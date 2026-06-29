package resources

import (
	"bufio"
	"encoding/json"
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
	Command    string        `json:"command,omitempty"`
	Args       []string      `json:"args,omitempty"`
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
		rootTargets, err := m.discoverRootBuildToolTargets(localDir, action)
		if err != nil {
			return nil, err
		}
		targets = append(targets, rootTargets...)
		languageTargets, err := m.discoverLanguageBuildToolTargets(localDir, action)
		if err != nil {
			return nil, err
		}
		targets = append(targets, languageTargets...)
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
		rootTargets, err := m.discoverRootBuildToolTargets(localDir, action)
		if err != nil {
			return nil, err
		}
		targets = append(targets, rootTargets...)
		languageTargets, err := m.discoverLanguageBuildToolTargets(localDir, action)
		if err != nil {
			return nil, err
		}
		targets = append(targets, languageTargets...)
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

func (m *manager) discoverRootBuildToolTargets(localDir string, action AppAction) ([]ActionTarget, error) {
	if localDir == "" {
		return nil, nil
	}

	var targets []ActionTarget
	for _, candidate := range []struct {
		files   []string
		label   string
		command string
		args    []string
		ok      func(string) (bool, error)
	}{
		{files: []string{"Makefile", "makefile"}, label: "make " + string(action) + " (default for Makefile)", command: "make", args: []string{string(action)}, ok: fileHasMakeTarget(action)},
		{files: []string{"justfile", "Justfile"}, label: "just " + string(action) + " (default for justfile)", command: "just", args: []string{string(action)}, ok: fileHasJustRecipe(action)},
		{files: []string{"Taskfile.yml", "Taskfile.yaml", "Taskfile"}, label: "task " + string(action) + " (default for Taskfile)", command: "task", args: []string{string(action)}, ok: fileHasTask(action)},
	} {
		for _, name := range candidate.files {
			path := filepath.Join(localDir, name)
			if _, err := os.Stat(path); err != nil {
				if errors.Is(err, fs.ErrNotExist) {
					continue
				}
				return nil, err
			}
			ok, err := candidate.ok(path)
			if err != nil {
				return nil, err
			}
			if !ok {
				continue
			}
			profile := strings.TrimSuffix(strings.ToLower(name), filepath.Ext(name))
			if strings.HasPrefix(profile, "makefile") {
				profile = "make"
			}
			if strings.HasPrefix(profile, "justfile") {
				profile = "just"
			}
			if strings.HasPrefix(profile, "taskfile") {
				profile = "task"
			}
			mode := LaunchModeLogged
			if action == AppActionRun {
				mode = LaunchModeTmux
			}
			targets = append(targets, ActionTarget{ID: actionTargetID(action, ActionRuntimeShell, profile), Action: action, Runtime: ActionRuntimeShell, Label: candidate.label, LaunchMode: mode, SourcePath: path, Command: candidate.command, Args: candidate.args})
			break
		}
	}
	return targets, nil
}

func (m *manager) discoverLanguageBuildToolTargets(localDir string, action AppAction) ([]ActionTarget, error) {
	if localDir == "" {
		return nil, nil
	}
	var targets []ActionTarget
	add := func(profile, label, sourcePath, command string, args ...string) {
		mode := LaunchModeLogged
		if action == AppActionRun {
			mode = LaunchModeTmux
		}
		targets = append(targets, ActionTarget{ID: actionTargetID(action, ActionRuntimeShell, profile), Action: action, Runtime: ActionRuntimeShell, Label: label, LaunchMode: mode, SourcePath: sourcePath, Command: command, Args: args})
	}

	packageJSON := filepath.Join(localDir, "package.json")
	if scripts, ok, err := readPackageScripts(packageJSON); err != nil {
		return nil, err
	} else if ok {
		script := string(action)
		if action == AppActionRun {
			script = "dev"
			if _, ok := scripts[script]; !ok {
				script = "start"
			}
		}
		if _, hasScript := scripts[script]; hasScript {
			pm, args := packageManagerCommand(localDir, script)
			add("package-"+pm, pm+" "+script+" (default for package.json)", packageJSON, pm, args...)
		} else if action == AppActionTest {
			pm, _ := packageManagerCommand(localDir, script)
			if pm == "bun" {
				add("package-bun", "bun test (default for package.json)", packageJSON, "bun", "test")
			}
		}
	}

	if path, ok, err := existingFile(localDir, "go.mod"); err != nil {
		return nil, err
	} else if ok {
		if action == AppActionBuild {
			add("go", "go build (default for go.mod)", path, "go", "build", "./...")
		} else if action == AppActionTest {
			add("go", "go test (default for go.mod)", path, "go", "test", "./...")
		} else {
			add("go", "go run . (default for go.mod)", path, "go", "run", ".")
		}
	}

	if path, ok, err := existingFile(localDir, "Cargo.toml"); err != nil {
		return nil, err
	} else if ok {
		add("cargo", "cargo "+string(action)+" (default for Cargo.toml)", path, "cargo", string(action))
	}

	if path, ok, err := existingFile(localDir, "pom.xml"); err != nil {
		return nil, err
	} else if ok {
		if action == AppActionBuild {
			add("maven", "mvn package (default for pom.xml)", path, "mvn", "package")
		} else if action == AppActionTest {
			add("maven", "mvn test (default for pom.xml)", path, "mvn", "test")
		}
	}

	gradlePath, gradleOK, err := existingAnyFile(localDir, "gradlew", "build.gradle", "build.gradle.kts")
	if err != nil {
		return nil, err
	}
	if gradleOK {
		command := "gradle"
		if filepath.Base(gradlePath) == "gradlew" {
			command = "./gradlew"
		}
		add("gradle", command+" "+string(action)+" (default for Gradle)", gradlePath, command, string(action))
	}

	pyPath, pyOK, err := existingFile(localDir, "pyproject.toml")
	if err != nil {
		return nil, err
	}
	if pyOK && action != AppActionRun {
		if _, uvOK, err := existingFile(localDir, "uv.lock"); err != nil {
			return nil, err
		} else if uvOK {
			if action == AppActionBuild {
				add("uv", "uv build (default for pyproject.toml)", pyPath, "uv", "build")
			} else {
				add("uv", "uv run pytest (default for pyproject.toml)", pyPath, "uv", "run", "pytest")
			}
		} else {
			if action == AppActionBuild {
				add("poetry", "poetry build (default for pyproject.toml)", pyPath, "poetry", "build")
			} else {
				add("poetry", "poetry run pytest (default for pyproject.toml)", pyPath, "poetry", "run", "pytest")
			}
		}
	}

	return targets, nil
}

func readPackageScripts(path string) (map[string]string, bool, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil, false, nil
		}
		return nil, false, err
	}
	var pkg struct {
		Scripts map[string]string `json:"scripts"`
	}
	if err := json.Unmarshal(data, &pkg); err != nil {
		return nil, false, err
	}
	return pkg.Scripts, true, nil
}

func packageManagerCommand(localDir string, script string) (string, []string) {
	if packageManager, ok, _ := readPackageManager(filepath.Join(localDir, "package.json")); ok {
		if strings.HasPrefix(packageManager, "bun@") || packageManager == "bun" {
			return "bun", []string{"run", script}
		}
		if strings.HasPrefix(packageManager, "pnpm@") || packageManager == "pnpm" {
			return "pnpm", []string{"run", script}
		}
		if strings.HasPrefix(packageManager, "yarn@") || packageManager == "yarn" {
			return "yarn", []string{script}
		}
		if strings.HasPrefix(packageManager, "npm@") || packageManager == "npm" {
			return "npm", []string{"run", script}
		}
	}
	if _, ok, _ := existingFile(localDir, "bun.lock"); ok {
		return "bun", []string{"run", script}
	}
	if _, ok, _ := existingFile(localDir, "bun.lockb"); ok {
		return "bun", []string{"run", script}
	}
	if _, ok, _ := existingFile(localDir, "pnpm-lock.yaml"); ok {
		return "pnpm", []string{"run", script}
	}
	if _, ok, _ := existingFile(localDir, "yarn.lock"); ok {
		return "yarn", []string{script}
	}
	return "npm", []string{"run", script}
}

func readPackageManager(path string) (string, bool, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return "", false, nil
		}
		return "", false, err
	}
	var pkg struct {
		PackageManager string `json:"packageManager"`
	}
	if err := json.Unmarshal(data, &pkg); err != nil {
		return "", false, err
	}
	return pkg.PackageManager, pkg.PackageManager != "", nil
}

func existingFile(dir, name string) (string, bool, error) {
	path := filepath.Join(dir, name)
	info, err := os.Stat(path)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return path, false, nil
		}
		return path, false, err
	}
	return path, !info.IsDir(), nil
}

func existingAnyFile(dir string, names ...string) (string, bool, error) {
	for _, name := range names {
		path, ok, err := existingFile(dir, name)
		if err != nil || ok {
			return path, ok, err
		}
	}
	return "", false, nil
}

func fileHasMakeTarget(action AppAction) func(string) (bool, error) {
	return func(path string) (bool, error) { return fileHasLinePrefix(path, string(action)+":") }
}

func fileHasJustRecipe(action AppAction) func(string) (bool, error) {
	return func(path string) (bool, error) { return fileHasLinePrefix(path, string(action)+":") }
}

func fileHasTask(action AppAction) func(string) (bool, error) {
	return func(path string) (bool, error) { return fileHasLinePrefix(path, "  "+string(action)+":") }
}

func fileHasLinePrefix(path, prefix string) (bool, error) {
	file, err := os.Open(path)
	if err != nil {
		return false, err
	}
	defer file.Close()
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, prefix) {
			return true, nil
		}
	}
	return false, scanner.Err()
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
