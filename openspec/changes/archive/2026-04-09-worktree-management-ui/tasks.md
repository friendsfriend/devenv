## 1. State — extend ui-store

- [x] 1.1 Add `showWorktreeManagerModal` boolean signal and `worktreeManagerAppId` string signal to `tui/packages/cli/src/tui/stores/ui-store.ts`

## 2. UI Component — WorktreeManagerModal

- [x] 2.1 Create `tui/packages/ui/src/components/WorktreeManagerModal.tsx` wrapping `GenericModal` with a scrollable list of worktrees (branch, path, active/main flags) and a `► ` cursor
- [x] 2.2 Style selected row with `uiColors.bgSurface2` background; mark active and primary rows with visible indicators
- [x] 2.3 Display an empty-state message when the worktree list is empty
- [x] 2.4 Add footer help text via `formatHelpText` showing `d` → delete, `j/k` → navigate, `Escape/q` → close
- [x] 2.5 Export `WorktreeManagerModal` from `tui/packages/ui/src/index.ts`

## 3. Keyboard Handler — worktree-manager-keys

- [x] 3.1 Create `tui/packages/cli/src/tui/keyboard/worktree-manager-keys.ts` with a handler that consumes keys only when `showWorktreeManagerModal` is true
- [x] 3.2 Implement `j` / `ArrowDown` → move cursor down (clamped to list length)
- [x] 3.3 Implement `k` / `ArrowUp` → move cursor up (clamped to 0)
- [x] 3.4 Implement `d` → call `removeWorktreeAction` for the selected worktree; on success call `listWorktrees` and refresh the in-modal list
- [x] 3.5 Implement `Escape` / `q` → set `showWorktreeManagerModal(false)` and clear `worktreeManagerAppId`
- [x] 3.6 Export handler from `tui/packages/cli/src/tui/keyboard/index.ts`

## 4. Table Key — open modal on `w`

- [x] 4.1 Add `w` handler to `tui/packages/cli/src/tui/keyboard/table-keys.ts` that, when the main table is focused and a row is focused, sets `worktreeManagerAppId` to the focused app's id, fetches its worktrees via `listWorktrees`, stores them, and sets `showWorktreeManagerModal(true)`

## 5. Keyboard Types — extend interfaces

- [x] 5.1 Extend `KeyboardActions` in `tui/packages/cli/src/tui/keyboard/types.ts` with `openWorktreeManager` action
- [x] 5.2 Extend `KeyboardStores` in the same file with any new store references needed by the handler

## 6. Wiring — app-opentui + modal-overlays

- [x] 6.1 Register `worktreeManagerKeys` handler in the `useKeyboard` chain in `tui/packages/cli/src/tui/app-opentui.tsx` (before `tableKeys` so it can consume events while modal is open)
- [x] 6.2 Add `<Show when={uiStore.showWorktreeManagerModal()}><WorktreeManagerModal ... /></Show>` to `tui/packages/cli/src/tui/views/modal-overlays.tsx`
- [x] 6.3 Pass required props (worktrees list, selected index, appId) from stores into `WorktreeManagerModal`

## 7. Cursor State — selected index signal

- [x] 7.1 Add `worktreeManagerSelectedIndex` signal (number, default 0) to `ui-store.ts`; reset to 0 whenever the modal opens
