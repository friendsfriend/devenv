## Context

The TUI app table already renders per-app state (branch, worktree mode, active worktree). Git worktrees are managed by a Go server that exposes `GET /api/git/worktrees?appId=...` and `DELETE /api/git/worktrees` endpoints. The TypeScript client (`git-client.ts`) already wraps both endpoints via `listWorktrees()` and `removeWorktree()`. UI signals for the worktree list (`worktrees` / `setWorktrees`) already live in `ui-store.ts`.

What is missing is a surface where the user can, at a glance, see all worktrees for the currently focused app and delete individual ones without leaving the TUI.

## Goals / Non-Goals

**Goals:**
- Pressing `w` on any row in the main table opens a Worktree Manager modal scoped to that app.
- The modal lists all worktrees (branch, path, active/main flags) with a keyboard-navigable cursor.
- Pressing `d` deletes the currently selected worktree (with the existing guard: active and primary worktrees are protected).
- `Escape` / `q` closes the modal.
- The list refreshes automatically after a successful delete.

**Non-Goals:**
- Creating worktrees from this modal (handled by the existing branch selector flow).
- Renaming or checking out worktrees from this modal.
- Showing worktrees across multiple apps simultaneously.
- Any changes to the Go server — all required endpoints already exist.

## Decisions

### 1. Reuse `removeWorktreeAction` guard instead of duplicating

`git-actions.ts:removeWorktreeAction()` already prevents deletion of the active and primary worktrees and surfaces a user-facing error via `setError`. The new modal's `d` handler will call this exact same action rather than re-implementing the guard.

*Alternative considered:* Disable the `d` key for protected rows in the UI. Rejected because it would silently hide why a row cannot be deleted; the existing error toast already gives clear feedback.

### 2. Single `showWorktreeManagerModal` boolean signal + `worktreeManagerAppId` signal in `ui-store.ts`

The modal is scoped to one app at a time. A pair of signals (`showWorktreeManagerModal` / `worktreeManagerAppId`) is the minimum state needed and follows the same pattern used by the branch selector overlay.

*Alternative considered:* Deriving the target app from the globally focused row index. Rejected because the focused row may change while the modal is open (focus is locked inside the modal while it is visible).

### 3. Separate `worktree-manager-keys.ts` handler file

All existing modals have dedicated handler files under `tui/packages/cli/src/tui/keyboard/`. Splitting into its own file keeps the handler chain readable and avoids growing `table-keys.ts` further.

### 4. `w` keybinding on the main table (not per-app context menu)

`w` is currently unbound in `table-keys.ts`. It is memorable (worktree) and consistent with `b` for branch selector.

### 5. Modal style follows `BranchSelectorView` pattern

A filterable, scrollable list with a `► ` cursor prefix and `uiColors.bgSurface2` row highlight. This is the established pattern in the codebase for selection lists and requires no new primitives.

## Risks / Trade-offs

- **Stale list after external delete** → The list is only refreshed on modal open and after an in-modal delete. If another process removes a worktree externally while the modal is open, the list will be stale. Mitigation: a simple polling interval on modal open is out of scope; the user can close and reopen the modal.
- **`w` conflicts with future keybindings** → `w` is a natural mnemonic for "worktree" but reserves a previously unbound key globally on the table. Mitigation: document in `table-keys.ts` comments; the key is not reserved by any underlying terminal library.
- **Guard error goes to global error toast, not inline** → Attempting to delete a protected worktree shows the global error dialog rather than an inline message in the modal. Trade-off accepted; consistent with existing branch-delete guard behavior.
