## Context

The TUI uses a layered keyboard handling system (`table-keys.ts`, `misc-modal-keys.ts`, etc.) where the `showBranchSelector()` guard in `table-keys.ts` intercepts keys while the branch selector overlay is visible. Currently `b` opens the branch selector and `g` opens lazygit (both handled in the main table `switch` block). Inside the modal, `Enter` performs checkout (or worktree creation), `ctrl+n` opens the create-branch sub-modal, and arrow keys / `ctrl+j`/`ctrl+k` navigate the list. All fetch/pull/push operations are already implemented in `git-actions.ts` and delegate to the HTTP API. Lazygit is launched via `util-actions.ts:launchLazygit()`.

## Goals / Non-Goals

**Goals:**
- Remap global table keybind: `b` → `g` (open branch selector)
- Remap global table keybind: `g` → `Shift+G` (open lazygit)
- Add in-modal keybinds: `s` (switch/checkout), `l` (lazygit log for selected branch), `f` (fetch), `p` (pull), `Shift+P` (push)
- Remove `Enter` as the checkout trigger in normal (non-worktree) mode; `s` takes over
- Update modal footer help text to reflect new keybinds
- Update `BranchSelectorProps` with optional callbacks for each new action

**Non-Goals:**
- Changing worktree create mode behaviour (`Enter` still creates the worktree)
- Server-side changes (git operations already exist as API endpoints)
- Adding lazygit log to any view outside the branch selector modal

## Decisions

### D1 — Keep action dispatch in `table-keys.ts`, not in `BranchSelectorView`

The branch selector modal has no direct keyboard focus for the action keys (`s`, `l`, `f`, `p`, `Shift+P`); it holds focus on its search `<input>`. The existing pattern for modal actions (e.g. `Enter`, `ctrl+n`) is to intercept them in `table-keys.ts` before they reach the input. The new keybinds follow the same pattern — detected in the `if (uiStore.showBranchSelector())` guard block and dispatched to `gitActions` / `utilActions`.

**Alternative considered**: Prop callbacks (`onSwitch`, `onFetch`, etc.) wired from `modal-overlays.tsx`. Rejected because the callbacks would still need to call the same `git-actions.ts` functions, adding indirection with no benefit.

### D2 — Lazygit log mode via `--log-all-branches` flag targeting the selected branch

`launchLazygit()` currently opens lazygit without arguments. For log-only mode on a specific branch, we pass `lazygit log` with the branch name. A new helper `launchLazygitBranchLog(branchName)` is added to `util-actions.ts` to keep the main `launchLazygit` function unchanged.

**Alternative considered**: Opening lazygit normally on the repo with the branch pre-selected — harder to express via CLI flags and leaks into full lazygit UI rather than log-only view.

### D3 — `Shift+G` detection via `event.sequence === 'G'`

The existing codebase detects uppercase letters via `event.sequence` (see table-keys.ts comments: "For case-sensitive letter detection, we need to check event.sequence"). `Shift+G` = sequence `'G'`. This aligns with the existing pattern for `'P'` (push) vs `'p'` (pull).

### D4 — Remove `Enter` checkout only in non-worktree mode

In worktree create mode, `Enter` still creates the worktree (unchanged). In normal mode, `Enter` is removed as a checkout trigger and `s` takes over. This avoids accidental checkouts when users type in the search box and press Enter expecting to confirm search.

## Risks / Trade-offs

- **Muscle memory breakage** (`b` and `g` swap) → Users familiar with current keybinds will need to relearn. No migration path other than documentation update.
- **`s` key in search input** → When the search input is focused, `s` is typed into the filter — it won't trigger switch. This is the existing behaviour for all single-char keys (they flow to the input). Users need to use `ctrl+j`/`ctrl+k` or arrow keys to navigate, not type action keys. [Risk] Users may expect `s` to always switch → **Mitigation**: Help text makes it clear these are action keys (shown in footer), and the input focus model is consistent with the existing modal.
- **`l` lazygit log mode** — `lazygit log` is an alias for the log panel and may behave differently across lazygit versions. [Risk] → **Mitigation**: test against the lazygit version in use; fall back to opening lazygit normally if the subcommand is unavailable.
