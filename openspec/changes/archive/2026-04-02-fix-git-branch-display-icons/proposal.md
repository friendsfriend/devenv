## Why

The recent worktree feature introduction broke branch display in the application/library tables — all apps now show `[WT] ...` regardless of their actual branch or git mode. Additionally, the text-based `[WT]` indicator is visually noisy; icons better communicate the git mode at a glance.

## What Changes

- Fix `GetCurrentBranch()` in the server to correctly resolve the current branch for linked worktrees (where `.git` is a file pointer, not a directory)
- Replace the `[WT] <branch>` text prefix with icon-based display:
  - Branch mode: ` <branch>` (e.g., ` main`)
  - Worktree mode: ` <branch>` (e.g., ` feature/login`)
- Ensure the live git poller and all status endpoints return correct branch names for both branch and worktree modes

## Capabilities

### New Capabilities

- `git-branch-display`: Unified branch display in the app table supporting both branch mode and worktree mode, with icon-based git mode indicators and correct branch resolution for linked worktrees

### Modified Capabilities

<!-- none -->

## Impact

- **Server**: `server/pkg/git/repository.go` — `GetCurrentBranch()` needs to handle `.git` as a file (linked worktree) by following the `gitdir:` pointer, mirroring the logic in `app/manager.go:getCurrentBranchFromGit()`
- **TUI**: `tui/packages/cli/src/tui/columns.ts` — branch column `render` function updated to use  /  icons instead of `[WT]` text prefix
- No API changes; `gitMode` field continues to be used for mode detection
- No breaking changes
