## Why

Quitting DevEnv currently destroys the renderer immediately, so users get no visible feedback while shutdown work runs or hangs. A shutdown screen matching startup splash makes exit state explicit and shows progress through each cleanup step.

## What Changes

- Add a shutdown overlay/screen shown after quit confirmation and before renderer teardown.
- Track shutdown phases and per-phase status for cancelling background work, stopping subscriptions, cleaning up renderer state, and completing exit.
- Reuse the startup splash visual language exactly: same modal shell, spacing, spinner treatment, badge/highlight components, colors, and status-row style.
- Keep existing quit key flow (`q`/`Ctrl+C` double-press) and signal/fatal cleanup behavior intact while routing graceful TUI exits through the shutdown state.
- Add tests for shutdown state transitions and rendering of pending/current/done/failed shutdown steps.

## Capabilities

### New Capabilities
- `shutdown-screen`: Visible shutdown progress UI, phase state, and failure/timeout feedback during graceful TUI exit.

### Modified Capabilities

## Impact

- TUI exit lifecycle: `tui/packages/cli/src/tui/exit.ts`, `tui/packages/cli/src/tui/app-opentui.tsx`, and quit handling in `tui/packages/cli/src/tui/keyboard/global-keys.ts` / app actions.
- UI views/stores: `createAppStore`, `ContentRouter`, and a new shutdown splash component that shares styling with `StartupSplash`.
- Tests for store logic, exit orchestration, and shutdown splash rendering.
- No server API, config, or dependency changes expected.
