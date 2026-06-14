## 1. Global Keybind Remapping

- [x] 1.1 In `tui/packages/cli/src/tui/keyboard/table-keys.ts`, change the `case 'b':` branch selector trigger to `case 'g':` (or `event.sequence === 'g'` pattern)
- [x] 1.2 In `table-keys.ts`, change the `case 'g':` lazygit trigger to detect `Shift+G` (i.e. `event.sequence === 'G'`)
- [x] 1.3 Verify no other handler fires on `g` or `G` in the table view that would conflict

## 2. Lazygit Branch Log Helper

- [x] 2.1 In `tui/packages/cli/src/tui/actions/util-actions.ts`, add a `launchLazygitBranchLog(branchName: string)` function that opens lazygit targeting the log view for the given branch (tmux path: new window with `lazygit log`; non-tmux path: `spawnSync('lazygit', ['log'], ...)`)
- [x] 2.2 Export the new function from `util-actions.ts` and expose it via the `KeyboardActions` type in `types.ts` if needed

## 3. Branch Selector Modal Keybinds

- [x] 3.1 In the `if (uiStore.showBranchSelector())` block in `table-keys.ts`, replace the `Enter` → `performCheckout()` path (non-worktree mode) with an `s` key handler calling `gitActions.performCheckout()`
- [x] 3.2 Add an `l` key handler in the same block that calls `utilActions.launchLazygitBranchLog(selectedBranchName)` using the currently selected branch from `uiStore`
- [x] 3.3 Add an `f` key handler calling `gitActions.performGitFetch()` and refresh the branch list afterward
- [x] 3.4 Add a `p` key handler calling `gitActions.performGitPull()`
- [x] 3.5 Add a `Shift+P` (`event.sequence === 'P'`) handler calling `gitActions.performGitPush()`
- [x] 3.6 Ensure `Enter` in non-worktree mode no longer triggers checkout (remove or guard the existing `enter` case for normal mode); `Enter` in worktree mode remains unchanged

## 4. BranchSelectorView Help Text

- [x] 4.1 In `tui/packages/ui/src/components/BranchSelectorView.tsx`, update the `formatHelpText` call for non-worktree mode to show: `↑/↓ Navigate`, `s Switch`, `l Log`, `f Fetch`, `p Pull`, `P Push`, `ctrl+n Create`, `Esc Cancel`
- [x] 4.2 Confirm worktree create mode help text is unchanged

## 5. Verification

- [x] 5.1 Manually test: press `g` in table view → branch selector opens; press `b` → nothing happens
- [x] 5.2 Manually test: press `G` (Shift+G) in table view → lazygit opens; press `g` alone → branch selector, not lazygit
- [x] 5.3 Manually test inside modal: `s` checks out selected branch, `f` fetches, `p` pulls, `P` pushes, `l` opens lazygit log
- [x] 5.4 Manually test worktree mode: `Enter` still creates worktree; `s` does nothing
- [x] 5.5 Confirm modal footer shows updated keybinds in normal mode
