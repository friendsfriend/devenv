## MODIFIED Requirements

### Requirement: Build succeeds on main worktree immediately after app creation
When a `WORKTREE`-mode app is created and the main branch is active, the system SHALL be able to complete initial checkout and build without requiring the user to switch to a different worktree and back.

#### Scenario: Initial checkout uses selected branch after reload
- **WHEN** a `WORKTREE`-mode app has just been created with a selected branch
- **AND** the server reloads app config before starting async checkout
- **THEN** the checkout app state still contains the selected branch
- **THEN** initial clone does not run with an empty branch

#### Scenario: Build succeeds without worktree switch
- **WHEN** a `WORKTREE`-mode app has just been created and the main branch is selected
- **THEN** triggering a build does NOT emit "Error: Checkout needed"

#### Scenario: LocalDirectoryPath always points to an existing directory for valid active worktree
- **WHEN** `activeWorktree` is a branch for which `AddWorktree` has been called (including the main branch via primary dir)
- **THEN** `LocalDirectoryPath` resolves to a directory that exists on disk
