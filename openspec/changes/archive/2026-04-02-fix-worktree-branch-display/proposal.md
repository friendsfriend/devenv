## Why

After a worktree checkout (switching to a different branch in worktree mode), the branch column in the TUI apps table does not update to reflect the new branch. The user sees the old branch name until the background git poller fires again (up to 5 seconds later), or sometimes never if the HEAD file for the newly created worktree is not yet readable on disk.

## What Changes

- `broadcastAppStatus` will use the already-resolved branch from the in-memory app state (set by `UpdateAppActiveWorktree`) rather than re-reading it from the filesystem via `GetCurrentBranch`, which can return empty for a freshly created linked worktree whose HEAD file may not yet be readable.
- The `status.updated` SSE event broadcast after a checkout will always carry the correct non-empty branch name for worktree-mode apps.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `git-branch-display`: Add requirement that the branch column updates immediately and correctly after a worktree checkout, even when the new linked worktree directory has just been created.

## Impact

- `server/pkg/server/server.go` — `broadcastAppStatus`: minor change to prefer in-memory branch over filesystem read when the app object already carries a trusted branch value
- `server/pkg/server/handlers_git.go` — `handleGitCheckout`: possibly pass the resolved branch explicitly to the broadcast call
- No API or schema changes
- No TUI changes required (SSE handler already uses `branch || app.branch` which will work correctly once the server sends a non-empty branch)
