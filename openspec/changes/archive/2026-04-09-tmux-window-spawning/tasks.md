## 1. Tmux Detection Helper

- [x] 1.1 Add `isTmuxSession()` helper function in `util-actions.ts` that returns `true` only when `process.env.TMUX` is set AND the `tmux` binary is found in PATH (via `spawnSync('which', ['tmux'])` with exit code check)

## 2. Shared Tmux Spawn Utility

- [x] 2.1 Add `spawnInTmuxWindow(windowName: string, cmd: string, args: string[], cwd: string)` helper in `util-actions.ts` that runs `tmux new-window -n <windowName> -c <cwd> <cmd> [args...]` using `Bun.spawn` (unref'd, fire-and-forget, no renderer suspend)

## 3. Update Tool Launchers

- [x] 3.1 Update `launchLazygit()` to call `isTmuxSession()` and if true, call `spawnInTmuxWindow('lazygit - <app.name>', 'lazygit', [], app.localDirectoryPath)` instead of the existing `spawnSync` + suspend/resume block
- [x] 3.2 Update `launchLazydocker()` to call `isTmuxSession()` and if true, call `spawnInTmuxWindow('lazydocker - <app.name>', 'lazydocker', [], app.localDirectoryPath)` instead of the existing `spawnSync` + suspend/resume block
- [x] 3.3 Update `openInEditorWith('nvim', ...)` to call `isTmuxSession()` and if true, call `spawnInTmuxWindow('nvim - <app.name>', 'nvim', [resolvedPath], app.localDirectoryPath)` instead of the existing `spawnSync` + suspend/resume block
- [x] 3.4 Update `openInEditor()` (`e` keybind, uses `$EDITOR`/`$VISUAL`) to call `isTmuxSession()` and if true, spawn terminal editors in a named tmux window instead of suspending the renderer

## 4. Manual Verification

- [x] 4.1 Verify that inside a tmux session, pressing `g` opens lazygit in a new window named `lazygit - <project>` while devenv TUI stays alive in the original window
- [x] 4.2 Verify that inside a tmux session, pressing `d` opens lazydocker in a new window named `lazydocker - <project>` while devenv TUI stays alive
- [x] 4.3 Verify that inside a tmux session, choosing nvim from the editor picker opens it in a new window named `nvim - <project>` while devenv TUI stays alive
- [x] 4.4 Verify that outside a tmux session all three tools still behave exactly as before (renderer suspends, tool runs, renderer resumes)