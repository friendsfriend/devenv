package state

import (
	"os"
	"path/filepath"
	"testing"
)

// openTemp opens a fresh state store in a temporary directory and registers
// cleanup via t.Cleanup.
func openTemp(t *testing.T) Store {
	t.Helper()
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	t.Cleanup(func() { _ = s.Close() })
	return s
}

// TestOpenCreatesFile verifies that Open creates the database file.
func TestOpenCreatesFile(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer s.Close()

	if _, err := os.Stat(filepath.Join(dir, "state.db")); err != nil {
		t.Fatalf("expected state.db to exist: %v", err)
	}
}

// TestOpenCreatesDirectory verifies that Open creates a nested db directory if
// it does not already exist.
func TestOpenCreatesDirectory(t *testing.T) {
	parent := t.TempDir()
	dir := filepath.Join(parent, "nested", "db")

	s, err := Open(dir)
	if err != nil {
		t.Fatalf("Open with non-existent nested dir: %v", err)
	}
	defer s.Close()

	if _, err := os.Stat(filepath.Join(dir, "state.db")); err != nil {
		t.Fatalf("expected state.db inside created nested dir: %v", err)
	}
}

// TestGetAppStateUnknownIdent verifies that a missing ident returns a
// zero-value AppState rather than an error.
func TestGetAppStateUnknownIdent(t *testing.T) {
	s := openTemp(t)

	st, err := s.GetAppState("nonexistent")
	if err != nil {
		t.Fatalf("GetAppState on unknown ident: %v", err)
	}
	if st.Ident != "nonexistent" {
		t.Fatalf("expected Ident=%q, got %q", "nonexistent", st.Ident)
	}
	if st.Branch != "" || st.ActiveWorktree != "" {
		t.Fatalf("expected empty state, got %+v", st)
	}
}

// TestSetBranchAndGet verifies that SetBranch persists correctly.
func TestSetBranchAndGet(t *testing.T) {
	s := openTemp(t)

	if err := s.SetBranch("app-a", "main"); err != nil {
		t.Fatalf("SetBranch: %v", err)
	}

	st, err := s.GetAppState("app-a")
	if err != nil {
		t.Fatalf("GetAppState: %v", err)
	}
	if st.Branch != "main" {
		t.Fatalf("expected branch=%q, got %q", "main", st.Branch)
	}
	// ActiveWorktree should remain empty when only branch is set via SetBranch.
	if st.ActiveWorktree != "" {
		t.Fatalf("expected empty ActiveWorktree, got %q", st.ActiveWorktree)
	}
}

// TestSetBranchOverwrite verifies that calling SetBranch twice updates the value
// without touching active_worktree.
func TestSetBranchOverwrite(t *testing.T) {
	s := openTemp(t)

	if err := s.SetActiveWorktree("app-a", "feature-x"); err != nil {
		t.Fatalf("SetActiveWorktree: %v", err)
	}
	if err := s.SetBranch("app-a", "main"); err != nil {
		t.Fatalf("SetBranch first: %v", err)
	}
	if err := s.SetBranch("app-a", "develop"); err != nil {
		t.Fatalf("SetBranch second: %v", err)
	}

	st, err := s.GetAppState("app-a")
	if err != nil {
		t.Fatalf("GetAppState: %v", err)
	}
	if st.Branch != "develop" {
		t.Fatalf("expected branch=%q, got %q", "develop", st.Branch)
	}
	// Previously stored active_worktree must be preserved.
	if st.ActiveWorktree != "feature-x" {
		t.Fatalf("expected ActiveWorktree=%q, got %q", "feature-x", st.ActiveWorktree)
	}
}

// TestSetActiveWorktreeAndGet verifies that SetActiveWorktree persists correctly.
func TestSetActiveWorktreeAndGet(t *testing.T) {
	s := openTemp(t)

	if err := s.SetActiveWorktree("app-b", "feature/login"); err != nil {
		t.Fatalf("SetActiveWorktree: %v", err)
	}

	st, err := s.GetAppState("app-b")
	if err != nil {
		t.Fatalf("GetAppState: %v", err)
	}
	if st.ActiveWorktree != "feature/login" {
		t.Fatalf("expected ActiveWorktree=%q, got %q", "feature/login", st.ActiveWorktree)
	}
}

