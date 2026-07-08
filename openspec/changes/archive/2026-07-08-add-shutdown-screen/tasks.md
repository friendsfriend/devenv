## 1. Shared Splash UI

- [x] 1.1 Extract startup splash modal/status-row rendering into a reusable progress splash component while preserving current startup visuals.
- [x] 1.2 Refactor `StartupSplash` to use the shared component with existing startup phase labels, order, spinner, and failure copy.
- [x] 1.3 Add `ShutdownSplash` using the shared component with shutdown title, message, step labels, and failure copy.

## 2. Shutdown State

- [x] 2.1 Add `ShutdownPhase`, `ShutdownState`, and shutdown signals/actions to `createAppStore`.
- [x] 2.2 Add deterministic shutdown phase order and status helper logic for pending/current/done/failed rows.
- [x] 2.3 Render `ShutdownSplash` from `ContentRouter` whenever shutdown is active, layered like startup splash.

## 3. Graceful Exit Orchestration

- [x] 3.1 Extend `exit.ts` with an idempotent registered graceful shutdown handler and current abort/destroy fallback.
- [x] 3.2 Register graceful shutdown from `TUIApp` so confirmed quit sets shutdown state, yields for rendering, advances phases, aborts background work, shows completion when possible, and destroys the renderer.
- [x] 3.3 Prevent keyboard/input handlers from processing normal app actions once shutdown starts.
- [x] 3.4 Route normal `SIGINT`/`SIGTERM` handling through graceful shutdown when safe, while keeping fatal cleanup immediate.
- [x] 3.5 Add bounded timeout/failure handling that shows failed shutdown state before fallback renderer destruction.

## 4. Tests and Verification

- [x] 4.1 Add unit tests for shutdown phase status calculation and idempotent graceful exit behavior.
- [x] 4.2 Add rendering tests or snapshots proving startup visuals remain stable and shutdown uses the same shared styling.
- [x] 4.3 Add integration-level coverage for `q`/`Ctrl+C` confirmed quit starting shutdown instead of immediate renderer destruction.
- [x] 4.4 Run `bun test` and `bun run type-check` from `tui/`.
- [x] 4.5 Run full project test suite and check pi-lens issues before finishing implementation.
