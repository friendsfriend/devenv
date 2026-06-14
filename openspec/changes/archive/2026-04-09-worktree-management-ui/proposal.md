## Why

Users currently have no way to inspect or clean up worktrees directly from the TUI — they must exit the app and run `wt delete` commands manually. A dedicated worktree management modal accessible via `w` provides a quick overview and lets users delete stale worktrees without leaving the interface.

## What Changes

- A new `w` keybinding on the main table opens a **Worktree Manager modal** scoped to the focused application.
- The modal lists all worktrees for the app (branch name, path, active/main flags).
- Pressing `d` on a selected worktree calls the existing `removeWorktree` API and refreshes the list; the same guard already in `removeWorktreeAction` (prevent deletion of active/primary) applies.
- The modal is dismissed with `Escape` or `q`.

## Capabilities

### New Capabilities

- `worktree-manager-modal`: A focusable list modal that displays all worktrees for a selected application and supports deleting non-active, non-primary worktrees via the `d` key.

### Modified Capabilities

- `worktree-checkout`: The existing `removeWorktreeAction` guard logic (blocks deletion of active/primary worktrees) must be reused from the new modal's delete path — no spec-level requirement change, implementation detail only.

## Impact

- **New files**: `WorktreeManagerModal.tsx` (UI), `worktree-manager-keys.ts` (keyboard handler)
- **Modified files**: `ui-store.ts` (two new signals), `modal-overlays.tsx` (render modal), `keyboard/index.ts` (export), `app-opentui.tsx` (wire handler + actions), `keyboard/types.ts` (extend `KeyboardActions`/`KeyboardStores`)
- **No new API endpoints** — uses existing `GET /api/git/worktrees` and `DELETE /api/git/worktrees` via the existing `listWorktrees` / `removeWorktree` client functions.
- **No breaking changes.**
