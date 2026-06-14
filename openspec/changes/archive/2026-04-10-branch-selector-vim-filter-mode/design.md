## Context

`BranchSelectorView` currently calls `inputRef.focus()` inside `onMount` with a 1ms delay, making the search `<input>` immediately active on every open. All keystrokes flow into the filter regardless of intent. The `table-keys.ts` branch selector guard already has a comment acknowledging this: *"All other keys (including printable chars like q, j, k) are handled by BranchSelectorView's focused `<input>` element — don't consume them here."* This arrangement works for a pure-filter modal but is incompatible with the action keybinds (`s`, `l`, `f`, `p`, `Shift+P`) being added in the sibling change `rework-git-integration-keybinds`.

The two changes are designed to be implemented together. This change makes filter activation explicit so the action keybinds in `table-keys.ts` can reliably intercept single letters.

## Goals / Non-Goals

**Goals:**
- Remove auto-focus on mount so the input is idle by default
- Add `/` as the explicit trigger to enter filter mode and focus the input
- `Enter` while in filter mode exits filter mode (blurs input), keeping the current filter text
- `Esc` while in filter mode clears filter text and exits filter mode
- Visual indicator (e.g. `/` prefix in the search box or a mode label) so users know they are in filter mode
- Help text updated to surface `/` as the filter entry key

**Non-Goals:**
- Changing filter logic or the `filteredBranches` computation
- Adding vim normal/insert mode beyond the single `/` → filter → `Enter`/`Esc` flow
- Persisting filter state between modal open/close sessions

## Decisions

### D1 — Filter mode state lives in `uiStore`, not local component state

`table-keys.ts` needs to know whether filter mode is active to route keys correctly (e.g. suppress `s` → switch when the user is typing). If the state lives only inside `BranchSelectorView` as a `createSignal`, `table-keys.ts` cannot read it. Adding `branchSelectorFilterMode` as a boolean signal to `uiStore` (alongside the existing `branchSelectorIndex`, `branchFilterQuery`, etc.) keeps all modal state in one place and is consistent with the existing pattern.

**Alternative considered**: Pass a callback prop `onFilterModeChange` from the component to update a ref in the keyboard layer. Rejected — more complex plumbing for no benefit over the store pattern already in use.

### D2 — Focus/blur the input imperatively via `inputRef`

`BranchSelectorView` already holds an `inputRef`. When `uiStore.branchSelectorFilterMode()` becomes `true`, the component calls `inputRef.focus()`; when it becomes `false`, it calls `inputRef.blur()`. A `createEffect` watching the signal drives this.

**Alternative considered**: Conditionally render the `<input>` only in filter mode. Rejected — toggling mount/unmount loses the typed query text and causes layout reflow.

### D3 — `/` is intercepted in `table-keys.ts` before reaching the input

While filter mode is inactive, the input is blurred, so `/` would not go to it anyway. The `table-keys.ts` branch selector guard intercepts `/` and sets `uiStore.setBranchSelectorFilterMode(true)`. This is symmetric with how `ctrl+n` opens the create-branch sub-modal.

### D4 — `Enter` exits filter mode without triggering checkout

Inside the `if (uiStore.showBranchSelector())` block, a new top-level check: if `uiStore.branchSelectorFilterMode()` is true, `Enter` calls `uiStore.setBranchSelectorFilterMode(false)` and returns `true` (consumed). The existing `Enter` → checkout path only runs when filter mode is inactive.

### D5 — `Esc` in filter mode clears query and exits; second `Esc` closes modal

When filter mode is active, `Esc` clears `branchFilterQuery` and sets `filterMode` to false (returns `true`, consumed). When filter mode is inactive, `Esc` closes the modal as before. This two-stage escape is natural and matches vim's modal model.

## Risks / Trade-offs

- **Discoverability** — Users unfamiliar with vim conventions may not know to press `/`. → Mitigated by updating the help text footer to show `/ Filter`.
- **Interaction ordering with `rework-git-integration-keybinds`** — Both changes touch `table-keys.ts` and `BranchSelectorView`. They must be applied together or in order (this change first, then the action keybinds) to avoid the action keys being swallowed by the auto-focused input. → Mitigated by designing both changes in the same planning session.
- **`inputRef.blur()` support** — The `@opentui/solid` input element's ref must expose a `blur()` method. The existing code calls `inputRef.focus()`, so `focus` works; `blur` should be symmetric but needs verification during implementation.
