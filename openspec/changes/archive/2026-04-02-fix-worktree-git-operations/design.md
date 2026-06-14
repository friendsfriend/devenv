## Context

The recent worktree implementation introduced `WORKTREE` mode for apps, where a single remote is cloned once into a primary worktree (`$DEVENV_HOME/{ident}/{ident}/`) and additional linked worktrees are created per branch (`$DEVENV_HOME/{ident}/{ident}.{sanitized-branch}/`).

Two bugs have been identified:

**Bug 1 — Git operations fail on main worktree**  
HTTP 500: `failed to open repository at …/installer-fe.qa: repository does not exist`  
All git operations (pull, push, fetch) resolve the working directory via `app.GetLocalDirectoryPath()`, which delegates to `resolveActiveWorktreePath`. When `activeWorktree` equals `mainWorktreeBranch`, this should return the primary worktree path. The error implies that at runtime `activeWorktree` contains a value that causes the resolver to compute a *linked* worktree path (e.g., `installer-fe.qa`) rather than the primary path (`installer-fe`), even though the user has "main worktree" selected. The mismatch originates in how `ActiveWorktree` is seeded at app creation vs. how `MainWorktreeBranch` is populated (which happens asynchronously after the clone).

**Bug 2 — "Error: Checkout needed" on build for main worktree**  
Build service emits `"Error: Checkout needed"` when `a.LocalDirectoryPath` does not exist on disk. When the primary worktree is selected and `LocalDirectoryPath` resolves to a linked worktree path that was never created (same root cause as Bug 1, or the branch is the `mainWorktreeBranch` but `AddWorktree` was never called for it as a linked worktree), the directory is missing. The workaround of switching away and back forces `AddWorktree` to run and create the linked worktree, which then has a valid directory.

Both bugs share the same root cause: **ambiguity in what `ActiveWorktree` holds relative to `MainWorktreeBranch`** during and after the initial clone lifecycle.

## Goals / Non-Goals

**Goals:**
- Git operations (pull, push, fetch) succeed when the primary/main worktree is selected.
- Build/run/test succeed immediately after app creation without requiring a worktree switch.
- `resolveActiveWorktreePath` always returns a directory that exists on disk for any valid `activeWorktree` value.
- Fix is backward-compatible: existing apps persisted in SQLite continue to work.

**Non-Goals:**
- Changing the on-disk directory layout for worktrees.
- Fixing the `BRANCH` mode code path.
- Addressing worktree removal or pruning behaviour.
- Frontend changes.

## Decisions

### Decision 1: Synchronise `MainWorktreeBranch` before first path resolution

**Problem**: `MainWorktreeBranch` is set asynchronously in `server.go → updateOrCreateRepoWithStatus` *after* the clone completes, but `ActiveWorktree` is seeded at app creation time in `handlers_apps.go` using the requested branch name. If path resolution runs before the async write commits, the comparator `active == mainWorktreeBranch` fails.

**Decision**: Write `MainWorktreeBranch` *synchronously* at app creation time (in `handlers_apps.go`) using the requested branch, the same value that is seeded into `ActiveWorktree`. The async clone can then overwrite it with the `actualBranch` returned by git. This ensures that from the first moment of path resolution there is always a non-empty `MainWorktreeBranch` that matches `ActiveWorktree`.

**Alternatives considered**:
- *Derive `MainWorktreeBranch` lazily from the on-disk primary worktree*: Adds filesystem I/O on every path resolution; not suitable for hot paths.
- *Treat empty `MainWorktreeBranch` as "always use primary dir"*: Masks the real issue and breaks once the branch diverges.

### Decision 2: Treat `MainWorktreeBranch` as the canonical alias for the primary directory

**Problem**: `resolveActiveWorktreePath` returns the primary dir only when `active == "" || active == mainWorktreeBranch`. If `mainWorktreeBranch` is empty or stale, any truthy `activeWorktree` routes to a linked path.

**Decision**: Add a dedicated guard in `resolveActiveWorktreePath`: if `MainWorktreeBranch` is empty, *always* fall back to the primary dir. Document this invariant. No path computation should ever produce a linked worktree path when `mainWorktreeBranch` is unavailable.

### Decision 3: Never use the primary worktree as a mutable working directory for branch operations

**Problem**: When the user selects a branch that happens to be `mainWorktreeBranch`, no linked worktree is created for it, so `LocalDirectoryPath` resolves to the primary dir (which is correct). But if the branch is later changed in the primary dir (by an external `git checkout`) the primary dir's branch drifts and future path resolution breaks.

**Decision**: The primary worktree is a *pass-through clone only* — it is never directly operated on by user-facing git operations. All user-facing operations (build, run, pull, push) MUST use a path that was produced by `AddWorktree`. For the `mainWorktreeBranch`, `AddWorktree` already short-circuits and returns `primaryDir` when `branch == mainWorktreeBranch` (lines 1089–1097 in `repository.go`). This is the correct behaviour and should be preserved.

**Alternatives considered**:
- *Create a linked worktree even for mainWorktreeBranch*: Would work but wastes disk space duplicating the primary working tree.

### Decision 4: Pull path in `Pull` operation must respect worktree mode

**Problem**: The `Pull` method always calls `app.GetLocalDirectoryPath()`, which for worktree-mode apps returns the active worktree path. When the path resolver is broken (Decision 1 root cause), this produces a non-existent path.

**Decision**: This is *not* a separate issue — fixing Decisions 1 & 2 makes `GetLocalDirectoryPath()` return the correct path. No changes to `Pull` itself are needed.

## Risks / Trade-offs

- **[Risk] Async clone overwrites `MainWorktreeBranch` with `actualBranch`**: If the requested branch does not exist and the clone falls back to the remote default branch, `actualBranch ≠ requestedBranch`. The synchronously written `MainWorktreeBranch` will be stale until the async write completes. During that window, path resolution uses the requested branch as the main branch identifier, but the actual primary dir is checked out on a different branch. → **Mitigation**: The async write in `server.go` already overwrites `MainWorktreeBranch` with `actualBranch`. The window is small (duration of clone), and during it the app is in a "cloning" state where git operations are not yet expected to succeed anyway. No further mitigation needed.

- **[Risk] Existing apps with empty `MainWorktreeBranch` in SQLite**: Older apps may have `MainWorktreeBranch = ""`. The Decision 2 guard (fall back to primary dir when empty) handles this correctly. → **Mitigation**: No migration needed; the guard is the migration.

- **[Trade-off] Synchronous write adds one SQLite write per app creation**: Minimal overhead; app creation is not a hot path.

## Migration Plan

1. Deploy the server-side fix.
2. Existing apps: the Decision 2 guard ensures any app with `MainWorktreeBranch = ""` continues to work by falling back to the primary dir.
3. Apps with a stale (but non-empty) `MainWorktreeBranch` in SQLite: these are rare (would require a manual DB edit). If encountered, the user can remove and re-add the app.
4. No frontend changes needed.
5. Rollback: revert the server binary; SQLite state is unchanged.

## Open Questions

- None. Both root causes are identified and the fixes are straightforward.
