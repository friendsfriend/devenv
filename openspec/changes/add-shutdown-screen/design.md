## Context

DevEnv startup already uses `StartupSplash` to present a modal with current phase, spinner, completed checkmarks, shared `Badge`/`HighlightedText`, and `GenericModal` chrome. Exit currently flows from the global quit key handler through `appActions.exitApp()` into `tui/packages/cli/src/tui/exit.ts`, which aborts background work and destroys the OpenTUI renderer immediately. Process signal cleanup in `app-opentui.tsx` also destroys the renderer directly.

This change needs a visible graceful-exit path without changing existing quit keybinds or introducing server APIs. It should reuse startup splash styling instead of duplicating layout/color choices.

## Goals / Non-Goals

**Goals:**
- Show a shutdown screen after confirmed quit and before renderer destruction.
- Show ordered shutdown steps with pending/current/done/failed state.
- Match startup splash styling exactly by sharing the same presentation component or constants.
- Keep `q` and `Ctrl+C` double-press behavior from the help/registry unchanged.
- Preserve abort-driven cleanup and fatal cleanup behavior.
- Bound shutdown so failures do not leave the terminal stuck.

**Non-Goals:**
- Add new keybinds or confirmation flows.
- Add server-side shutdown APIs.
- Stop external app containers/services as part of TUI shutdown.
- Redesign startup splash visuals beyond extracting shared rendering.

## Decisions

### Extract shared splash progress presentation

Create a reusable presentation component (for example `ProgressSplash` or `LifecycleSplash`) that owns the modal chrome, message row, status rows, spinner/current/done/pending rendering, and failure fallback currently embedded in `StartupSplash`. `StartupSplash` becomes a thin adapter that passes startup title, phase labels, order, state, and failure copy. `ShutdownSplash` uses the same component with shutdown labels.

Alternatives considered:
- Copy `StartupSplash` into a new component: fastest, but violates exact styling requirement over time.
- Put shutdown UI directly in `ContentRouter`: simple wiring, but duplicates row styling and makes startup/shutdown drift likely.

### Add shutdown state to app store

Add `ShutdownPhase` and `ShutdownState` alongside `StartupState` in `createAppStore`:
- `idle`
- `preparing`
- `canceling-background-work`
- `stopping-input`
- `destroying-renderer`
- `complete`
- `failed`

Expose `shutdownState`, `setShutdownState`, and `isShuttingDown`/`setIsShuttingDown`. `ContentRouter` renders `ShutdownSplash` above normal content when shutdown is active, similar to `StartupSplash` rendering while loading.

Alternatives considered:
- Keep shutdown state in `exit.ts`: would be outside Solid reactivity, making UI updates awkward.
- Store only one message string: insufficient for per-step status and tests.

### Route graceful exit through a registered async shutdown handler

Extend `exit.ts` with a registered graceful shutdown callback, while preserving the shared abort signal and renderer fallback. `TUIApp` registers a handler after stores/actions exist. `appActions.exitApp()` calls `exitApp()`, and `exitApp()` delegates to the registered handler when present. The handler:
1. Sets `isShuttingDown` and phase `preparing`.
2. Yields briefly so the shutdown screen renders.
3. Advances through shutdown phases while running existing cleanup work: disable keyboard/input handling, abort background work via the shared abort controller, clear intervals/effects via Solid cleanup, unregister fatal cleanup where appropriate, then destroy renderer.
4. Shows `complete` briefly before renderer destruction when possible.

`exit.ts` keeps an idempotent guard so repeated quit keys/signals do not start multiple shutdowns. If no handler is registered, it falls back to current behavior: abort then destroy.

Alternatives considered:
- Move all exit logic into `app-opentui.tsx`: loses simple global `exitApp()` call site and fallback.
- Use only notification/status bar: less visible and does not meet splash-like requirement.

### Signal handling remains safe

For normal `SIGINT`/`SIGTERM` while renderer is active, invoke the same graceful shutdown path once. For fatal cleanup or handler failure, destroy renderer immediately using the current cleanup path. Fatal cleanup must not depend on Solid rendering.

Alternatives considered:
- Keep signals immediate-only: simpler, but shutdown screen would not appear for common Ctrl+C flows outside keymap handling.
- Always wait for UI on fatal errors: unsafe because renderer or app state may already be corrupted.

## Risks / Trade-offs

- Shutdown UI may not render if terminal process exits from a fatal error → keep fatal cleanup immediate.
- Renderer destruction is itself not displayable after it begins → mark `destroying-renderer` current, optionally `complete` briefly, then destroy.
- Async cleanup could hang → use bounded per-step timeouts and fallback destroy.
- Duplicate shutdown starts from `q`, `Ctrl+C`, and signals → guard shutdown orchestration with a single in-flight promise.
- Shared splash extraction could accidentally alter startup visuals → add focused rendering tests/snapshots for startup and shutdown.
