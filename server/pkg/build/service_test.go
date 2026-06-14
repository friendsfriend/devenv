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
	}, func(s string) { got = s })

	if !strings.Contains(got, "Checkout needed") {
		t.Fatalf("expected 'Checkout needed', got %q", got)
	}
}

type fakeResourceMgr struct {
	copyTemplatesErr error
	copyTemplates    []string
	dockerfileErr    error
	composeErr       error
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
}

func (f *fakeCommandRunner) RunCommandWithLogging(_, _ string, _ []string, _ []string, _ string) (error, string) {
	return f.err, ""
}

func (f *fakeCommandRunner) RunCommandSilent(_ string, _ []string, _ []string, _ string) (error, string) {
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
			}, func(s string) { got = s })

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
	}, func(string) {})

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
	}, func(s string) { got = s })

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
	}, func(s string) { got = s })

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
	}, "", func(s string) { got = s })

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
	}, "", func(s string) { got = s })

	if !strings.Contains(got, "no compose file") {
		t.Fatalf("expected compose error, got %q", got)
	}
}
