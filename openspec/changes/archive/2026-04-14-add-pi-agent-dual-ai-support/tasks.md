## 1. Investigate pi CLI interface

- [x] 1.1 Run `pi --help` and `pi session --help` to document available flags for non-interactive execution and session listing
- [x] 1.2 Determine whether `pi` accepts a `--prompt` flag / stdin pipe for non-interactive log analysis, or requires a TTY
- [x] 1.3 Determine the exact output format of `pi session list` (JSON vs human-readable) and document field names
- [x] 1.4 Confirm the flag name for resuming an existing pi session (e.g. `--session <id>`)

## 2. AiBackendPickerView component

- [x] 2.1 Create `tui/packages/ui/src/components/AiBackendPickerView.tsx` with two hardcoded options (`opencode`, `pi`) using `ListViewModal`, mirroring `EditorPickerView` structure exactly
- [x] 2.2 Export `AiBackendPickerView` and `AI_BACKEND_OPTIONS` from `tui/packages/ui/src/index.ts`
- [x] 2.3 Add `showAiBackendPicker`, `aiBackendPickerSelectedIndex`, and `aiBackendPickerContext` signals to `ui-store.ts` (initialized to `false`, `0`, `null`)
- [x] 2.4 Add `<Show when={uiStore.showAiBackendPicker()}>` block with `<AiBackendPickerView>` to `modal-overlays.tsx`, alongside the existing editor/profile picker blocks
- [x] 2.5 Import `AiBackendPickerView` in `modal-overlays.tsx`

## 3. Picker keyboard handling in global-keys.ts

- [x] 3.1 Add `showAiBackendPicker` guard block in `global-keys.ts` (same structure as the `showProfilePicker` block): handle `j`/`Down`, `k`/`Up`, `Enter`, `Esc`
- [x] 3.2 On `Enter` with context `'log-analysis'` and index `0` (opencode): close picker, set `logStore.logAiBackend('opencode')`, then proceed to existing prompt mode or visual-mode analysis flow
- [x] 3.3 On `Enter` with context `'log-analysis'` and index `1` (pi): close picker, set `logStore.logAiBackend('pi')`, then proceed to same prompt mode or visual-mode analysis flow
- [x] 3.4 On `Enter` with context `'new-agent-session'` and index `0` (opencode): close picker, call `agentStore.setAgentStep('newSessionSpacePicker')`
- [x] 3.5 On `Enter` with context `'new-agent-session'` and index `1` (pi): close picker, call `agentActions.launchPi(null)`
- [x] 3.6 On `Esc`: close picker, take no action

## 4. Log modal — open picker instead of prompt mode

- [x] 4.1 Add `logAiBackend` signal (`'opencode' | 'pi'`, default `'opencode'`) to `log-store.ts`
- [x] 4.2 Reset `logAiBackend` to `'opencode'` in `clearAiState` inside `log-actions.ts`
- [x] 4.3 Update `Shift+A` handler in `log-modal-keys.ts`: when no prior AI state exists, call `uiStore.setAiBackendPickerContext('log-analysis')` + `uiStore.setShowAiBackendPicker(true)` instead of entering prompt mode directly; preserve the existing "toggle overlay if state exists" branch unchanged
- [x] 4.4 Update `runAiAnalysis` in `log-actions.ts` to read `logStore.logAiBackend()` and pass it as `backend` to `client.analyzeLogsWithAIStream`

## 5. Agent view — open picker on New Session

- [x] 5.1 Update the agent view keyboard handler: when the selected row is the "New Session" row and `Enter` is pressed, open the AI backend picker (`uiStore.setAiBackendPickerContext('new-agent-session')` + `uiStore.setShowAiBackendPicker(true)`) instead of calling `agentStore.setAgentStep('newSessionSpacePicker')` directly

## 6. Go server — pi log analysis

