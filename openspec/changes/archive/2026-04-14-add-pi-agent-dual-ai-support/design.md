## Context

The TUI is a SolidJS terminal application backed by a Go HTTP server. It has two AI-facing features today:

1. **Log analysis** — triggered by `Shift+A` in the log modal. The TUI sends log text to `POST /api/ai/analyze-logs-stream`, which starts an `opencode serve` sidecar (lazy, once per server lifetime) and forwards the request. The response is streamed back as SSE `delta/done` events.

2. **Agent session launcher** — triggered from the main view. The server queries opencode's SQLite DB to list sessions grouped by agent name. `Shift+A` on a "New Session" row → switches `agentStep` to `newSessionSpacePicker` (opencode agent selection) → Enter → `launchOpencode` suspends the renderer and calls `spawnSync('opencode', ...)`.

There is already an established pattern for choice overlays in the TUI:
- `EditorPickerView` — a static list of editor options shown via `uiStore.showEditorPicker`
- `ProfilePickerView` — a dynamic list of Docker profiles shown via `uiStore.showProfilePicker`

Both follow the same structure: state signals in `uiStore`, a `ListViewModal`-based component in `@icon-tui/ui`, navigation handled in `global-keys.ts`, rendered conditionally in `modal-overlays.tsx`.

`pi` is a separate AI coding agent (`pi-coding-agent`) installed at `/opt/homebrew/...`. It has no HTTP API; interactive sessions are launched via `pi` CLI. Pi stores sessions separately from opencode.

## Goals / Non-Goals

**Goals:**
- Show an `AiBackendPickerView` overlay whenever the user triggers an AI action (log analysis, new agent session), letting them choose `opencode` or `pi`.
- After choosing opencode, produce behaviour identical to the current flow (zero regression).
- After choosing pi for log analysis: run analysis via a new `pi` subprocess path on the server, streaming results in the same SSE protocol.
- After choosing pi for a new agent session: call `launchPi(null)` immediately (no agent sub-picker needed for pi).
- Display pi's existing sessions in the Agent Sessions view in a separate labelled group.
- Show the active backend name in the `LogAiOverlay` header.

**Non-Goals:**
- Persistent backend preference across restarts (not needed; the picker appears each time).
- `pi` HTTP sidecar / streaming mode (pi has no REST API; analysis returns as a single chunk).
- Agent sub-picker for pi (pi does not use named agents the way opencode does).
- Replacing or merging opencode and pi sessions into a single sorted list.

## Decisions

### D1 — Follow the EditorPickerView pattern exactly

`AiBackendPickerView` is a new component in `@icon-tui/ui/src/components/` using `ListViewModal` with two hardcoded options: `{ id: 'opencode', label: 'opencode', description: 'Launch opencode agent' }` and `{ id: 'pi', label: 'pi', description: 'Launch pi coding agent' }`. It takes a single `selectedIndex` prop, matching `EditorPickerView`.

State in `uiStore`:
```ts
showAiBackendPicker: Signal<boolean>
aiBackendPickerSelectedIndex: Signal<number>
aiBackendPickerContext: Signal<'log-analysis' | 'new-agent-session' | null>
```

Navigation (j/k/Enter/Esc) is added to `global-keys.ts` in the same block structure as the existing profile picker handler, consuming the three `uiStore` signals above.

**Why not a new keyboard handler file?** The profile picker, editor picker, and error dialog are all handled inline in `global-keys.ts`. Consistency is more valuable than separation here.

**Why not a step inside `AgentSpaceView`?** The picker is needed for two different entry points (log modal + agent view). A shared `uiStore` overlay avoids duplicating state and keyboard handling.

### D2 — Shift+A in log modal opens picker first, then enters current flow

Current Shift+A behaviour:
- If state exists → toggle overlay visibility.
- Else if visual mode → run analysis immediately on selection.
- Else → enter prompt mode.

New Shift+A behaviour:
- If state exists → toggle overlay visibility (unchanged).
- Else → open the AI backend picker (`uiStore.setShowAiBackendPicker(true)`, context = `'log-analysis'`). After the user confirms a choice in `global-keys.ts`, the picker closes and the existing flow resumes: visual-mode goes straight to analysis; normal mode enters prompt mode.

**Why preserve the "state exists → toggle" shortcut?** Once analysis has run, re-showing the overlay doesn't need a re-pick — the user already chose a backend.

### D3 — New Session in agent view opens picker before agent selection

Current Enter-on-New-Session: sets `agentStep` to `'newSessionSpacePicker'`.

New Enter-on-New-Session: opens the AI backend picker (context = `'new-agent-session'`). On confirmation in `global-keys.ts`:
- opencode → `agentStore.setAgentStep('newSessionSpacePicker')` (existing flow).
- pi → call `launchPi(null)` immediately (no agent sub-picker for pi).

### D4 — Backend dispatch in Go server via `backend` request field

`POST /api/ai/analyze-logs-stream` request body gains optional `backend` field (`"opencode"` | `"pi"`, default `"opencode"`). The handler dispatches to the existing opencode path or a new `handlePiAnalyzeLogsStream`.

Pi path spawns `pi` as a subprocess, pipes the concatenated prompt + log text, collects stdout, and emits a single SSE `delta` event followed by `done`. The same 90-second timeout and 100 KB log cap apply.

**Why not a separate endpoint?** A single endpoint with dispatch keeps `logs-client.ts` unchanged except for one optional parameter — cleaner than parallel wiring.

### D5 — Pi sessions via `pi session list` CLI, rendered as a separate group

New `GET /api/pi-sessions` endpoint calls `pi session list` and parses the output into `[]AgentGroup`. The `AgentSpaceView` renders pi sessions below opencode sessions with a "— pi sessions —" separator row and a new `FlatRow` kind.

The `launchPi` action in `agent-actions.ts` mirrors `launchOpencode`: suspend renderer → `spawnSync('pi', [projectRoot, ...(sessionId ? ['--session', sessionId] : [])])` → resume → refresh both session lists.

## Risks / Trade-offs

- **`pi` CLI flags for non-interactive use are undocumented** → Mitigation: read `pi --help` and `pi session --help` before implementing D4/D5; add a clear `503` error message if expected flags are absent.
- **Pi subprocess for log analysis blocks a goroutine for up to 90 s** → Acceptable at TUI scale; context cancellation kills the subprocess.
- **Pi may require a TTY** → If confirmed during investigation, the log-analysis pi path returns a friendly error: "pi requires an interactive terminal — open a pi session from the agent view instead."
- **Two separate session stores** → Clean separation via labelled groups; no merging complexity.
- **Picker adds one extra keypress** → Accepted. The opencode-only path is two keypresses (Enter twice); the picker is identical cost. The picker can be pre-selected to the last-used tool if needed in future.

## Migration Plan

1. Deploy Go server changes (backend dispatch + `/api/pi-sessions`) — fully backward-compatible.
2. Deploy TUI changes (picker component, `launchPi`, pi session group) — users without `pi` in PATH see empty pi sessions and get a graceful `503` on pi log analysis.
3. No database migrations.
4. Rollback: revert TUI and server independently; no persistent state written.

## Open Questions

- What exact flags does `pi` accept for non-interactive prompt execution? → Verify with `pi --help` before implementing D4.
- Does `pi session list` emit JSON or human-readable output? → Verify before implementing D5 parser.
