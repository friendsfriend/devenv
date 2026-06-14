## Why

The branch selector search input is currently auto-focused on mount, meaning every keystroke the user makes immediately modifies the filter. This makes the modal feel fragile — pressing any letter changes the list, and action keys like `s`, `f`, `p` would be ambiguous between "type into filter" and "trigger action". Adopting a vim-style filter mode (press `/` to enter, `Enter` to confirm and exit) makes the interaction model explicit and composable with the action keybinds being added in `rework-git-integration-keybinds`.

## What Changes

- The branch selector input is **not** auto-focused on mount
- Pressing `/` while the modal is open enters filter mode — the input becomes focused and accepts text
- Pressing `Enter` while in filter mode exits filter mode (blurs the input) without triggering checkout
- Pressing `Esc` while in filter mode clears the filter and exits filter mode
- The modal tracks a `filterMode` boolean state that gates whether the input is focused
- Help text reflects the `/` entry point for filtering
- **BREAKING**: The input no longer captures all keystrokes passively; users must press `/` to search

## Capabilities

### New Capabilities
- `branch-selector-vim-filter`: Vim-style explicit filter mode for the branch selector — `/` to enter, `Enter` to confirm, `Esc` to clear and exit.

### Modified Capabilities

## Impact

- `tui/packages/ui/src/components/BranchSelectorView.tsx` — remove `onMount` auto-focus; add `filterMode` prop; conditionally focus/blur the input; update help text
- `tui/packages/cli/src/tui/keyboard/table-keys.ts` — add `/` key handler to enter filter mode; intercept `Enter` and `Esc` inside filter mode before the existing modal handlers
- `uiStore` (TUI store) — add `branchSelectorFilterMode` boolean signal and setter, or manage filter mode purely as local component state passed via prop
