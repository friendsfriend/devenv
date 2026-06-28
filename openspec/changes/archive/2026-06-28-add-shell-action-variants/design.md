## Context

DevEnv currently resolves build/test resources from `apps/build/<ident>-<action>.Dockerfile` and run resources from `apps/compose/<ident>-compose.yml` plus profile-specific compose files. The backend exposes separate build/test/run/start endpoints, and the TUI assumes Docker-oriented operations for app lifecycle.

The new model treats each build/test/run option as an action target. Targets may be Docker-backed or shell-backed, and multiple targets may exist for the same app/action. Shell targets are represented as `.sh` files in the config repository so they can be shared, edited manually, and configured through the TUI.

## Goals / Non-Goals

**Goals:**
- Discover Docker and shell action targets side by side.
- Keep no implicit action default: action availability is based on configured files.
- Preserve single-target fast path and add picker flow for multi-target actions.
- Support shell run profiles from per-app `.sh` files.
- Add `tmux` launch mode for shell run profiles.
- Track shell/tmux runtime state sufficiently for stop and restart.
- Let users create/edit shell action scripts from the TUI.

**Non-Goals:**
- Replace Docker support or migrate existing Docker resource names.
- Add arbitrary non-shell command schemas in JSON app definitions.
- Implement embedded interactive terminal rendering inside the OpenTUI process.
- Add Windows tmux support beyond clear unsupported/fallback behavior.

## Decisions

### Action targets are discovered from files, not app JSON

Shell configuration SHALL use files in the config repository:

- `apps/build/<ident>-build.sh` for shell build target.
- `apps/build/<ident>-test.sh` for shell test target.
- `apps/run/<ident>-<profile>.sh` for shell run profile targets.

Existing Docker resources remain:

- `apps/build/<ident>-build.Dockerfile`.
- `apps/build/<ident>-test.Dockerfile`.
- `apps/compose/<ident>-compose.yml` and `apps/compose/<ident>-<profile>-compose.yml`.

Rationale: this mirrors current Dockerfile/compose layout, keeps config repo friendly, and avoids growing app JSON with command strings. Alternative considered: store action commands in app JSON. Rejected because users wanted file-based profiles like Docker resources and TUI-created scripts can still be edited by hand.

### Backend exposes action target discovery

Add an API that returns normalized targets for an app/action. Build/test callers use it to decide direct execution vs picker. Run callers use it to populate the existing profile picker successor.

A normalized target includes stable fields such as:

- `id`
- `action` (`build`, `test`, `run`)
- `runtime` (`docker`, `shell`)
- `label`
- `profile` when applicable
- `launchMode` for shell run targets
- `sourcePath` for diagnostics/config editing

Rationale: TUI should not duplicate filename parsing rules. Alternative considered: client-side discovery. Rejected because config dir and runtime validation already belong to backend/resource manager.

### Picker becomes action target picker

The existing profile picker pattern should be generalized to an action target picker. Rows display runtime and label/profile, for example `[docker] default`, `[docker] redis`, `[tmux] dev`.

Rationale: run already needs a picker and build/test need the same behavior when both Docker and shell variants exist. Reusing the modal pattern keeps keyboard behavior consistent.

### Shell scripts execute from the app checkout directory

Shell action scripts run with `app.LocalDirectoryPath` as working directory. Build/test scripts execute synchronously through existing command logging. Run scripts with `tmux` launch mode open in a tmux window using the app checkout directory.

Rationale: user commands like `bun run dev` expect the repository root as cwd. Existing command logging already supports app-scoped output.

### Launch mode comes from script metadata header

Shell scripts may declare metadata comments near the top:

```sh
# devenv:name=Dev TUI
# devenv:mode=tmux
```

Defaults:
- build/test shell scripts default to logged execution.
- run shell scripts default to `tmux` launch mode.

Rationale: mode and label belong with the script while preserving simple executable shell files. Alternative considered: sidecar JSON files. Rejected as more config files to manage.

### Tmux run state tracks window identity

When launching shell run profiles in tmux, DevEnv should use `tmux new-window -P -F '#{window_id}'` to capture the window id. Runtime state records app ident, profile/target id, launch mode, window id, and started timestamp. Stop kills the tracked tmux window. Restart stops the active shell/tmux target and launches it again.

Rationale: tmux window lifecycle is more reliable than PID tracking for interactive TUIs. Alternative considered: PID tracking. Rejected for tmux mode because scripts often spawn child processes or replace shells.

### Tmux launch primarily runs where the active DevEnv process has tmux context

Normal `devenv` spawn mode starts the server from the TUI environment, so backend tmux spawning can inherit `TMUX`. Attach mode can connect to a server that lacks tmux context; in that case tmux launch MUST fail clearly instead of silently running elsewhere.

Rationale: backend-owned execution keeps API/state/stop/restart consistent. A future enhancement could let the TUI proxy tmux launches for attach mode.

### Legacy Docker resources migrate into the action resource layout

At startup, DevEnv copies legacy app action resources from `dockerfiles/`, `test/`, and `compose/` into the current `apps/build/` and `apps/compose/` layout. Existing destination files are never overwritten and legacy source files are preserved.

Rationale: shell actions use the same app-scoped resource grouping as Docker build/test/run targets, so older config repositories should be normalized automatically without destructive moves.

## Risks / Trade-offs

- **Attach-mode tmux mismatch** → Return clear error when server cannot detect `TMUX`; document that tmux launch requires the server process to run inside tmux.
- **Filename parsing collisions** → Use deterministic ids including runtime/action/profile and validate duplicate labels separately from ids.
- **Shell script safety** → Treat scripts as trusted config, run only files under config dir, and show source paths in UI before editing/execution.
- **Long-running build/test scripts** → Keep operation status/log streaming and existing timeout behavior under review; do not force tmux for build/test.
- **Stopping tmux windows can discard user state** → Stop action should target only tracked windows and surface window name/profile before destructive action where needed.
