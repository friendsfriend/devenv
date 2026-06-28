package resources

import (
	"os"
	"path/filepath"
	"testing"
)

func TestMigrateLegacyActionResources(t *testing.T) {
	t.Parallel()

	write := func(t *testing.T, path, content string) {
		t.Helper()
		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(content), 0644); err != nil {
			t.Fatal(err)
		}
	}

	t.Run("copies legacy docker compose and test files", func(t *testing.T) {
		t.Parallel()
		configDir := t.TempDir()
		write(t, filepath.Join(configDir, "dockerfiles", "my-app-build.Dockerfile"), "FROM build")
		write(t, filepath.Join(configDir, "dockerfiles", "ignored.Dockerfile"), "FROM ignored")
		write(t, filepath.Join(configDir, "test", "my-app-test.Dockerfile"), "FROM test")
		write(t, filepath.Join(configDir, "compose", "my-app-compose.yml"), "services: {}")
		write(t, filepath.Join(configDir, "compose", "my-app-dev-compose.yaml"), "services: {dev: {}}")

		migrated, err := NewManager(configDir).MigrateLegacyActionResources()
		if err != nil {
			t.Fatalf("MigrateLegacyActionResources error = %v", err)
		}
		if len(migrated) != 4 {
			t.Fatalf("migrated %d files, want 4: %v", len(migrated), migrated)
		}

		for _, rel := range []string{
			"apps/build/my-app-build.Dockerfile",
			"apps/build/my-app-test.Dockerfile",
			"apps/compose/my-app-compose.yml",
			"apps/compose/my-app-dev-compose.yaml",
		} {
			if _, err := os.Stat(filepath.Join(configDir, rel)); err != nil {
				t.Fatalf("expected migrated file %s: %v", rel, err)
			}
		}
		if _, err := os.Stat(filepath.Join(configDir, "apps", "build", "ignored.Dockerfile")); !os.IsNotExist(err) {
			t.Fatalf("ignored legacy file should not migrate")
		}
	})

	t.Run("does not overwrite destination", func(t *testing.T) {
		t.Parallel()
		configDir := t.TempDir()
		write(t, filepath.Join(configDir, "dockerfiles", "my-app-build.Dockerfile"), "FROM legacy")
		dest := filepath.Join(configDir, "apps", "build", "my-app-build.Dockerfile")
		write(t, dest, "FROM current")

		migrated, err := NewManager(configDir).MigrateLegacyActionResources()
		if err != nil {
			t.Fatalf("MigrateLegacyActionResources error = %v", err)
		}
		if len(migrated) != 0 {
			t.Fatalf("expected no migrated files, got %v", migrated)
		}
		content, err := os.ReadFile(dest)
		if err != nil {
			t.Fatal(err)
		}
		if string(content) != "FROM current" {
			t.Fatalf("destination overwritten: %q", content)
		}
	})
}
