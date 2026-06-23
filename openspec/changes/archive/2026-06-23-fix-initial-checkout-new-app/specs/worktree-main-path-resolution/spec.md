## MODIFIED Requirements

### Requirement: MainWorktreeBranch is populated synchronously at app creation
When a `WORKTREE`-mode app is created, the system SHALL write initial runtime state for the requested branch before any path resolution or async checkout occurs. This runtime state SHALL include `Branch`, `ActiveWorktree`, and `MainWorktreeBranch` with the requested branch name.

#### Scenario: Initial runtime state is set at creation time
- **WHEN** a new `WORKTREE`-mode app is created with a requested branch
- **THEN** `Branch` is persisted in SQLite immediately using the requested branch name
- **THEN** `ActiveWorktree` is persisted in SQLite immediately using the requested branch name
- **THEN** `MainWorktreeBranch` is persisted in SQLite immediately using the requested branch name

#### Scenario: Async clone overwrites MainWorktreeBranch with actual branch
- **WHEN** the initial clone completes and `actualBranch` differs from the requested branch (e.g., fallback to default branch)
- **THEN** `MainWorktreeBranch` is updated to `actualBranch` in SQLite
