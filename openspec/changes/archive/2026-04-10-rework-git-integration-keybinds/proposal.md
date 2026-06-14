## Why

The current git integration keybinds are suboptimal: the branch selector is opened with `b`, lazygit is opened with `g`, and the branch selector modal itself lacks rich git actions (fetch, pull, push, log). Reworking these keybinds makes the workflow more intuitive — `g` for git (branch selector) and `G` for lazygit — while embedding the most common git operations directly into the branch selector modal so users don't need to leave the TUI for routine tasks.

## What Changes

- The global keybind to open the branch selector modal changes from `b` to `g`
- The global keybind to open lazygit changes from `g` to `Shift+G`
- The branch selector modal gains four new action keybinds:
  - `s` — switch/checkout the selected branch
  - `l` — open lazygit in log-only mode for the selected branch
  - `f` — fetch latest changes from the remote
  - `p` — pull updates for the selected branch
  - `Shift+P` — push local commits for the selected branch
- The `Enter` key behaviour in the modal is replaced by `s` for checkout (non-worktree mode)
- Help text in the modal footer is updated to reflect all new keybinds

## Capabilities

### New Capabilities
- `branch-selector-git-actions`: In-modal git operations (switch, log, fetch, pull, push) triggered by keybinds within the branch selector modal.

### Modified Capabilities
- `git-branch-display`: Global keybind assignments for branch selector (`g`) and lazygit (`Shift+G`) change the entry points, affecting how the branch column interaction is initiated.

## Impact

- `tui/packages/ui/src/components/BranchSelectorView.tsx` — modal help text updated; new action props added
- TUI app layer that handles keypress events opening the branch selector and lazygit — keybind mappings updated (`b`→`g`, `g`→`Shift+G`)
- TUI app layer that handles modal keybind events — new handlers for `s`, `l`, `f`, `p`, `Shift+P`
- `BranchSelectorProps` interface — new optional callback props for each git action
- No server-side changes required; git operations are spawned client-side (lazygit, git fetch/pull/push)
