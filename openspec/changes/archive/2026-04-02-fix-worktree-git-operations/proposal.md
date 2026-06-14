## Why

Two regressions were introduced with the worktree implementation: git operations (pull, push, fetch) fail on the main worktree because the active path resolves to a non-existent linked worktree directory (e.g., `installer-fe.qa`), and builds on the main worktree always emit "Error: Checkout needed" because `LocalDirectoryPath` points to a linked worktree directory that has not been created yet. Both bugs block normal workflows on any app that is in `WORKTREE` mode and currently has its primary (main) worktree selected.

## What Changes

- **Fix git pull/push/fetch path resolution for main worktree**: When `activeWorktree` equals `mainWorktreeBranch`, git operations must resolve to `primaryWorktreeDir` (`$DEVENV_HOME/{ident}/{ident}/`), not a linked worktree path. The existing `resolveActiveWorktreePath` logic should already handle this case, but there is a mismatch between how `ActiveWorktree` is initialised/persisted and what the path resolver expects.
- **Fix "Checkout needed" on main worktree after initial clone**: When the active worktree is the main branch, `LocalDirectoryPath` must point to the primary worktree directory (which is created by the initial clone). The root cause is that after the initial clone `ActiveWorktree` is stored as the branch name (e.g., `develop`) while `MainWorktreeBranch` may be empty or set asynchronously, causing the path resolver to fall into the linked-worktree branch and construct a path that does not yet exist.
- **Ensure main worktree is always used as a pass-through clone, never as a mutable working tree**: When a user selects a branch in worktree mode, immediately create a linked worktree for that branch instead of using the primary worktree directly. This prevents the "Checkout needed" cycle described above.
- **No breaking changes** to the public API, app configuration format, or worktree directory layout.

## Capabilities

### New Capabilities

- `worktree-main-path-resolution`: Correct and reliable resolution of the primary worktree path for all git and build operations when `activeWorktree` equals `mainWorktreeBranch` or when `activeWorktree` is empty.

### Modified Capabilities

- `worktree-checkout`: When a user checks out a branch in worktree mode, always route through `AddWorktree` (creating a linked worktree) even if the requested branch happens to be the `mainWorktreeBranch`, so that `LocalDirectoryPath` always points to a directory that exists on disk.

## Impact

- `server/pkg/app/manager.go` — `resolveActiveWorktreePath` and initialization of `ActiveWorktree` / `MainWorktreeBranch` at app load time.
- `server/pkg/server/server.go` — `updateOrCreateRepoWithStatus`: ordering of `SetMainWorktreeBranch` vs. `ActiveWorktree` persistence.
- `server/pkg/server/handlers_apps.go` — app creation seeds; ensure `MainWorktreeBranch` is written before any path resolution occurs.
- `server/pkg/git/repository.go` — `Pull`, `Push`, `Fetch` path usage; `AddWorktree` logic for the main-branch case.
- `server/pkg/build/service.go` — no logic change expected; will be fixed as a side-effect of correct path resolution.
- No frontend changes required.
