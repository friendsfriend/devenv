### Requirement: Build succeeds on main worktree immediately after app creation
When a `WORKTREE`-mode app is created and the main branch is active, the system SHALL be able to build without requiring the user to switch to a different worktree and back.

#### Scenario: Build succeeds without worktree switch
- **WHEN** a `WORKTREE`-mode app has just been created and the main branch is selected
- **THEN** triggering a build does NOT emit "Error: Checkout needed"

#### Scenario: LocalDirectoryPath always points to an existing directory for valid active worktree
- **WHEN** `activeWorktree` is a branch for which `AddWorktree` has been called (including the main branch via primary dir)
- **THEN** `LocalDirectoryPath` resolves to a directory that exists on disk

### Requirement: Switching to a branch in worktree mode creates a linked worktree
When a user checks out a branch in `WORKTREE`-mode, the system SHALL create a linked worktree for that branch (if one does not already exist) before updating `ActiveWorktree`.

#### Scenario: Checkout creates linked worktree for new branch
- **WHEN** the user checks out a branch that is not the `mainWorktreeBranch` and no linked worktree exists for it
- **THEN** a linked worktree is created at `$DEVENV_HOME/{ident}/{ident}.{sanitized-branch}/`
- **THEN** `ActiveWorktree` is updated to the checked-out branch

#### Scenario: Checkout to already-existing linked worktree
- **WHEN** the user checks out a branch for which a linked worktree already exists
- **THEN** no new worktree directory is created
- **THEN** `ActiveWorktree` is updated to the checked-out branch

#### Scenario: Checkout to main branch uses primary worktree
- **WHEN** the user checks out `mainWorktreeBranch`
- **THEN** `AddWorktree` returns the primary worktree path (no linked worktree created)
- **THEN** `ActiveWorktree` is set to `mainWorktreeBranch`
- **THEN** subsequent builds use the primary worktree directory and succeed

---

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
