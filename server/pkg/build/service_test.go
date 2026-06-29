package build

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/friendsfriend/devenv/pkg/app"
	"github.com/friendsfriend/devenv/pkg/resources"
)

func TestBuildAppNoCheckout(t *testing.T) {
	svc := &service{
		resourceMgr: &fakeResourceMgr{},
	}

	var got string
	svc.buildAppInternal(&app.App{
		LocalDirectoryPath: "/nonexistent",
	}, "", func(s string) { got = s })

	if !strings.Contains(got, "Checkout needed") {
		t.Fatalf("expected 'Checkout needed', got %q", got)
	}
}

type fakeResourceMgr struct {
	copyTemplatesErr error
	copyTemplates    []string
	dockerfileErr    error
	composeErr       error
	targets          []resources.ActionTarget
}

func (f *fakeResourceMgr) ExistsDir(path string) (bool, error) {
	_, err := os.Stat(path)
	if os.IsNotExist(err) {
		return false, nil
	}
	return err == nil, err
}

func (f *fakeResourceMgr) ResolveDockerfileForAction(_, _ string, _ resources.ActionType) (string, error) {
	if f.dockerfileErr != nil {
		return "", f.dockerfileErr
	}
	return "/fake/dockerfile", nil
}

func (f *fakeResourceMgr) ResolveComposeFile(_, _ string, _ string) (string, error) {
	if f.composeErr != nil {
		return "", f.composeErr
	}
	return "/fake/compose.yml", nil
}

func (f *fakeResourceMgr) ResolveInfrastructureComposeFile(_ string) (string, error) {
	return "/fake/infrastructure-compose.yml", nil
}

func (f *fakeResourceMgr) DiscoverProfiles(_, _ string) ([]string, error) {
	return nil, nil
}

func (f *fakeResourceMgr) DiscoverActionTargets(_, _ string, action resources.AppAction) ([]resources.ActionTarget, error) {
	if f.targets != nil {
		return f.targets, nil
	}
	if action == resources.AppActionRun {
		if f.composeErr != nil {
			return nil, f.composeErr
		}
		return []resources.ActionTarget{{ID: "run:docker:default", Action: action, Runtime: resources.ActionRuntimeDocker, Label: "default", SourcePath: "/fake/compose.yml"}}, nil
	}
	if f.dockerfileErr != nil {
		return nil, f.dockerfileErr
	}
	return []resources.ActionTarget{{ID: string(action) + ":docker", Action: action, Runtime: resources.ActionRuntimeDocker, Label: "Docker", SourcePath: "/fake/dockerfile"}}, nil
}

func (f *fakeResourceMgr) EnvFilePath() (string, bool) {
	return "", false
}

func (f *fakeResourceMgr) CopyTemplatesDir(_ string) ([]string, error) {
	if f.copyTemplatesErr != nil {
		return nil, f.copyTemplatesErr
	}
	return f.copyTemplates, nil
}

func (f *fakeResourceMgr) CopyFile(_, _ string) error { return nil }

type fakeCommandRunner struct {
	err       error
	silentOut string
	silentErr error
	lastCmd   string
	lastArgs  []string
	lastDir   string
}

func (f *fakeCommandRunner) RunCommandWithLogging(_, command string, args []string, _ []string, workingDir string) (error, string) {
	f.lastCmd = command
	f.lastArgs = args
	f.lastDir = workingDir
	return f.err, ""
}

func (f *fakeCommandRunner) RunCommandWithLoggingToFile(appIdent, command string, args []string, envVars []string, workingDir string, _ string) (error, string) {
	return f.RunCommandWithLogging(appIdent, command, args, envVars, workingDir)
}

func (f *fakeCommandRunner) RunCommandSilent(command string, args []string, _ []string, workingDir string) (error, string) {
	f.lastCmd = command
	f.lastArgs = args
	f.lastDir = workingDir
	if f.silentErr != nil {
		return f.silentErr, ""
	}
	return nil, f.silentOut
}

func newServiceWithFakeResources(fake *fakeResourceMgr) *service {
	return &service{resourceMgr: fake, executor: &fakeCommandRunner{silentOut: `{}`}}
}

func TestBuildAppCopyTemplates(t *testing.T) {
	hardErr := errors.New("disk error")

	tests := []struct {
		name             string
		copyTemplatesErr error
		wantErrSubstr    string
	}{
		{
			name: "templates dir missing — skipped silently (nil, nil)",
		},
		{
			name:             "templates dir hard error — fails build",
			copyTemplatesErr: hardErr,
			wantErrSubstr:    "disk error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			appDir := t.TempDir()
			fake := &fakeResourceMgr{
				copyTemplatesErr: tt.copyTemplatesErr,
			}

			svc := newServiceWithFakeResources(fake)

			var got string
			svc.buildAppInternal(&app.App{
				Ident:              "test-app",
				LocalDirectoryPath: appDir,
			}, "", func(s string) { got = s })

			if tt.wantErrSubstr != "" {
				if !strings.Contains(got, tt.wantErrSubstr) {
					t.Fatalf("expected status containing %q, got %q", tt.wantErrSubstr, got)
				}
				return
			}

			if strings.HasPrefix(got, "Error:") {
				t.Fatalf("unexpected error status: %q", got)
			}
		})
	}
}

