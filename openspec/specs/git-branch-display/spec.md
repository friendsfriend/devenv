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

### Requirement: Branch column updates immediately after worktree checkout
After a successful worktree checkout, the server SHALL broadcast a `status.updated` SSE event that contains the correct non-empty branch name for the switched app, without waiting for the background git poller.

#### Scenario: Branch shown immediately after switching to a new worktree branch
- **WHEN** a user triggers a checkout to a branch in worktree mode
- **AND** the checkout succeeds (new linked worktree is created or already exists)
- **THEN** the `status.updated` SSE event broadcast immediately after checkout carries the target branch name (not empty string)

#### Scenario: TUI branch column reflects new branch without polling delay
- **WHEN** the `status.updated` event with the new branch name is received by the TUI
- **THEN** the branch column for that app immediately shows the new branch name

#### Scenario: Branch broadcast falls back gracefully when branch is unknown
- **WHEN** the branch cannot be determined from either memory or filesystem
- **THEN** the broadcast still fires (with an empty branch field) and the TUI retains the previously displayed branch via `branch || app.branch`

---

### Requirement: Branch column shows worktree indicator when a linked worktree is active
When a linked worktree is active for an app, the branch column SHALL display a `⎇` icon prefix to signal that the app is operating in a linked worktree context rather than the primary worktree.

#### Scenario: Linked worktree active — icon shown
- **WHEN** an app has a non-empty `activeWorktree` field
- **THEN** the branch column displays `⎇ <branch-name>` (e.g., `⎇ quality`)

#### Scenario: No active worktree — no icon shown
- **WHEN** an app's `activeWorktree` field is empty or absent
- **THEN** the branch column displays the plain branch name without a worktree icon

---

### Requirement: /api/status includes activeWorktree field
The `/api/status` polling endpoint SHALL include the `activeWorktree` field in each app status entry so that the TUI can display the worktree indicator on every poll cycle, not only on initial load or after SSE events.

#### Scenario: Status response includes activeWorktree when a linked worktree is set
- **WHEN** an app has a non-empty `ActiveWorktree` in server state
- **AND** a client calls `GET /api/status`
- **THEN** the response entry for that app contains `"activeWorktree": "<branch>"

#### Scenario: Status response omits activeWorktree when none is set
- **WHEN** an app has no active linked worktree
- **AND** a client calls `GET /api/status`
- **THEN** the response entry for that app omits the `activeWorktree` field

#### Scenario: TUI polling keeps worktree indicator in sync
- **WHEN** the TUI `fetchStatus` polling loop receives a status response
- **THEN** `activeWorktree` is merged into the app state (set or deleted) so the branch column remains accurate between SSE events

---

### Requirement: MainWorktreeBranch is backfilled at startup for legacy apps
When the server starts, any app that has an `ActiveWorktree` set but a missing `MainWorktreeBranch` SHALL have `MainWorktreeBranch` resolved from git and persisted, ensuring worktree path resolution works correctly without requiring a user action.

#### Scenario: Backfill runs during loadRuntimeState
- **WHEN** the server loads runtime state from SQLite at startup
- **AND** an app has `active_worktree` set but `main_worktree_branch` empty
- **THEN** the server reads the primary worktree's current branch from git
- **THEN** `MainWorktreeBranch` is written to SQLite and set in memory

#### Scenario: No backfill needed when MainWorktreeBranch is already set
- **WHEN** an app already has a non-empty `main_worktree_branch` in SQLite
- **THEN** no git read is performed for that app during startup
