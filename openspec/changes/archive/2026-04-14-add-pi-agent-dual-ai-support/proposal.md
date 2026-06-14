## Why

The TUI currently hardcodes opencode as the only AI backend for two distinct features: log analysis (AI-powered analysis of container/operation/job logs) and the agent session launcher (browsing and launching opencode sessions). Users who primarily use `pi` (the pi coding agent) have no way to use their preferred tool from within the TUI, limiting the usefulness of the AI features for half the team's workflow.

## What Changes

- Add an `AiBackendPickerView` component (using `ListViewModal`, identical in structure to `EditorPickerView`) that lets the user choose between `opencode` and `pi` before triggering an AI action.
- The picker is shown instead of jumping directly into prompt mode when the user triggers AI analysis in the log modal (`Shift+A`).
- The picker is also shown when the user presses Enter on "New Session" in the agent session view — selecting pi launches a pi session directly, selecting opencode proceeds to the existing agent picker step.
- Picker state (`showAiBackendPicker`, `aiBackendPickerSelectedIndex`, `aiBackendPickerContext`) lives in `uiStore`, following the same pattern as `showEditorPicker` / `showProfilePicker`.
- Navigation (j/k/Enter/Esc) is handled in `global-keys.ts`, following the same pattern as the profile picker.
- Add a `launchPi` action in the TUI that suspends the renderer and invokes `pi` interactively (mirroring the existing `launchOpencode` pattern).
- Extend the Go server's `/api/ai/analyze-logs-stream` endpoint to accept a `backend` request field; when `backend=pi`, route through `pi` instead of the opencode sidecar.
- Add a new `/api/pi-sessions` endpoint that reads pi session data (analogous to `/api/agent-sessions`).
- Display pi sessions in the Agent Sessions view in a separate labelled group below opencode sessions.
- Show the active backend name in the `LogAiOverlay` header after a backend is selected.

## Capabilities

### New Capabilities

- `ai-backend-picker`: A `ListViewModal`-based picker overlay, shown before any AI action (log analysis trigger, new agent session), that lets the user choose `opencode` or `pi`. Follows the `EditorPickerView`/`ProfilePickerView` pattern exactly: state in `uiStore`, navigation in `global-keys.ts`, rendered in `modal-overlays.tsx`.
- `pi-log-analysis`: Backend support for routing log analysis requests through `pi` instead of the opencode sidecar. New Go server code path that spawns `pi` as a subprocess with the log content and streams the response back via SSE in the same `delta/done` protocol.
- `pi-agent-sessions`: Discovery and display of `pi` agent sessions in the Agent Sessions view, with a new `/api/pi-sessions` server endpoint and a `launchPi` TUI action.

### Modified Capabilities

- No existing capability specs need delta specs — no formal specs exist yet for these features.

## Impact

- **Server (Go)**: `handlers_github.go` — `handleAIAnalyzeLogsStream` gains `backend` field dispatch; new `handlePiAnalyzeLogsStream` helper; new `handlePiSessions` handler; registered in `server.go`.
- **TUI core (`@icon-tui/core`)**: `logs-client.ts` — `analyzeLogsWithAIStream` gains optional `backend` param; `agent-client.ts` — new `getPiSessions()` function.
- **TUI CLI (`@icon-tui/cli`)**: `ui-store.ts` — new `showAiBackendPicker`, `aiBackendPickerSelectedIndex`, `aiBackendPickerContext` signals; `agent-store.ts` — new `piAgentGroups` signal; `global-keys.ts` — picker navigation; `log-modal-keys.ts` — Shift+A now opens picker; `agent-actions.ts` — new `launchPi`; `log-actions.ts` — passes backend from picker context.
- **TUI UI (`@icon-tui/ui`)**: new `AiBackendPickerView` component; `AgentSpaceView.tsx` — render pi session group; `LogAiOverlay.tsx` — show backend name in header; `modal-overlays.tsx` — wire up picker.
- **No breaking changes** — opencode is still the default; selecting opencode in the picker produces identical behaviour to the current flow.