func TestBuildAppCopiedFilesRemovedAfterBuild(t *testing.T) {
	appDir := t.TempDir()

	f1 := filepath.Join(appDir, ".npmrc")
	f2 := filepath.Join(appDir, "settings.xml")
	for _, p := range []string{f1, f2} {
		if err := os.WriteFile(p, []byte("data"), 0644); err != nil {
			t.Fatalf("failed to create fake template file: %v", err)
		}
	}

	fake := &fakeResourceMgr{
		copyTemplates: []string{f1, f2},
	}
	svc := newServiceWithFakeResources(fake)

	svc.buildAppInternal(&app.App{
		Ident:              "test-app",
		LocalDirectoryPath: appDir,
	}, "", func(string) {})

	for _, p := range []string{f1, f2} {
		if _, err := os.Stat(p); !os.IsNotExist(err) {
			t.Errorf("expected %q to be removed after build, but it still exists", p)
		}
	}
}

func TestBuildAppDockerfileError(t *testing.T) {
	appDir := t.TempDir()
	fake := &fakeResourceMgr{
		dockerfileErr: errors.New("no dockerfile"),
	}

	svc := newServiceWithFakeResources(fake)

	var got string
	svc.buildAppInternal(&app.App{
		Ident:              "test-app",
		LocalDirectoryPath: appDir,
	}, "", func(s string) { got = s })

	if !strings.Contains(got, "no dockerfile") {
		t.Fatalf("expected dockerfile error, got %q", got)
	}
}

func TestTestAppCheckoutNeeded(t *testing.T) {
	svc := newServiceWithFakeResources(&fakeResourceMgr{})

	var got string
	svc.testAppInternal(&app.App{
		Ident:              "test-app",
		LocalDirectoryPath: "/nonexistent/path",
	}, "", func(s string) { got = s })

	if !strings.Contains(got, "Checkout needed") {
		t.Fatalf("expected 'Checkout needed', got %q", got)
	}
}

func TestRunAppCheckoutNeeded(t *testing.T) {
	svc := newServiceWithFakeResources(&fakeResourceMgr{})

	var got string
	svc.runAppInternal(&app.App{
		Ident:              "test-app",
		LocalDirectoryPath: "/nonexistent/path",
	}, "", "", func(s string) { got = s })

	if !strings.Contains(got, "Checkout needed") {
		t.Fatalf("expected 'Checkout needed', got %q", got)
	}
}

func TestRunAppComposeFileError(t *testing.T) {
	appDir := t.TempDir()
	fake := &fakeResourceMgr{
		composeErr: errors.New("no compose file"),
	}

	svc := newServiceWithFakeResources(fake)

	var got string
	svc.runAppInternal(&app.App{
		Ident:              "test-app",
		LocalDirectoryPath: appDir,
	}, "", "", func(s string) { got = s })

	if !strings.Contains(got, "no compose file") {
		t.Fatalf("expected compose error, got %q", got)
	}
}

func TestShellBuildTargetRunsWithLoggingFromAppDir(t *testing.T) {
	appDir := t.TempDir()
	fake := &fakeResourceMgr{targets: []resources.ActionTarget{{
		ID:         "build:shell",
		Action:     resources.AppActionBuild,
		Runtime:    resources.ActionRuntimeShell,
		Label:      "Shell",
		LaunchMode: resources.LaunchModeLogged,
		SourcePath: "/config/apps/build/test-app-build.sh",
	}}}
	runner := &fakeCommandRunner{}
	svc := &service{resourceMgr: fake, executor: runner}

	var got string
	svc.buildAppInternal(&app.App{Ident: "test-app", LocalDirectoryPath: appDir}, "build:shell", func(s string) { got = s })

	if got != "build successful" {
		t.Fatalf("status = %q, want build successful", got)
	}
	if runner.lastCmd != "sh" || runner.lastArgs[0] != "/config/apps/build/test-app-build.sh" || runner.lastDir != appDir {
		t.Fatalf("unexpected shell command: cmd=%q args=%v dir=%q", runner.lastCmd, runner.lastArgs, runner.lastDir)
	}
}

func TestMissingRootBuildToolReportsClearError(t *testing.T) {
	appDir := t.TempDir()
	fake := &fakeResourceMgr{targets: []resources.ActionTarget{{
		ID:         "build:shell:missing",
		Action:     resources.AppActionBuild,
		Runtime:    resources.ActionRuntimeShell,
		Label:      "Missing build",
		LaunchMode: resources.LaunchModeLogged,
		SourcePath: filepath.Join(appDir, "Makefile"),
		Command:    "devenv-missing-build-tool-for-test",
		Args:       []string{"build"},
	}}}
	runner := &fakeCommandRunner{}
	svc := &service{resourceMgr: fake, executor: runner}

	var got string
	svc.buildAppInternal(&app.App{Ident: "test-app", LocalDirectoryPath: appDir}, "build:shell:missing", func(s string) { got = s })

	if got != "Error: required tool not found: devenv-missing-build-tool-for-test" {
		t.Fatalf("status = %q", got)
	}
	if runner.lastCmd != "" {
		t.Fatalf("command runner should not be called, got %q", runner.lastCmd)
	}
}

