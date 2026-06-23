package provider

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSaveStoresCredentialPlaceholdersAndEnvEntries(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(filepath.Join(dir, "providers"), filepath.Join(dir, ".env"))

	if err := store.Save(Provider{Name: "work-git", Type: TypeGitLab, Username: "alice", Token: "secret-token"}); err != nil {
		t.Fatal(err)
	}

	data := readFile(t, filepath.Join(dir, "providers", "work-git.json"))
	if strings.Contains(data, "alice") || strings.Contains(data, "secret-token") {
		t.Fatalf("provider file contains raw credentials:\n%s", data)
	}
	if !strings.Contains(data, "${DEVENV_PROVIDER_WORK_GIT_USERNAME}") || !strings.Contains(data, "${DEVENV_PROVIDER_WORK_GIT_TOKEN}") {
		t.Fatalf("provider file missing placeholders:\n%s", data)
	}

	env := readFile(t, filepath.Join(dir, ".env"))
	if !strings.Contains(env, "DEVENV_PROVIDER_WORK_GIT_USERNAME=") || !strings.Contains(env, "DEVENV_PROVIDER_WORK_GIT_TOKEN=") {
		t.Fatalf("env missing credential entries:\n%s", env)
	}

	if err := store.Load(); err != nil {
		t.Fatal(err)
	}
	p, ok := store.Get("work-git")
	if !ok || p.Username != "alice" || p.Token != "secret-token" {
		t.Fatalf("credentials not resolved: %#v ok=%v", p, ok)
	}
}

func TestLoadLegacyClearTextProvider(t *testing.T) {
	dir := t.TempDir()
	providers := filepath.Join(dir, "providers")
	if err := os.MkdirAll(providers, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(providers, "legacy.json"), []byte(`{"name":"legacy","type":"github","username":"bob","token":"old"}`), 0600); err != nil {
		t.Fatal(err)
	}
	store := NewStore(providers, filepath.Join(dir, ".env"))
	if err := store.Load(); err != nil {
		t.Fatal(err)
	}
	p, ok := store.Get("legacy")
	if !ok || p.Username != "bob" || p.Token != "old" {
		t.Fatalf("legacy provider not loaded: %#v ok=%v", p, ok)
	}
}

func TestSavePreservesTokenWhenEmptyAndReplacesWhenSet(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(filepath.Join(dir, "providers"), filepath.Join(dir, ".env"))
	if err := store.Save(Provider{Name: "work", Type: TypeGitHub, Username: "alice", Token: "old"}); err != nil {
		t.Fatal(err)
	}
	if err := store.Save(Provider{Name: "work", Type: TypeGitHub, Username: "alice2"}); err != nil {
		t.Fatal(err)
	}
	p, _ := store.Get("work")
	if p.Username != "alice2" || p.Token != "old" {
		t.Fatalf("token not preserved: %#v", p)
	}
	if err := store.Save(Provider{Name: "work", Type: TypeGitHub, Username: "alice2", Token: "new"}); err != nil {
		t.Fatal(err)
	}
	p, _ = store.Get("work")
	if p.Token != "new" {
		t.Fatalf("token not replaced: %#v", p)
	}
	if strings.Contains(readFile(t, filepath.Join(dir, "providers", "work.json")), "new") {
		t.Fatal("raw replacement token written to provider JSON")
	}
}

func TestDeleteRemovesOnlyProviderEnvEntries(t *testing.T) {
	dir := t.TempDir()
	envPath := filepath.Join(dir, ".env")
	if err := os.WriteFile(envPath, []byte("KEEP=1\nDEVENV_PROVIDER_OTHER_TOKEN=stay\n"), 0600); err != nil {
		t.Fatal(err)
	}
	store := NewStore(filepath.Join(dir, "providers"), envPath)
	if err := store.Save(Provider{Name: "work", Type: TypeGitLab, Username: "alice", Token: "secret"}); err != nil {
		t.Fatal(err)
	}
	if err := store.Delete("work"); err != nil {
		t.Fatal(err)
	}
	env := readFile(t, envPath)
	if strings.Contains(env, "DEVENV_PROVIDER_WORK_") || !strings.Contains(env, "KEEP=1") || !strings.Contains(env, "DEVENV_PROVIDER_OTHER_TOKEN=stay") {
		t.Fatalf("unexpected env after delete:\n%s", env)
	}
}

func readFile(t *testing.T, path string) string {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}
