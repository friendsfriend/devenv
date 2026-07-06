## Why

Users can start an app through multiple run targets that may share similar names or profiles, such as Docker, tmux shell, PowerShell, systemshell, and Kubernetes targets. After startup, the TUI shows status but does not show which target/profile launched the app, making detail and overview screens ambiguous.

## What Changes

- Track the selected app run target when a run/start action begins, including the same human-readable target text shown in the target/profile picker (for example, `[tmux] bun build (default)`).
- Expose tracked run target information through app status responses and live status updates.
- Display the last/active run target in `AppDetailView`.
- Display a compact run target hint in the main application list overview when available.
- Preserve existing start/run behavior; no breaking API removals.

## Capabilities

### New Capabilities

- `app-run-target-info`: Tracks and displays the run target/profile used to start an app.

### Modified Capabilities

- `app-action-variants`: App action target execution now records selected target display metadata for downstream status and TUI presentation.

## Impact

- Server build/run service needs an app-scoped run target info model and accessors.
- Server app status DTOs and SSE `status.updated` payloads gain optional run target info.
- TypeScript shared types gain optional app run target info fields.
- TUI app status merge logic preserves run target info from polling and SSE.
- `tui/packages/ui/src/components/AppDetailView.tsx` renders full run target text.
- `tui/packages/ui/src/components/Table.tsx` renders compact run target text in app metadata/status suffix.
