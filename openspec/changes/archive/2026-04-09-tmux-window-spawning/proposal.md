## Why

When using devenv inside a tmux session, launching lazygit, lazydocker, or nvim suspends the TUI and takes over the current window, losing context of the devenv interface. Spawning these tools in dedicated, named tmux windows allows users to switch between devenv and their tools freely without losing either context.

## What Changes

- When devenv is running inside a tmux session (and tmux is installed), launching lazygit, lazydocker, or nvim will open a new tmux window instead of suspending the current TUI
- The new tmux window will be named `<tool> - <project-name>` (e.g. `lazygit - installer-space-mw`)
- If devenv is not running inside a tmux session, or tmux is not installed, behavior remains unchanged (existing `spawnSync` with renderer suspend/resume)
- The tmux window spawning applies to all three existing tool launchers: `launchLazygit()`, `launchLazydocker()`, and `openInEditorWith('nvim', ...)`

## Capabilities

### New Capabilities
- `tmux-window-spawning`: Detect tmux environment and spawn tool subprocesses in new named tmux windows instead of taking over the current terminal

### Modified Capabilities
- None

## Impact

- `tui/packages/cli/src/tui/actions/util-actions.ts` — all three launcher functions modified
- No new dependencies required (`tmux` is an external system tool, not a package dependency)
- No breaking changes; fully backward-compatible via environment detection
