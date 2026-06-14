### Requirement: AiBackendPickerView component
The system SHALL provide an `AiBackendPickerView` component in `@icon-tui/ui/src/components/` that uses `ListViewModal` to display two hardcoded options: `opencode` (label: "opencode", description: "Launch opencode agent") and `pi` (label: "pi", description: "Launch pi coding agent"). The component SHALL accept a single `selectedIndex: number` prop, identical in structure to `EditorPickerView`.

#### Scenario: Picker renders two options
- **WHEN** `AiBackendPickerView` is rendered with `selectedIndex={0}`
- **THEN** both "opencode" and "pi" rows are visible, with "opencode" highlighted as selected

#### Scenario: Picker highlights correct row
- **WHEN** `AiBackendPickerView` is rendered with `selectedIndex={1}`
- **THEN** the "pi" row is highlighted and "opencode" is not

### Requirement: Picker state in uiStore
The `uiStore` SHALL expose three new signals following the existing `showEditorPicker` / `editorPickerSelectedIndex` pattern:
- `showAiBackendPicker: Signal<boolean>` — whether the picker overlay is visible
- `aiBackendPickerSelectedIndex: Signal<number>` — currently highlighted row (0 = opencode, 1 = pi)
- `aiBackendPickerContext: Signal<'log-analysis' | 'new-agent-session' | 'mr-ai-review' | null>` — which feature triggered the picker, used by the confirm handler to dispatch the correct action

#### Scenario: Signals are initialized to hidden state
- **WHEN** the TUI starts
- **THEN** `showAiBackendPicker()` is `false`, `aiBackendPickerSelectedIndex()` is `0`, and `aiBackendPickerContext()` is `null`

### Requirement: Picker navigation in global-keys.ts
The global keyboard handler SHALL handle picker navigation when `showAiBackendPicker()` is `true`, in the same block structure used for `showProfilePicker`. It SHALL respond to:
- `j` / `Down` — increment `aiBackendPickerSelectedIndex` (clamped to 1)
- `k` / `Up` — decrement `aiBackendPickerSelectedIndex` (clamped to 0)
- `Enter` — confirm selection (dispatch based on context, then close picker)
- `Esc` — cancel without action (close picker)

All other keys SHALL be consumed (return true) while the picker is open.

The `Enter` confirm handler SHALL include a branch for `context === 'mr-ai-review'` that:
1. Closes the picker (`setShowAiBackendPicker(false)`)
2. Sets `mrStore.setMrAiBackend(selected ? 'opencode' : 'pi')`
3. Constructs the default review prompt from the selected MR's data and sets `mrStore.setMrAiPromptText(prompt)`
4. Sets `mrStore.setMrAiPromptMode(true)` and `mrStore.setMrAiVisible(true)`

#### Scenario: j moves selection down
- **WHEN** picker is open, `aiBackendPickerSelectedIndex` is `0`, user presses `j`
- **THEN** `aiBackendPickerSelectedIndex` becomes `1`

#### Scenario: j does not go past last option
- **WHEN** picker is open, `aiBackendPickerSelectedIndex` is `1`, user presses `j`
- **THEN** `aiBackendPickerSelectedIndex` remains `1`

#### Scenario: k moves selection up
- **WHEN** picker is open, `aiBackendPickerSelectedIndex` is `1`, user presses `k`
- **THEN** `aiBackendPickerSelectedIndex` becomes `0`

#### Scenario: Esc closes picker without action
- **WHEN** picker is open and user presses `Esc`
- **THEN** `showAiBackendPicker` becomes `false` and no AI action is triggered

#### Scenario: Enter with log-analysis context and opencode selected
- **WHEN** `aiBackendPickerContext` is `'log-analysis'`, `aiBackendPickerSelectedIndex` is `0`, user presses `Enter`
- **THEN** picker closes and the log analysis flow proceeds with the opencode backend (prompt mode or immediate visual-mode analysis)

#### Scenario: Enter with log-analysis context and pi selected
- **WHEN** `aiBackendPickerContext` is `'log-analysis'`, `aiBackendPickerSelectedIndex` is `1`, user presses `Enter`
- **THEN** picker closes and the log analysis flow proceeds with the pi backend

