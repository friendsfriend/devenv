// Package state manages runtime/local storage data that changes during
// application operation (current branch, active worktree, etc.).
//
// This is intentionally separate from the configuration layer
// (~/.config/devenv) which is static, human-edited and version-controllable.
// State lives in $DEVENV_HOME/db/state.db (a SQLite database).
package state

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	_ "modernc.org/sqlite" // pure-Go SQLite driver
)

const schemaVersion = 3

// AppState holds the mutable runtime state for a single application.
type AppState struct {
	// Ident is the application identifier (matches app config ident).
	Ident string
	// Branch is the currently checked-out git branch.
	Branch string
	// ActiveWorktree is the branch/name of the currently active worktree
	// (only meaningful when the app is in worktree mode).
	ActiveWorktree string
	// MainWorktreeBranch is the branch that was checked out in the primary
	// worktree when it was first cloned.  It is discovered at clone time and
	// must never be written to the static config JSON files.
	MainWorktreeBranch string
}

// Store provides read/write access to the runtime state database.
type Store interface {
	// GetAppState returns the stored runtime state for an app.
	// If no state has been recorded yet, a zero-value AppState is returned
	// (not an error).
	GetAppState(ident string) (AppState, error)

	// SetBranch persists the current branch for an app.
	SetBranch(ident, branch string) error

	// SetActiveWorktree persists the active worktree for an app.
	SetActiveWorktree(ident, worktree string) error

	// SetMainWorktreeBranch persists the branch of the primary worktree.
	// This is called once after the initial clone when the actual branch is
	// known (the remote may have redirected from the requested branch to its
	// default branch).
	SetMainWorktreeBranch(ident, branch string) error

	// SetAppState upserts branch, active worktree, and main worktree branch at once.
	SetAppState(s AppState) error

	// GetScriptArgsHistory returns newest-first script argument entries for a script path.
	GetScriptArgsHistory(relativePath string, limit int) ([]map[string]string, error)

	// AddScriptArgsHistory inserts one script argument entry and trims history to maxEntries.
	AddScriptArgsHistory(relativePath string, values map[string]string, maxEntries int) error

	// Close releases database resources.
	Close() error
}

type sqliteStore struct {
	mu sync.Mutex
	db *sql.DB
}

// Open opens (or creates) the SQLite state database at dbDir/state.db.
// dbDir is created if it does not exist.
func Open(dbDir string) (Store, error) {
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		return nil, fmt.Errorf("state: failed to create db directory %q: %w", dbDir, err)
	}

	dbPath := filepath.Join(dbDir, "state.db")
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("state: failed to open database %q: %w", dbPath, err)
	}

	// SQLite performs best with a single writer connection.
	db.SetMaxOpenConns(1)

	s := &sqliteStore{db: db}
	if err := s.migrate(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("state: schema migration failed: %w", err)
	}
	return s, nil
}

// migrate applies all outstanding schema migrations in order.
func (s *sqliteStore) migrate() error {
	// Enable WAL mode for better read/write concurrency.
	if _, err := s.db.Exec(`PRAGMA journal_mode=WAL`); err != nil {
		return fmt.Errorf("enabling WAL mode: %w", err)
	}
	if _, err := s.db.Exec(`PRAGMA foreign_keys=ON`); err != nil {
		return fmt.Errorf("enabling foreign keys: %w", err)
	}

	// Metadata table to track the applied schema version.
	if _, err := s.db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_meta (
			key   TEXT PRIMARY KEY,
			value TEXT NOT NULL
		)
	`); err != nil {
		return fmt.Errorf("creating schema_meta: %w", err)
	}

	var current int
	row := s.db.QueryRow(`SELECT value FROM schema_meta WHERE key = 'version'`)
	_ = row.Scan(&current) // ignore "no rows" – current stays 0

	if current < 1 {
		if err := s.applyV1(); err != nil {
			return err
		}
		current = 1
	}

	if current < 2 {
		if err := s.applyV2(); err != nil {
			return err
		}
		current = 2
	}

	if current < 3 {
		if err := s.applyV3(); err != nil {
			return err
		}
		current = 3
	}

	if _, err := s.db.Exec(`
		INSERT INTO schema_meta (key, value) VALUES ('version', ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value
	`, fmt.Sprintf("%d", current)); err != nil {
		return fmt.Errorf("updating schema version: %w", err)
	}

	return nil
}

// applyV1 creates the initial schema (version 1).
func (s *sqliteStore) applyV1() error {
	_, err := s.db.Exec(`
		CREATE TABLE IF NOT EXISTS app_state (
			ident           TEXT PRIMARY KEY,
			branch          TEXT NOT NULL DEFAULT '',
			active_worktree TEXT NOT NULL DEFAULT '',
			updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
		)
	`)
	if err != nil {
		return fmt.Errorf("creating app_state table: %w", err)
	}
	return nil
}

// applyV2 adds the main_worktree_branch column introduced when MainWorktreeBranch
// was moved from the static config JSON into the SQLite runtime state.
func (s *sqliteStore) applyV2() error {
	_, err := s.db.Exec(`
		ALTER TABLE app_state
		ADD COLUMN main_worktree_branch TEXT NOT NULL DEFAULT ''
	`)
	if err != nil {
		return fmt.Errorf("adding main_worktree_branch column: %w", err)
	}
	return nil
}

// applyV3 creates script argument history storage.
func (s *sqliteStore) applyV3() error {
	if _, err := s.db.Exec(`
		CREATE TABLE IF NOT EXISTS script_args_history (
			id                   INTEGER PRIMARY KEY AUTOINCREMENT,
			script_relative_path TEXT NOT NULL,
			args_json            TEXT NOT NULL,
			created_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
		)
	`); err != nil {
		return fmt.Errorf("creating script_args_history table: %w", err)
	}
	if _, err := s.db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_script_args_history_path_id
		ON script_args_history(script_relative_path, id DESC)
	`); err != nil {
		return fmt.Errorf("creating script_args_history index: %w", err)
	}
	return nil
}

