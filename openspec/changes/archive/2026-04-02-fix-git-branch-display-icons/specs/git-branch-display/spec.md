## ADDED Requirements

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

### Requirement: Branch resolution works for linked worktrees
The server SHALL correctly resolve and return the current branch name for apps operating as linked git worktrees (where the app directory contains a `.git` file rather than a `.git` directory).

#### Scenario: Linked worktree branch is resolved via live poller
- **WHEN** the git poller runs for a worktree-mode app whose `.git` is a file pointer
- **THEN** the polled branch name matches the branch currently checked out in that worktree

#### Scenario: Linked worktree branch is resolved on status request
- **WHEN** a client requests `/api/status` for a worktree-mode app
- **THEN** the response contains the correct branch name for that linked worktree

#### Scenario: Primary worktree (plain clone) branch is unaffected
- **WHEN** a branch-mode app or primary worktree has a `.git` directory
- **THEN** `GetCurrentBranch()` continues to return the correct branch name as before