// TestSetActiveWorktreePreservesBranch verifies that SetActiveWorktree does not
// clobber a previously stored branch value.
func TestSetActiveWorktreePreservesBranch(t *testing.T) {
	s := openTemp(t)

	if err := s.SetBranch("app-b", "main"); err != nil {
		t.Fatalf("SetBranch: %v", err)
	}
	if err := s.SetActiveWorktree("app-b", "feature/login"); err != nil {
		t.Fatalf("SetActiveWorktree: %v", err)
	}

	st, err := s.GetAppState("app-b")
	if err != nil {
		t.Fatalf("GetAppState: %v", err)
	}
	if st.Branch != "main" {
		t.Fatalf("expected Branch=%q, got %q", "main", st.Branch)
	}
	if st.ActiveWorktree != "feature/login" {
		t.Fatalf("expected ActiveWorktree=%q, got %q", "feature/login", st.ActiveWorktree)
	}
}

// TestSetAppStateUpsert verifies that SetAppState creates and updates both fields
// atomically.
func TestSetAppStateUpsert(t *testing.T) {
	s := openTemp(t)

	first := AppState{Ident: "app-c", Branch: "main", ActiveWorktree: "feat"}
	if err := s.SetAppState(first); err != nil {
		t.Fatalf("SetAppState (insert): %v", err)
	}

	got, err := s.GetAppState("app-c")
	if err != nil {
		t.Fatalf("GetAppState: %v", err)
	}
	if got.Branch != "main" || got.ActiveWorktree != "feat" {
		t.Fatalf("after insert: got %+v, want %+v", got, first)
	}

	second := AppState{Ident: "app-c", Branch: "develop", ActiveWorktree: "other"}
	if err := s.SetAppState(second); err != nil {
		t.Fatalf("SetAppState (update): %v", err)
	}

	got, err = s.GetAppState("app-c")
	if err != nil {
		t.Fatalf("GetAppState after update: %v", err)
	}
	if got.Branch != "develop" || got.ActiveWorktree != "other" {
		t.Fatalf("after update: got %+v, want %+v", got, second)
	}
}

// TestMultipleAppsIndependent verifies that state for different apps is stored
// independently.
func TestMultipleAppsIndependent(t *testing.T) {
	s := openTemp(t)

	if err := s.SetBranch("alpha", "main"); err != nil {
		t.Fatalf("SetBranch alpha: %v", err)
	}
	if err := s.SetBranch("beta", "develop"); err != nil {
		t.Fatalf("SetBranch beta: %v", err)
	}

	alpha, err := s.GetAppState("alpha")
	if err != nil {
		t.Fatalf("GetAppState alpha: %v", err)
	}
	beta, err := s.GetAppState("beta")
	if err != nil {
		t.Fatalf("GetAppState beta: %v", err)
	}

	if alpha.Branch != "main" {
		t.Fatalf("alpha.Branch: got %q, want %q", alpha.Branch, "main")
	}
	if beta.Branch != "develop" {
		t.Fatalf("beta.Branch: got %q, want %q", beta.Branch, "develop")
	}
}

// TestMigrationIdempotent verifies that opening the same database directory
// multiple times does not fail and preserves existing data.
func TestMigrationIdempotent(t *testing.T) {
	dir := t.TempDir()

	// First open — creates schema.
	s1, err := Open(dir)
	if err != nil {
		t.Fatalf("first Open: %v", err)
	}
	if err := s1.SetBranch("app-d", "main"); err != nil {
		t.Fatalf("SetBranch: %v", err)
	}
	if err := s1.Close(); err != nil {
		t.Fatalf("first Close: %v", err)
	}

	// Second open — migration must not corrupt existing data.
	s2, err := Open(dir)
	if err != nil {
		t.Fatalf("second Open: %v", err)
	}
	defer s2.Close()

	st, err := s2.GetAppState("app-d")
	if err != nil {
		t.Fatalf("GetAppState after re-open: %v", err)
	}
	if st.Branch != "main" {
		t.Fatalf("data not preserved after re-open: got branch=%q", st.Branch)
	}
}

