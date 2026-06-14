## MODIFIED Requirements

### Requirement: Branch column shows icon-based git mode indicator
The branch column in the application and library tables SHALL display a git mode icon prefix before the branch name. Branch mode apps SHALL use the  icon. Worktree mode apps SHALL use the  icon.

#### Scenario: Branch mode app displays branch icon
- **WHEN** an app has `gitMode` of `BRANCH` or no `gitMode` set
- **THEN** the branch column displays ` <branch-name>` (e.g., ` main`)

#### Scenario: Worktree mode app displays worktree icon
- **WHEN** an app has `gitMode` of `WORKTREE`
- **THEN** the branch column displays ` <branch-name>` (e.g., ` feature/login`)

#### Scenario: Unknown branch shows icon with fallback
- **WHEN** an app's branch is not yet resolved (empty)
- **THEN** the branch column displays ` ...` or ` ...` depending on git mode

#### Scenario: Press g to open the branch selector
- **WHEN** the table view is active
- **AND** the user presses `g`
- **THEN** the branch selector modal opens for the selected app
- **AND** pressing `b` does NOT open the branch selector

#### Scenario: Press Shift+G to open lazygit
- **WHEN** the table view is active
- **AND** the user presses `Shift+G` (sequence `G`)
- **THEN** lazygit opens for the selected app's directory
- **AND** pressing `g` (lowercase) does NOT open lazygit
