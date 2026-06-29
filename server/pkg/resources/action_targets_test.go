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

	t.Run("discovers root build tool targets", func(t *testing.T) {
		t.Parallel()
		configDir := t.TempDir()
		localDir := t.TempDir()
		writeFile(t, filepath.Join(localDir, "Makefile"), "build:\n\techo make\n")
		writeFile(t, filepath.Join(localDir, "justfile"), "build:\n\techo just\n")
		writeFile(t, filepath.Join(localDir, "Taskfile.yml"), "version: '3'\ntasks:\n  build:\n    cmds:\n      - echo task\n")

		targets, err := NewManager(configDir).DiscoverActionTargets("my-app", localDir, AppActionBuild)
		if err != nil {
			t.Fatalf("DiscoverActionTargets error = %v", err)
		}
		seen := map[string]ActionTarget{}
		for _, target := range targets {
			seen[target.ID] = target
		}
		for _, id := range []string{"build:shell:make", "build:shell:just", "build:shell:task"} {
			if seen[id].Command == "" || len(seen[id].Args) != 1 || seen[id].Args[0] != "build" {
				t.Fatalf("missing root tool target %s: %#v", id, targets)
			}
		}
	})

	t.Run("discovers language build tool defaults", func(t *testing.T) {
		t.Parallel()
		configDir := t.TempDir()
		localDir := t.TempDir()
		writeFile(t, filepath.Join(localDir, "package.json"), `{"packageManager":"bun@1.3.14","scripts":{"build":"vite build","test":"vitest"}}`)
		writeFile(t, filepath.Join(localDir, "go.mod"), "module example.com/app\n")
		writeFile(t, filepath.Join(localDir, "Cargo.toml"), "[package]\nname = \"app\"\n")
		writeFile(t, filepath.Join(localDir, "pom.xml"), "<project></project>")
		writeFile(t, filepath.Join(localDir, "gradlew"), "#!/bin/sh\n")
		writeFile(t, filepath.Join(localDir, "pyproject.toml"), "[project]\nname = \"app\"\n")
		writeFile(t, filepath.Join(localDir, "uv.lock"), "")

		targets, err := NewManager(configDir).DiscoverActionTargets("my-app", localDir, AppActionBuild)
		if err != nil {
			t.Fatalf("DiscoverActionTargets error = %v", err)
		}
		seen := map[string]ActionTarget{}
		for _, target := range targets {
			seen[target.ID] = target
		}
		checks := map[string]string{
			"build:shell:package-bun": "bun build (default for package.json)",
			"build:shell:go":          "go build (default for go.mod)",
			"build:shell:cargo":       "cargo build (default for Cargo.toml)",
			"build:shell:maven":       "mvn package (default for pom.xml)",
			"build:shell:gradle":      "./gradlew build (default for Gradle)",
			"build:shell:uv":          "uv build (default for pyproject.toml)",
		}
		for id, label := range checks {
			if seen[id].Label != label {
				t.Fatalf("target %s label = %q, want %q; targets=%#v", id, seen[id].Label, label, targets)
			}
		}
	})

	t.Run("discovers bun lockb package target", func(t *testing.T) {
		t.Parallel()
		configDir := t.TempDir()
		localDir := t.TempDir()
		writeFile(t, filepath.Join(localDir, "package.json"), `{"scripts":{"test":"vitest"}}`)
		writeFile(t, filepath.Join(localDir, "bun.lockb"), "")

		targets, err := NewManager(configDir).DiscoverActionTargets("my-app", localDir, AppActionTest)
		if err != nil {
			t.Fatalf("DiscoverActionTargets error = %v", err)
		}
		if len(targets) != 1 || targets[0].ID != "test:shell:package-bun" || targets[0].Command != "bun" || targets[0].Args[1] != "test" {
			t.Fatalf("targets = %#v, want bun test target", targets)
		}
	})

	t.Run("discovers bun test default without package script", func(t *testing.T) {
		t.Parallel()
		configDir := t.TempDir()
		localDir := t.TempDir()
		writeFile(t, filepath.Join(configDir, "apps", "build", "my-app-test.sh"), "#!/bin/sh\n")
		writeFile(t, filepath.Join(localDir, "package.json"), `{"packageManager":"bun@1.3.14","scripts":{"build":"bun run build.ts"}}`)

		targets, err := NewManager(configDir).DiscoverActionTargets("my-app", localDir, AppActionTest)
		if err != nil {
			t.Fatalf("DiscoverActionTargets error = %v", err)
		}
		seen := map[string]ActionTarget{}
		for _, target := range targets {
			seen[target.ID] = target
		}
		if seen["test:shell"].SourcePath == "" || seen["test:shell:package-bun"].Label != "bun test (default for package.json)" {
			t.Fatalf("targets = %#v, want shell script and bun default", targets)
		}
	})

	t.Run("discovers default dev run targets", func(t *testing.T) {
		t.Parallel()
		configDir := t.TempDir()
		localDir := t.TempDir()
		writeFile(t, filepath.Join(localDir, "package.json"), `{"scripts":{"dev":"vite --host"}}`)
		writeFile(t, filepath.Join(localDir, "bun.lock"), "")
		writeFile(t, filepath.Join(localDir, "Makefile"), "run:\n\techo run\n")
		writeFile(t, filepath.Join(localDir, "go.mod"), "module example.com/app\n")
		writeFile(t, filepath.Join(localDir, "Cargo.toml"), "[package]\nname = \"app\"\n")
		writeFile(t, filepath.Join(localDir, "gradlew"), "#!/bin/sh\n")

		targets, err := NewManager(configDir).DiscoverActionTargets("my-app", localDir, AppActionRun)
		if err != nil {
			t.Fatalf("DiscoverActionTargets error = %v", err)
		}
		seen := map[string]ActionTarget{}
		for _, target := range targets {
			seen[target.ID] = target
		}
		checks := map[string]string{
			"run:shell:make":        "make run (default for Makefile)",
			"run:shell:package-bun": "bun dev (default for package.json)",
			"run:shell:go":          "go run . (default for go.mod)",
			"run:shell:cargo":       "cargo run (default for Cargo.toml)",
			"run:shell:gradle":      "./gradlew run (default for Gradle)",
		}
		for id, label := range checks {
			if seen[id].Label != label || seen[id].LaunchMode != LaunchModeTmux {
				t.Fatalf("target %s = %#v, want label %q tmux", id, seen[id], label)
			}
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
