## 1. Runtime State Persistence

- [x] 1.1 Identify the new-app creation path that seeds SQLite runtime state before `reloadAppConfig()`.
- [x] 1.2 Persist initial `Branch`, `ActiveWorktree`, and `MainWorktreeBranch` using the selected branch during app creation.
- [x] 1.3 Keep app definition JSON static-only; do not write runtime fields to config files.

## 2. Regression Coverage

- [x] 2.1 Add a backend regression test proving branch, active worktree, and main worktree branch survive `LoadConfig()` after app creation.
- [x] 2.2 Add or update coverage proving initial checkout receives the selected branch, not an empty branch.

## 3. Validation

- [x] 3.1 Run relevant Go tests for app manager/server git creation flow.
- [x] 3.2 Run the full test suite.
- [x] 3.3 Check pi-lens issues if available.
