package resources

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDiscoverActionTargets(t *testing.T) {
	t.Parallel()

	writeFile := func(t *testing.T, path, content string) {
		t.Helper()
		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(content), 0755); err != nil {
			t.Fatal(err)
		}
	}

	t.Run("discovers docker and shell build targets", func(t *testing.T) {
		t.Parallel()
		configDir := t.TempDir()
		writeFile(t, filepath.Join(configDir, "apps", "build", "my-app-build.Dockerfile"), "FROM alpine")
		writeFile(t, filepath.Join(configDir, "apps", "build", "my-app-build.sh"), "#!/bin/sh\n# devenv:name=Local Build\n")

		targets, err := NewManager(configDir).DiscoverActionTargets("my-app", "", AppActionBuild)
		if err != nil {
			t.Fatalf("DiscoverActionTargets error = %v", err)
		}
		if len(targets) != 2 {
			t.Fatalf("got %d targets, want 2: %#v", len(targets), targets)
		}
		seen := map[string]ActionTarget{}
		for _, target := range targets {
			seen[target.ID] = target
		}
		if seen["build:docker"].SourcePath == "" {
			t.Fatalf("missing docker build target: %#v", targets)
		}
		if seen["build:shell"].Label != "Local Build" || seen["build:shell"].LaunchMode != LaunchModeLogged {
			t.Fatalf("bad shell build target: %#v", seen["build:shell"])
		}
	})

	t.Run("discovers docker run default profile and shell profile", func(t *testing.T) {
		t.Parallel()
		configDir := t.TempDir()
		writeFile(t, filepath.Join(configDir, "apps", "compose", "my-app-compose.yml"), "services: {}")
		writeFile(t, filepath.Join(configDir, "apps", "compose", "my-app-redis-compose.yml"), "services: {}")
		writeFile(t, filepath.Join(configDir, "apps", "run", "my-app-dev.sh"), "#!/bin/sh\n# devenv:name=Dev TUI\n")
		writeFile(t, filepath.Join(configDir, "apps", "run", "other-app-dev.sh"), "#!/bin/sh\n")

		targets, err := NewManager(configDir).DiscoverActionTargets("my-app", "", AppActionRun)
		if err != nil {
			t.Fatalf("DiscoverActionTargets error = %v", err)
		}
		seen := map[string]ActionTarget{}
		for _, target := range targets {
			seen[target.ID] = target
		}
		if len(seen) != 3 {
			t.Fatalf("got targets %#v, want 3 distinct targets", targets)
		}
		if seen["run:docker:default"].Label != "default" {
			t.Fatalf("missing default docker run target: %#v", targets)
		}
		if seen["run:docker:redis"].Profile != "redis" {
			t.Fatalf("missing redis docker run target: %#v", targets)
		}
		if seen["run:shell:dev"].Label != "Dev TUI" || seen["run:shell:dev"].LaunchMode != LaunchModeTmux {
			t.Fatalf("bad shell run target: %#v", seen["run:shell:dev"])
		}
	})

	t.Run("distinguishes duplicate runtime profile ids", func(t *testing.T) {
		t.Parallel()
		configDir := t.TempDir()
		writeFile(t, filepath.Join(configDir, "apps", "compose", "my-app-dev-compose.yml"), "services: {}")
		writeFile(t, filepath.Join(configDir, "apps", "run", "my-app-dev.sh"), "#!/bin/sh\n")

		targets, err := NewManager(configDir).DiscoverActionTargets("my-app", "", AppActionRun)
		if err != nil {
			t.Fatalf("DiscoverActionTargets error = %v", err)
		}
		seen := map[string]bool{}
		for _, target := range targets {
			seen[target.ID] = true
		}
		if !seen["run:docker:dev"] || !seen["run:shell:dev"] {
			t.Fatalf("expected distinct docker/shell dev ids, got %#v", targets)
		}
	})

	t.Run("returns no targets when absent", func(t *testing.T) {
		t.Parallel()
		targets, err := NewManager(t.TempDir()).DiscoverActionTargets("my-app", "", AppActionTest)
		if err != nil {
			t.Fatalf("DiscoverActionTargets error = %v", err)
		}
		if len(targets) != 0 {
			t.Fatalf("got %#v, want no targets", targets)
		}
	})
}