// TestSetMainWorktreeBranchAndGet verifies that SetMainWorktreeBranch persists
// correctly and does not clobber other fields.
func TestSetMainWorktreeBranchAndGet(t *testing.T) {
	s := openTemp(t)

	// Seed branch and active worktree first.
	if err := s.SetBranch("app-wt", "main"); err != nil {
		t.Fatalf("SetBranch: %v", err)
	}
	if err := s.SetActiveWorktree("app-wt", "feature-x"); err != nil {
		t.Fatalf("SetActiveWorktree: %v", err)
	}

	if err := s.SetMainWorktreeBranch("app-wt", "main"); err != nil {
		t.Fatalf("SetMainWorktreeBranch: %v", err)
	}

	st, err := s.GetAppState("app-wt")
	if err != nil {
		t.Fatalf("GetAppState: %v", err)
	}
	if st.MainWorktreeBranch != "main" {
		t.Fatalf("expected MainWorktreeBranch=%q, got %q", "main", st.MainWorktreeBranch)
	}
	// Other fields must be preserved.
	if st.Branch != "main" {
		t.Fatalf("expected Branch=%q, got %q", "main", st.Branch)
	}
	if st.ActiveWorktree != "feature-x" {
		t.Fatalf("expected ActiveWorktree=%q, got %q", "feature-x", st.ActiveWorktree)
	}
}

// TestSetMainWorktreeBranchUpsert verifies that SetMainWorktreeBranch creates a
// row when none exists yet (i.e., it is called before any other setter).
func TestSetMainWorktreeBranchUpsert(t *testing.T) {
	s := openTemp(t)

	if err := s.SetMainWorktreeBranch("app-new", "develop"); err != nil {
		t.Fatalf("SetMainWorktreeBranch on fresh ident: %v", err)
	}

	st, err := s.GetAppState("app-new")
	if err != nil {
		t.Fatalf("GetAppState: %v", err)
	}
	if st.MainWorktreeBranch != "develop" {
		t.Fatalf("expected MainWorktreeBranch=%q, got %q", "develop", st.MainWorktreeBranch)
	}
}

// TestSetMainWorktreeBranchOverwrite verifies that calling SetMainWorktreeBranch
// twice updates the value.
func TestSetMainWorktreeBranchOverwrite(t *testing.T) {
	s := openTemp(t)

	if err := s.SetMainWorktreeBranch("app-ow", "main"); err != nil {
		t.Fatalf("SetMainWorktreeBranch first: %v", err)
	}
	if err := s.SetMainWorktreeBranch("app-ow", "master"); err != nil {
		t.Fatalf("SetMainWorktreeBranch second: %v", err)
	}

	st, err := s.GetAppState("app-ow")
	if err != nil {
		t.Fatalf("GetAppState: %v", err)
	}
	if st.MainWorktreeBranch != "master" {
		t.Fatalf("expected MainWorktreeBranch=%q, got %q", "master", st.MainWorktreeBranch)
	}
}

// TestSetAppStateUpsertWithMainWorktreeBranch verifies that SetAppState
// round-trips MainWorktreeBranch correctly.
func TestSetAppStateUpsertWithMainWorktreeBranch(t *testing.T) {
	s := openTemp(t)

	first := AppState{Ident: "app-e", Branch: "main", ActiveWorktree: "feat", MainWorktreeBranch: "main"}
	if err := s.SetAppState(first); err != nil {
		t.Fatalf("SetAppState (insert): %v", err)
	}

	got, err := s.GetAppState("app-e")
	if err != nil {
		t.Fatalf("GetAppState: %v", err)
	}
	if got.MainWorktreeBranch != "main" {
		t.Fatalf("after insert: got MainWorktreeBranch=%q, want %q", got.MainWorktreeBranch, "main")
	}

	second := AppState{Ident: "app-e", Branch: "develop", ActiveWorktree: "other", MainWorktreeBranch: "develop"}
	if err := s.SetAppState(second); err != nil {
		t.Fatalf("SetAppState (update): %v", err)
	}

	got, err = s.GetAppState("app-e")
	if err != nil {
		t.Fatalf("GetAppState after update: %v", err)
	}
	if got.MainWorktreeBranch != "develop" {
		t.Fatalf("after update: got MainWorktreeBranch=%q, want %q", got.MainWorktreeBranch, "develop")
	}
}

