package exampleconfig

import (
	"os"
	"path/filepath"
	"testing"
)

func TestGenerateCreatesExampleConfig(t *testing.T) {
	configDir := t.TempDir()
	homeDir := t.TempDir()
	g := Generator{ConfigDir: configDir, HomeDir: homeDir}
	if err := g.Generate(); err != nil {
		t.Fatal(err)
	}

	files := []string{
		".env",
		"apps/definitions/go-rest-postgres.json",
		"apps/definitions/bhvr-site.json",
		"libraries/definitions/bun-lib-starter.json",
		"infrastructure/definitions/postgres.json",
		"infrastructure/definitions/redis.json",
		"infrastructure/definitions/mailpit.json",
		"apps/compose/go-rest-postgres-compose.yml",
		"apps/compose/bhvr-site-compose.yml",
		"apps/compose/bhvr-site-debug-compose.yml",
		"apps/compose/bhvr-site-with-redis-compose.yml",
		"infrastructure/compose/postgres-compose.yml",
		"infrastructure/compose/redis-compose.yml",
		"infrastructure/compose/mailpit-compose.yml",
		"apps/build/go-rest-postgres-build.Dockerfile",
		"apps/build/go-rest-postgres-test.Dockerfile",
		"apps/build/bhvr-site-build.Dockerfile",
		"apps/build/bhvr-site-test.Dockerfile",
		"apps/build/bun-lib-starter-build.Dockerfile",
		"apps/build/bun-lib-starter-test.Dockerfile",
	}
	for _, file := range files {
		if _, err := os.Stat(filepath.Join(configDir, file)); err != nil {
			t.Fatalf("missing %s: %v", file, err)
		}
	}
	for _, name := range []string{"hello.sh", "hello.py", "hello.ts"} {
		info, err := os.Stat(filepath.Join(homeDir, "scripts", name))
		if err != nil {
			t.Fatalf("missing script %s: %v", name, err)
		}
		if info.Mode()&0111 == 0 {
			t.Fatalf("script %s is not executable: %v", name, info.Mode())
		}
	}
}

func TestGenerateRejectsNonEmptyConfigDirWithoutWrites(t *testing.T) {
	configDir := t.TempDir()
	homeDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(configDir, "keep"), []byte("x"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := (Generator{ConfigDir: configDir, HomeDir: homeDir}).Generate(); err == nil {
		t.Fatal("expected error")
	}
	if _, err := os.Stat(filepath.Join(homeDir, "scripts")); !os.IsNotExist(err) {
		t.Fatalf("scripts were written: %v", err)
	}
}

func TestGenerateRejectsNonEmptyScriptsDirWithoutWrites(t *testing.T) {
	configDir := t.TempDir()
	homeDir := t.TempDir()
	scriptsDir := filepath.Join(homeDir, "scripts")
	if err := os.MkdirAll(scriptsDir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(scriptsDir, "keep"), []byte("x"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := (Generator{ConfigDir: configDir, HomeDir: homeDir}).Generate(); err == nil {
		t.Fatal("expected error")
	}
	if entries, err := os.ReadDir(configDir); err != nil || len(entries) != 0 {
		t.Fatalf("config was written: entries=%d err=%v", len(entries), err)
	}
}
