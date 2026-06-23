### Requirement: Primary worktree path resolves correctly when active worktree matches main branch
When a `WORKTREE`-mode app has `ActiveWorktree` equal to `MainWorktreeBranch`, the system SHALL resolve `LocalDirectoryPath` to the primary worktree directory (`$DEVENV_HOME/{ident}/{ident}/`).

#### Scenario: Path resolves to primary dir when active equals main
- **WHEN** `activeWorktree == mainWorktreeBranch` (both non-empty)
- **THEN** `resolveActiveWorktreePath` returns the primary worktree directory

#### Scenario: Path resolves to primary dir when active worktree is empty
- **WHEN** `activeWorktree` is an empty string
- **THEN** `resolveActiveWorktreePath` returns the primary worktree directory

#### Scenario: Path resolves to primary dir when main branch is unknown
- **WHEN** `mainWorktreeBranch` is an empty string (legacy or mid-clone state)
- **THEN** `resolveActiveWorktreePath` returns the primary worktree directory as a safe fallback

#### Scenario: Path resolves to linked worktree dir for non-main branch
- **WHEN** `activeWorktree` is non-empty AND differs from `mainWorktreeBranch`
- **THEN** `resolveActiveWorktreePath` returns `$DEVENV_HOME/{ident}/{ident}.{sanitized-branch}/`

### Requirement: Initial runtime state is populated synchronously at app creation
When a `WORKTREE`-mode app is created, the system SHALL write `Branch`, `ActiveWorktree`, and `MainWorktreeBranch` with the requested branch name before any path resolution or initial checkout occurs.

#### Scenario: Runtime state is set at creation time
- **WHEN** a new `WORKTREE`-mode app is created with a requested branch
- **THEN** `Branch`, `ActiveWorktree`, and `MainWorktreeBranch` are persisted in SQLite immediately (synchronously) using the requested branch name

#### Scenario: Async clone overwrites MainWorktreeBranch with actual branch
- **WHEN** the initial clone completes and `actualBranch` differs from the requested branch (e.g., fallback to default branch)
- **THEN** `MainWorktreeBranch` is updated to `actualBranch` in SQLite

### Requirement: Git operations succeed when primary worktree is selected
When a `WORKTREE`-mode app has the main branch selected, all git operations (pull, push, fetch) SHALL operate on the primary worktree directory without error.

#### Scenario: Pull succeeds on main worktree
- **WHEN** the user triggers a pull with `activeWorktree == mainWorktreeBranch`
- **THEN** the pull operation uses the primary worktree path and succeeds without an HTTP 500 error

#### Scenario: Push succeeds on main worktree
- **WHEN** the user triggers a push with `activeWorktree == mainWorktreeBranch`
- **THEN** the push operation uses the primary worktree path and succeeds

#### Scenario: Fetch succeeds on main worktree
- **WHEN** the user triggers a fetch with `activeWorktree == mainWorktreeBranch`
- **THEN** the fetch operation uses the primary worktree path and succeeds