// TestMigrationIdempotentWithMainWorktreeBranch verifies that v2 migration
// preserves existing rows and allows MainWorktreeBranch to be set afterward.
func TestMigrationIdempotentWithMainWorktreeBranch(t *testing.T) {
	dir := t.TempDir()

	s1, err := Open(dir)
	if err != nil {
		t.Fatalf("first Open: %v", err)
	}
	if err := s1.SetBranch("app-f", "main"); err != nil {
		t.Fatalf("SetBranch: %v", err)
	}
	if err := s1.Close(); err != nil {
		t.Fatalf("first Close: %v", err)
	}

	s2, err := Open(dir)
	if err != nil {
		t.Fatalf("second Open: %v", err)
	}
	defer s2.Close()

	// Set MainWorktreeBranch on the re-opened store.
	if err := s2.SetMainWorktreeBranch("app-f", "main"); err != nil {
		t.Fatalf("SetMainWorktreeBranch after re-open: %v", err)
	}

	st, err := s2.GetAppState("app-f")
	if err != nil {
		t.Fatalf("GetAppState: %v", err)
	}
	if st.Branch != "main" {
		t.Fatalf("Branch not preserved: got %q", st.Branch)
	}
	if st.MainWorktreeBranch != "main" {
		t.Fatalf("MainWorktreeBranch: got %q, want %q", st.MainWorktreeBranch, "main")
	}
}

// TestCloseIsIdempotentError verifies that Close does not panic; a second call
// may return an error but must not panic.
func TestScriptArgsHistoryRoundTrip(t *testing.T) {
	s := openTemp(t)

	script := "test/hello.sh"
	first := map[string]string{"name": "Fabian", "times": "1"}
	second := map[string]string{"name": "Alice", "times": "2"}

	if err := s.AddScriptArgsHistory(script, first, 50); err != nil {
		t.Fatalf("AddScriptArgsHistory first: %v", err)
	}
	if err := s.AddScriptArgsHistory(script, second, 50); err != nil {
		t.Fatalf("AddScriptArgsHistory second: %v", err)
	}

	history, err := s.GetScriptArgsHistory(script, 50)
	if err != nil {
		t.Fatalf("GetScriptArgsHistory: %v", err)
	}
	if len(history) != 2 {
		t.Fatalf("expected 2 history entries, got %d", len(history))
	}
	if history[0]["name"] != "Alice" || history[1]["name"] != "Fabian" {
		t.Fatalf("unexpected history order/content: %+v", history)
	}
}

func TestScriptArgsHistoryTrim(t *testing.T) {
	s := openTemp(t)
	script := "test/trim.sh"

	for i := 0; i < 5; i++ {
		if err := s.AddScriptArgsHistory(script, map[string]string{"i": string(rune('0' + i))}, 3); err != nil {
			t.Fatalf("AddScriptArgsHistory %d: %v", i, err)
		}
	}

	history, err := s.GetScriptArgsHistory(script, 50)
	if err != nil {
		t.Fatalf("GetScriptArgsHistory: %v", err)
	}
	if len(history) != 3 {
		t.Fatalf("expected trimmed history length 3, got %d", len(history))
	}
	if history[0]["i"] != "4" || history[2]["i"] != "2" {
		t.Fatalf("unexpected trimmed history values: %+v", history)
	}
}

func TestCloseBehavior(t *testing.T) {
	dir := t.TempDir()
	s, err := Open(dir)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	if err := s.Close(); err != nil {
		t.Fatalf("first Close: %v", err)
	}
	// A second Close on a closed *sql.DB returns an error — that is acceptable.
	// What matters is that it does not panic.
	_ = s.Close()
}