func (s *sqliteStore) GetAppState(ident string) (AppState, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var st AppState
	st.Ident = ident
	row := s.db.QueryRow(
		`SELECT branch, active_worktree, main_worktree_branch FROM app_state WHERE ident = ?`, ident,
	)
	err := row.Scan(&st.Branch, &st.ActiveWorktree, &st.MainWorktreeBranch)
	if err == sql.ErrNoRows {
		return st, nil // no stored state yet is fine
	}
	if err != nil {
		return st, fmt.Errorf("state: GetAppState(%q): %w", ident, err)
	}
	return st, nil
}

func (s *sqliteStore) SetBranch(ident, branch string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.db.Exec(`
		INSERT INTO app_state (ident, branch, active_worktree, main_worktree_branch)
		VALUES (?, ?, '', '')
		ON CONFLICT(ident) DO UPDATE SET
			branch     = excluded.branch,
			updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
	`, ident, branch)
	if err != nil {
		return fmt.Errorf("state: SetBranch(%q, %q): %w", ident, branch, err)
	}
	return nil
}

func (s *sqliteStore) SetActiveWorktree(ident, worktree string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.db.Exec(`
		INSERT INTO app_state (ident, branch, active_worktree, main_worktree_branch)
		VALUES (?, '', ?, '')
		ON CONFLICT(ident) DO UPDATE SET
			active_worktree = excluded.active_worktree,
			updated_at      = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
	`, ident, worktree)
	if err != nil {
		return fmt.Errorf("state: SetActiveWorktree(%q, %q): %w", ident, worktree, err)
	}
	return nil
}

func (s *sqliteStore) SetMainWorktreeBranch(ident, branch string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.db.Exec(`
		INSERT INTO app_state (ident, branch, active_worktree, main_worktree_branch)
		VALUES (?, '', '', ?)
		ON CONFLICT(ident) DO UPDATE SET
			main_worktree_branch = excluded.main_worktree_branch,
			updated_at           = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
	`, ident, branch)
	if err != nil {
		return fmt.Errorf("state: SetMainWorktreeBranch(%q, %q): %w", ident, branch, err)
	}
	return nil
}

func (s *sqliteStore) SetAppState(st AppState) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.db.Exec(`
		INSERT INTO app_state (ident, branch, active_worktree, main_worktree_branch)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(ident) DO UPDATE SET
			branch               = excluded.branch,
			active_worktree      = excluded.active_worktree,
			main_worktree_branch = excluded.main_worktree_branch,
			updated_at           = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
	`, st.Ident, st.Branch, st.ActiveWorktree, st.MainWorktreeBranch)
	if err != nil {
		return fmt.Errorf("state: SetAppState(%q): %w", st.Ident, err)
	}
	return nil
}

func (s *sqliteStore) GetScriptArgsHistory(relativePath string, limit int) ([]map[string]string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}

	rows, err := s.db.Query(`
		SELECT args_json
		FROM script_args_history
		WHERE script_relative_path = ?
		ORDER BY id DESC
		LIMIT ?
	`, relativePath, limit)
	if err != nil {
		return nil, fmt.Errorf("state: GetScriptArgsHistory(%q): %w", relativePath, err)
	}
	defer rows.Close()

	history := make([]map[string]string, 0)
	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			return nil, fmt.Errorf("state: scanning script args history: %w", err)
		}
		values := map[string]string{}
		if err := json.Unmarshal([]byte(raw), &values); err != nil {
			continue
		}
		history = append(history, values)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("state: iterating script args history: %w", err)
	}

	return history, nil
}

func (s *sqliteStore) AddScriptArgsHistory(relativePath string, values map[string]string, maxEntries int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if maxEntries <= 0 {
		maxEntries = 50
	}
	if maxEntries > 200 {
		maxEntries = 200
	}

	payload, err := json.Marshal(values)
	if err != nil {
		return fmt.Errorf("state: marshal script args history for %q: %w", relativePath, err)
	}

	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("state: begin tx for script args history: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.Exec(`
		INSERT INTO script_args_history (script_relative_path, args_json)
		VALUES (?, ?)
	`, relativePath, string(payload)); err != nil {
		return fmt.Errorf("state: insert script args history for %q: %w", relativePath, err)
	}

	if _, err := tx.Exec(`
		DELETE FROM script_args_history
		WHERE script_relative_path = ?
		  AND id NOT IN (
			SELECT id FROM script_args_history
			WHERE script_relative_path = ?
			ORDER BY id DESC
			LIMIT ?
		  )
	`, relativePath, relativePath, maxEntries); err != nil {
		return fmt.Errorf("state: trim script args history for %q: %w", relativePath, err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("state: commit script args history for %q: %w", relativePath, err)
	}

	return nil
}

func (s *sqliteStore) Close() error {
	return s.db.Close()
}
