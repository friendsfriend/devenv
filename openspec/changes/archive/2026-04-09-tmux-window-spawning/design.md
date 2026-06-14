## Context

`util-actions.ts` contains three tool launchers — `launchLazygit()`, `launchLazydocker()`, and `openInEditorWith('nvim', ...)` — that all follow the same pattern: call `renderer.suspend()`, run the tool via `spawnSync` with `stdio: 'inherit'`, and call `renderer.resume()` when done. This takes over the current terminal window for the duration of the tool.

When devenv is running inside a tmux session, a better UX is to open the tool in a new, named tmux window so both the devenv TUI and the tool are simultaneously accessible. The codebase already detects `process.env.TMUX` for clipboard passthrough, establishing a precedent for tmux environment awareness.

## Goals / Non-Goals

**Goals:**
- Spawn lazygit, lazydocker, and nvim in a new named tmux window when inside a tmux session and tmux is installed
- Name the window `<tool> - <project-name>` (e.g. `lazygit - installer-space-mw`)
- Fall back transparently to the existing `spawnSync` + suspend/resume behavior when not in tmux or tmux is not installed
- Keep the devenv TUI running and interactive while the tool runs in the new window

**Non-Goals:**
- Managing tmux sessions (only windows within the current session)
- Supporting other tools beyond the three listed (ssh, vscode, intellij are unaffected)
- Reusing or switching to an existing window of the same name
- Any tmux pane-splitting behavior

## Decisions

### Decision 1: Detect tmux via `process.env.TMUX` + `which tmux`

**Choice:** Use `process.env.TMUX` to confirm the current process is inside a tmux session, and check that `tmux` is available via `spawnSync('which', ['tmux'])` (or equivalent) before attempting window creation.

**Rationale:** `$TMUX` is set by tmux itself and is the canonical way to detect an active tmux session. A secondary check for the `tmux` binary guards against unusual environments where the variable might be set but tmux is not available. Checking both is cheap and safe.

**Alternative considered:** Checking only `$TMUX`. Rejected because if the binary is unavailable the `tmux new-window` call would throw, requiring a try/catch instead of a clean upfront guard.

---

### Decision 2: Use `tmux new-window -n <name> <cmd>` via `Bun.spawn`

**Choice:** Spawn `tmux new-window -n "<tool> - <project>" <cmd> [args...]` using `Bun.spawn` (fire-and-forget, unref'd), without suspending the renderer.

**Rationale:** The whole point of tmux integration is that the devenv TUI stays alive. `new-window` opens the tool in a new window in the current session and immediately focuses it. The devenv window remains intact and the user can switch back with standard tmux key bindings. `Bun.spawn` (unref'd) is already used in the codebase for non-blocking launches (vscode, intellij).

**Alternative considered:** `tmux new-window` + keeping `spawnSync` inside the new window via a shell command. This would work but adds shell quoting complexity. Running the tool directly as the window's command is simpler and more robust.

---

### Decision 3: Extract a shared `isTmuxAvailable()` helper

**Choice:** Add a single helper function in `util-actions.ts` that checks both `process.env.TMUX` and the tmux binary presence. All three launchers call this helper.

**Rationale:** Avoids duplicating the detection logic three times. The check is synchronous (uses `spawnSync('which', ['tmux'])` which is fast), so it can be called inline without async ceremony.

**Alternative considered:** A module-level cached boolean. Rejected — caching at module load time would miss edge cases where the environment changes (unlikely but unnecessary to optimise for).

---

### Decision 4: Project name from `app.name`

**Choice:** Use `app.name` from the selected app store entry as the project name portion of the window title.

**Rationale:** `app.name` is already the human-readable identifier displayed in the devenv table. It is immediately available in all three launchers via `getSelectedApp()`.

**Alternative considered:** Deriving the name from `app.localDirectoryPath` (basename). Rejected — `app.name` is already clean and intentional; the directory name may differ or be less readable.

---

### Decision 5: `cwd` for tmux window

**Choice:** Pass `app.localDirectoryPath` as the working directory via `tmux new-window -c <cwd>`.

**Rationale:** Matches the existing `spawnSync` behavior where `cwd` is set to `app.localDirectoryPath`. The `-c` flag sets the start directory for the new window.

## Risks / Trade-offs

- **Window focus steal** — `tmux new-window` switches focus to the new window immediately. This is the intended behavior but could feel abrupt. → No mitigation planned; this matches user expectation.
- **Window name conflicts** — If the user opens two lazygit windows for the same project, both will have the same name. tmux allows duplicate window names; no deduplication logic is added. → Acceptable; out of scope.
- **`which` availability** — On some minimal systems `which` may not be present. → Use `spawnSync` with `shell: false` and check exit code; a non-zero exit or error is treated as "tmux not available", falling back gracefully.
- **nvim path quoting** — The file path passed to nvim may contain spaces. → Pass as a separate argument in the argv array to `tmux new-window`, not via shell interpolation, so quoting is handled correctly by tmux.
