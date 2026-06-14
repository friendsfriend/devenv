## 1. Store — Add Filter Mode State

- [x] 1.1 In the TUI `uiStore`, add a `branchSelectorFilterMode` boolean signal (default `false`) with a corresponding setter `setBranchSelectorFilterMode`
- [x] 1.2 Reset `branchSelectorFilterMode` to `false` in `gitActions.closeBranchSelector()` so reopening the modal always starts with filter mode off

## 2. BranchSelectorView — Remove Auto-Focus, Add Filter Mode Prop

- [x] 2.1 In `tui/packages/ui/src/components/BranchSelectorView.tsx`, add a `filterMode?: boolean` prop to `BranchSelectorProps`
- [x] 2.2 Remove the `onMount` block that calls `inputRef.focus()`
- [x] 2.3 Add a `createEffect` that calls `inputRef.focus()` when `props.filterMode` becomes `true` and `inputRef.blur()` when it becomes `false`
- [x] 2.4 Update the non-worktree help text to include `/ Filter` (and optionally `Enter Confirm` / `Esc Clear` when filter mode is active)

## 3. modal-overlays.tsx — Pass Filter Mode Prop

- [x] 3.1 In `tui/packages/cli/src/tui/views/modal-overlays.tsx`, pass `filterMode={uiStore.branchSelectorFilterMode()}` to `<BranchSelectorView>`

## 4. table-keys.ts — Keyboard Routing

- [x] 4.1 In the `if (uiStore.showBranchSelector())` block in `table-keys.ts`, add a top-level filter mode check: if `uiStore.branchSelectorFilterMode()` is `true`:
  - `Enter` → call `uiStore.setBranchSelectorFilterMode(false)`, return `true`
  - `Esc` → clear filter query (`uiStore.setBranchFilterQuery('')`), set filter mode false, return `true`
  - All other keys → return `false` (let them flow to the focused input)
- [x] 4.2 Add a `/` key handler when filter mode is inactive: call `uiStore.setBranchSelectorFilterMode(true)`, return `true`
- [x] 4.3 Ensure the existing `Esc` → close modal path only fires when filter mode is `false`
- [x] 4.4 Ensure action keys (`s`, `f`, `p`, `P`, `l` from the sibling change) are only intercepted when filter mode is `false`

## 5. Verification

- [x] 5.1 Open branch selector — confirm typing letters does NOT filter the list (input is idle)
- [x] 5.2 Press `/` — confirm input becomes focused and typing filters the list
- [x] 5.3 While filtering, press `Enter` — confirm filter text is preserved, input blurs, action keys work again
- [x] 5.4 While filtering, press `Esc` — confirm filter is cleared, input blurs, modal stays open
- [x] 5.5 While filter mode is off, press `Esc` — confirm modal closes
- [x] 5.6 Confirm footer shows `/ Filter` hint when filter mode is inactive
