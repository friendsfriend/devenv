## ADDED Requirements

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
