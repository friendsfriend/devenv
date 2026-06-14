## ADDED Requirements

### Requirement: Creating a new worktree branch via wt switch --create
The system SHALL support creating a brand-new branch as a worktree via the `wt switch --create <name>` command when the user requests a new branch from the TUI create-branch flow.

#### Scenario: wt switch --create creates worktree for a branch that does not exist
- **WHEN** the app's `gitMode` is `WORKTREE`
- **AND** the user requests creation of a branch name that does not yet exist locally or remotely
- **THEN** the server executes `wt switch --create <name>`
- **THEN** a new linked worktree is created at `$DEVENV_HOME/{ident}/{ident}.{sanitized-branch}/`
- **THEN** `ActiveWorktree` is updated to the new branch name

#### Scenario: wt switch --create is distinct from checkout of existing branch
- **WHEN** the user creates a branch via the create flow (not the checkout flow)
- **THEN** the server uses `wt switch --create` rather than the standard checkout path
- **THEN** the behavior is identical to the existing linked-worktree creation for new branches after this point