#### Scenario: Enter with new-agent-session context and opencode selected
- **WHEN** `aiBackendPickerContext` is `'new-agent-session'`, `aiBackendPickerSelectedIndex` is `0`, user presses `Enter`
- **THEN** picker closes and `agentStore.setAgentStep('newSessionSpacePicker')` is called (existing opencode agent picker flow)

#### Scenario: Enter with new-agent-session context and pi selected
- **WHEN** `aiBackendPickerContext` is `'new-agent-session'`, `aiBackendPickerSelectedIndex` is `1`, user presses `Enter`
- **THEN** picker closes and `launchPi(null)` is called

#### Scenario: Enter with mr-ai-review context and opencode selected
- **WHEN** `aiBackendPickerContext` is `'mr-ai-review'`, `aiBackendPickerSelectedIndex` is `0`, user presses `Enter`
- **THEN** picker closes, `mrStore.mrAiBackend()` is `'opencode'`, and the MR AI review overlay opens in prompt mode

#### Scenario: Enter with mr-ai-review context and pi selected
- **WHEN** `aiBackendPickerContext` is `'mr-ai-review'`, `aiBackendPickerSelectedIndex` is `1`, user presses `Enter`
- **THEN** picker closes, `mrStore.mrAiBackend()` is `'pi'`, and the MR AI review overlay opens in prompt mode

### Requirement: Picker rendered in modal-overlays.tsx
The `AiBackendPickerView` SHALL be rendered in `modal-overlays.tsx` inside a `<Show when={uiStore.showAiBackendPicker()}>` block, passing `selectedIndex={uiStore.aiBackendPickerSelectedIndex()}`. It SHALL be added alongside the `EditorPickerView` and `ProfilePickerView` Show blocks.

#### Scenario: Picker is visible when showAiBackendPicker is true
- **WHEN** `uiStore.showAiBackendPicker()` returns `true`
- **THEN** `AiBackendPickerView` is rendered in the overlay layer

#### Scenario: Picker is not rendered when showAiBackendPicker is false
- **WHEN** `uiStore.showAiBackendPicker()` returns `false`
- **THEN** `AiBackendPickerView` is not present in the rendered output

### Requirement: Shift+A in log modal opens picker instead of entering prompt mode directly
When no existing AI state is present (no prior summary, loading, or streaming), pressing `Shift+A` in the log modal SHALL open the AI backend picker (`uiStore.setShowAiBackendPicker(true)`, context = `'log-analysis'`) rather than entering prompt mode immediately. When AI state already exists, `Shift+A` SHALL continue to toggle the overlay visibility without re-showing the picker.

#### Scenario: Shift+A with no prior AI state opens picker
- **WHEN** no AI summary, loading, or streaming is active and the user presses `Shift+A`
- **THEN** `showAiBackendPicker` becomes `true` and `aiBackendPickerContext` becomes `'log-analysis'`

#### Scenario: Shift+A with existing AI state toggles overlay
- **WHEN** `logAiSummary` is non-null and the user presses `Shift+A`
- **THEN** `logAiVisible` is toggled and the picker is NOT shown

### Requirement: Enter on New Session in agent view opens picker
When the selected row in the agent sessions view is the "New Session" row and the user presses `Enter`, the system SHALL open the AI backend picker (context = `'new-agent-session'`) instead of immediately switching to the `newSessionSpacePicker` step.

#### Scenario: Enter on New Session opens picker
- **WHEN** the agent view is open, the "New Session" row is selected, and the user presses `Enter`
- **THEN** `showAiBackendPicker` becomes `true` and `aiBackendPickerContext` becomes `'new-agent-session'`

### Requirement: Active backend displayed in LogAiOverlay header
The `LogAiOverlay` component SHALL accept a `backend: 'opencode' | 'pi'` prop and display the backend name in its header row next to "✦ AI Analysis".

#### Scenario: Header shows pi backend
- **WHEN** `backend` prop is `'pi'`
- **THEN** the header reads "✦ AI Analysis  [pi]"

#### Scenario: Header shows opencode backend
- **WHEN** `backend` prop is `'opencode'`
- **THEN** the header reads "✦ AI Analysis  [opencode]"
