## MODIFIED Requirements

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