func TestRootBuildToolTargetRunsCommandFromAppDir(t *testing.T) {
	appDir := t.TempDir()
	toolPath := filepath.Join(appDir, "devenv-tool")
	if err := os.WriteFile(toolPath, []byte("#!/bin/sh\n"), 0755); err != nil {
		t.Fatal(err)
	}
	fake := &fakeResourceMgr{targets: []resources.ActionTarget{{
		ID:         "build:shell:make",
		Action:     resources.AppActionBuild,
		Runtime:    resources.ActionRuntimeShell,
		Label:      "Make build",
		LaunchMode: resources.LaunchModeLogged,
		SourcePath: filepath.Join(appDir, "Makefile"),
		Command:    "./devenv-tool",
		Args:       []string{"build"},
	}}}
	runner := &fakeCommandRunner{}
	svc := &service{resourceMgr: fake, executor: runner}

	var got string
	svc.buildAppInternal(&app.App{Ident: "test-app", LocalDirectoryPath: appDir}, "build:shell:make", func(s string) { got = s })

	if got != "build successful" {
		t.Fatalf("status = %q, want build successful", got)
	}
	if runner.lastCmd != "./devenv-tool" || len(runner.lastArgs) != 1 || runner.lastArgs[0] != "build" || runner.lastDir != appDir {
		t.Fatalf("unexpected root tool command: cmd=%q args=%v dir=%q", runner.lastCmd, runner.lastArgs, runner.lastDir)
	}
}

func TestShellTmuxRunFallsBackToLoggedWithoutTmux(t *testing.T) {
	t.Setenv("TMUX", "")
	appDir := t.TempDir()
	fake := &fakeResourceMgr{targets: []resources.ActionTarget{{
		ID:         "run:shell:dev",
		Action:     resources.AppActionRun,
		Runtime:    resources.ActionRuntimeShell,
		Profile:    "dev",
		LaunchMode: resources.LaunchModeTmux,
		SourcePath: "/config/apps/run/test-app-dev.sh",
	}}}
	runner := &fakeCommandRunner{}
	svc := &service{resourceMgr: fake, executor: runner}

	var statuses []string
	svc.runAppInternal(&app.App{Ident: "test-app", LocalDirectoryPath: appDir}, "", "run:shell:dev", func(s string) { statuses = append(statuses, s) })

	if len(statuses) < 2 || statuses[0] != "tmux unavailable; running logged" || statuses[len(statuses)-1] != "run successful" {
		t.Fatalf("statuses = %#v, want logged fallback then success", statuses)
	}
	if runner.lastCmd != "sh" || runner.lastArgs[0] != "/config/apps/run/test-app-dev.sh" || runner.lastDir != appDir {
		t.Fatalf("unexpected fallback command: cmd=%q args=%v dir=%q", runner.lastCmd, runner.lastArgs, runner.lastDir)
	}
}

func TestShellTmuxRunStoresWindowAndStopKillsIt(t *testing.T) {
	t.Setenv("TMUX", "/tmp/tmux-1/default,1,0")
	appDir := t.TempDir()
	fake := &fakeResourceMgr{targets: []resources.ActionTarget{{
		ID:         "run:shell:dev",
		Action:     resources.AppActionRun,
		Runtime:    resources.ActionRuntimeShell,
		Profile:    "dev",
		LaunchMode: resources.LaunchModeTmux,
		SourcePath: "/config/apps/run/test-app-dev.sh",
	}}}
	runner := &fakeCommandRunner{silentOut: "%7\n"}
	svc := &service{resourceMgr: fake, executor: runner, tmuxRuns: make(map[string]ShellTmuxRunState)}

	var got string
	svc.runAppInternal(&app.App{Ident: "test-app", LocalDirectoryPath: appDir}, "", "run:shell:dev", func(s string) { got = s })
	if got != "run successful" {
		t.Fatalf("status = %q, want run successful", got)
	}
	if svc.tmuxRuns["test-app"].WindowID != "%7" {
		t.Fatalf("stored state = %#v", svc.tmuxRuns["test-app"])
	}
	if err := svc.StopShellTmuxRun("test-app"); err != nil {
		t.Fatalf("StopShellTmuxRun error = %v", err)
	}
	if runner.lastCmd != "tmux" || len(runner.lastArgs) < 3 || runner.lastArgs[0] != "kill-window" || runner.lastArgs[2] != "%7" {
		t.Fatalf("unexpected stop command: %s %v", runner.lastCmd, runner.lastArgs)
	}
}