- [x] 6.1 Add `backend` field to the `handleAIAnalyzeLogsStream` request struct in `handlers_github.go`
- [x] 6.2 Implement `handlePiAnalyzeLogsStream` that spawns `pi` as a subprocess (using flags from step 1.2), pipes prompt+logs, collects stdout, and emits SSE `delta` + `done`
- [x] 6.3 Apply the existing 100 KB log truncation to the pi path
- [x] 6.4 Kill the pi subprocess when the request context is cancelled (timeout or disconnect)
- [x] 6.5 Return HTTP 503 `{"error": "pi not found in PATH"}` when `pi` is absent
- [x] 6.6 Emit SSE `{"error": "<stderr>"}` when `pi` exits non-zero
- [x] 6.7 Dispatch to `handlePiAnalyzeLogsStream` when `backend == "pi"` in the main handler

## 7. Go server — pi sessions endpoint

- [x] 7.1 Implement `queryPiSessions()` that calls `pi session list` (with flags from step 1.3/1.4) and parses the output into `[]agentGroup`
- [x] 7.2 Add `handleGetPiSessions` HTTP handler: returns `{"agents": [...]}` (empty array on any error)
- [x] 7.3 Register `GET /api/pi-sessions` route in `server.go`

## 8. TUI core — client updates

- [x] 8.1 Add optional `backend?: 'opencode' | 'pi'` parameter to `analyzeLogsWithAIStream` in `logs-client.ts`; include it in the POST body when provided
- [x] 8.2 Add `getPiSessions(): Promise<AgentGroup[]>` to `agent-client.ts` calling `GET /api/pi-sessions`
- [x] 8.3 Expose `getPiSessions` from the `DevEnvClient` wrapper in `core/src/index.ts`

## 9. TUI — pi agent store & actions

- [x] 9.1 Add `piAgentGroups` signal (`AgentGroup[]`, default `[]`) to `agent-store.ts`
- [x] 9.2 Update `openAgentView` in `agent-actions.ts` to call `client.getPiSessions()` concurrently with `getAgentSessions()`, store result in `piAgentGroups` (warn + fallback to `[]` on error)
- [x] 9.3 Implement `launchPi(sessionId: string | null)` in `agent-actions.ts`: suspend renderer → `spawnSync('pi', [projectRoot, ...(sessionId ? ['--session', sessionId] : [])])` → resume → refresh both session lists

## 10. TUI UI — AgentSpaceView pi sessions

- [x] 10.1 Add `piAgentGroups: AgentGroup[]` prop to `AgentSpaceViewProps`
- [x] 10.2 Add `FlatRow` variants: `{ kind: 'pi-separator' }` and `{ kind: 'pi-session'; session: AgentSessionInfo; agentName: string }`
- [x] 10.3 Render "— pi sessions —" separator row and pi session rows below opencode sessions in the `rows` memo; omit the section entirely when `piAgentGroups` is empty
- [x] 10.4 Add `RowView` rendering for `pi-separator` (muted label row) and `pi-session` (same layout as opencode session row)
- [x] 10.5 Update the Enter key handler in the agent view keyboard handler to call `launchPi(session.id)` for `pi-session` rows and `launchOpencode(null, session.id)` for opencode `session` rows

## 11. TUI UI — LogAiOverlay backend label

- [x] 11.1 Add `backend: 'opencode' | 'pi'` prop to `LogAiOverlayProps` in `LogAiOverlay.tsx`
- [x] 11.2 Display `[pi]` or `[opencode]` in the header row next to "✦ AI Analysis"
- [x] 11.3 Pass `logStore.logAiBackend()` as `backend` prop to `LogAiOverlay` in `modal-overlays.tsx`

## 12. Wiring & integration

- [x] 12.1 Pass `agentStore.piAgentGroups()` to `AgentSpaceView` in `modal-overlays.tsx`
- [x] 12.2 Thread `launchPi` from `agent-actions` into the keyboard handler context (add to `KeyboardContext` or `KeyboardActions` types and wire in `app-opentui.tsx`)
- [x] 12.3 Expose `uiStore` setter helpers (`setAiBackendPickerContext`, `setShowAiBackendPicker`) to the global-keys handler via `KeyboardStores`

## 13. Documentation

- [x] 13.1 Update `docs/AGENTS.md` to document the AI backend picker, what opencode and pi offer, and that `pi` must be in PATH for pi features to function
- [x] 13.2 Add the new `Shift+A` flow (opens backend picker) and agent session picker UX to the TUI key bindings reference in the README
