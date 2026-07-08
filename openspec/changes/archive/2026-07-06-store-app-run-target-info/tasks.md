## 1. Server Runtime State

- [x] 1.1 Add shared Go run target info model with runtime, launch mode, label, profile, target id, source path, started timestamp, and display fields.
- [x] 1.2 Add build service methods to set, get, and clear app run target info using an app-scoped in-memory cache backed by SQLite runtime state.
- [x] 1.3 Implement server-side display formatting that matches the picker convention, including `[tmux]` for shell tmux targets and `[runtime]` for other runtimes.
- [x] 1.4 Record run target info from the resolved `resources.ActionTarget` before launching Docker, shell, PowerShell, systemshell, or Kubernetes run targets.
- [x] 1.5 Resolve legacy profile-only Docker starts to an action target before recording run target info, with a safe fallback when no target resolves.
- [x] 1.6 Clear run target info when app stop succeeds or when tracked shell tmux state is known inactive.

## 2. Server API and Events

- [x] 2.1 Add optional run target info to app status response DTOs.
- [x] 2.2 Include run target info in `/api/status` responses for apps with recorded info.
- [x] 2.3 Include run target info in `status.updated` SSE broadcasts for apps with recorded info.
- [x] 2.4 Ensure missing run target info remains omitted or null so existing clients stay compatible.

## 3. Shared TypeScript Types and Client State

- [x] 3.1 Add `AppRunTargetInfo` or equivalent shared type in `tui/packages/types/src/index.ts`.
- [x] 3.2 Add optional `runTargetInfo` to `App`, `AppTableRow`, and app status types where status data is merged.
- [x] 3.3 Merge run target info from polling in `tui/packages/cli/src/tui/actions/app-actions.ts`.
- [x] 3.4 Merge and clear run target info from `status.updated` SSE events in `app-actions.ts`.

## 4. TUI Presentation

- [x] 4.1 Render full run target display text in `tui/packages/ui/src/components/AppDetailView.tsx` when available.
- [x] 4.2 Render optional started/source details in `AppDetailView` only when data is present and space-safe.
- [x] 4.3 Add compact run target display text to the main application list metadata/status suffix in `tui/packages/ui/src/components/Table.tsx`.
- [x] 4.4 Ensure apps without run target info render no placeholder rows or empty separators.

## 5. Tests and Validation

- [x] 5.1 Add Go tests for run target display formatting across tmux shell, Docker, PowerShell, systemshell, and Kubernetes targets.
- [x] 5.2 Add Go tests verifying run target info is recorded for resolved target launches, legacy profile-only launches, and persisted across service instances.
- [x] 5.3 Add server status/event tests verifying optional run target info is included when present and omitted when absent.
- [x] 5.4 Add TUI/component tests or snapshot coverage for `AppDetailView` and `Table` rendering with and without run target info.
- [x] 5.5 Run the full test suite before finishing implementation.
- [x] 5.6 Check pi-lens issues if available before finishing implementation.
