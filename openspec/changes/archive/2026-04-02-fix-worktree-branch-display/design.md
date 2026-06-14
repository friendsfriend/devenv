## Context

In worktree mode, switching branches creates (or reuses) a linked git worktree directory for the target branch. After a checkout, `broadcastAppStatus` is called to push a `status.updated` SSE event to the TUI. That function calls `GetCurrentBranch(adapter)`, which reads `{LocalDirectoryPath}/.git/HEAD` from the filesystem.

The problem: for a **newly created** linked worktree, the `wt switch --create` command just finished, but the filesystem HEAD file may not yet be readable (or `GetCurrentBranch` may return `""` for some other transient reason). When `branch` is empty, the TUI SSE handler falls through to `branch || app.branch`, keeping the old branch displayed.

`UpdateAppActiveWorktree` already sets `app.Branch = branch` in memory and persists it to SQLite **before** the broadcast. The in-memory value is trusted and authoritative. The filesystem HEAD is an independent source that is used as a consistency check by the git poller, but is unnecessary and unreliable at broadcast time right after checkout.

## Goals / Non-Goals

**Goals:**
- Branch column in the TUI updates immediately and correctly after a worktree checkout
- Use the already-resolved in-memory branch value in `broadcastAppStatus` rather than re-reading from the filesystem
- No regression for non-worktree apps (branch-mode apps still use `GetCurrentBranch` as usual)

**Non-Goals:**
- Changing how the background git poller resolves branches
- Changing how `GetCurrentBranch` works for general use
- Any TUI-side changes

## Decisions

### Decision 1: Pass the known branch into the broadcast rather than re-reading from git

**Options considered:**
1. **(Chosen)** After `UpdateAppActiveWorktree`, pass the branch string explicitly to a new `broadcastAppStatusWithBranch(appIdent, branch)` helper, which uses the provided branch instead of calling `GetCurrentBranch`.
2. Have `broadcastAppStatus` read `app.Branch` from the reloaded `s.apps` slice instead of calling `GetCurrentBranch`. This is simpler but means `broadcastAppStatus` silently changes semantics — the git poller also calls `broadcastAppStatus` and expects it to read from git.
3. Add a small retry loop (already implemented as `broadcastAppStatusWithRetry` for Docker) that waits until `GetCurrentBranch` returns non-empty. Risk: adds latency and complexity.

**Rationale:** Option 1 is the most targeted fix — only the post-checkout broadcast path is affected. The existing `broadcastAppStatus` signature stays the same for the git poller path. A small helper is easy to test and reason about.

### Decision 2: Fall back to GetCurrentBranch when the provided branch is empty

When the provided branch is somehow empty (defensive), fall through to the existing `GetCurrentBranch` call so the behavior degrades gracefully.

## Risks / Trade-offs

- [Risk] The in-memory branch set by `UpdateAppActiveWorktree` could in theory differ from what was actually checked out (e.g., if `wt switch --create` failed silently after returning nil). → Mitigation: `Checkout`/`AddWorktree` returns an error that is checked before `UpdateAppActiveWorktree` is called, so the branch is only persisted on success.
- [Trade-off] The git poller may still briefly show the wrong branch if it runs before the new worktree HEAD file is fully written. This is unchanged by this fix — the poller path is out of scope.

## Migration Plan

No migration needed. This is a purely server-side behavioral fix with no API or schema changes. No downtime or rollback steps required.

## Open Questions

None.
