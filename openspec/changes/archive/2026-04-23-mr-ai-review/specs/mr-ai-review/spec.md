## ADDED Requirements

### Requirement: mrAi state signals in mr-store
The `mr-store` SHALL expose the following reactive signals for the MR AI review feature, following the same naming pattern as the `logAi*` signals in `log-store`:
- `mrAiVisible: Signal<boolean>` — whether the overlay is currently shown
- `mrAiPromptMode: Signal<boolean>` — whether the overlay is in editable-prompt mode
- `mrAiPromptText: Signal<string>` — current text of the editable prompt
- `mrAiLoading: Signal<boolean>` — AI request in-flight (before first token)
- `mrAiStreaming: Signal<boolean>` — AI is actively streaming tokens
- `mrAiSummary: Signal<string | null>` — accumulated streamed response, or null if not yet started
- `mrAiError: Signal<string | null>` — error message if the AI call failed
- `mrAiFollowupText: Signal<string>` — text in the followup-question input
- `mrAiSessionId: Signal<string | null>` — opencode session ID (for Ctrl+O deep-link)
- `mrAiBackend: Signal<'opencode' | 'pi'>` — which backend was selected
- `mrAiScrollBoxRef` (mutable non-signal ref) — reference to the overlay scrollbox
- `mrAiAtBottom` (mutable non-signal bool) — scroll tracking flag
- All signals SHALL be initialized to their "hidden / idle" defaults (`false`, `''`, `null`, `'opencode'`)

#### Scenario: Signals initialize to idle state
- **WHEN** the TUI starts
- **THEN** `mrAiVisible()` is `false`, `mrAiLoading()` is `false`, `mrAiSummary()` is `null`, and `mrAiPromptMode()` is `false`

#### Scenario: Backend set before overlay shown
- **WHEN** the user confirms a backend choice in the picker with `aiBackendPickerContext === 'mr-ai-review'`
- **THEN** `mrAiBackend()` is updated to the chosen value and `mrAiVisible()` becomes `true`

### Requirement: MrAiReviewOverlay component
The system SHALL provide a `MrAiReviewOverlay` component in `@icon-tui/ui/src/components/` with the same visual structure and interaction model as `LogAiOverlay`. It SHALL accept the following props:
- `promptMode: boolean`
- `promptText: string`
- `loading: boolean`
- `streaming: boolean`
- `summary: string | null`
- `error: string | null`
- `followupText: string`
- `sessionId: string | null`
- `backend: 'opencode' | 'pi'`
- `postingComments: boolean` — true while the post-comments action is in-flight
- `commentsPosted: boolean` — true once comments have been successfully posted
- `isGitLab: boolean` — controls whether the "Post comments" action is available
- `onDismiss: () => void`
- `onScrollBoxReady?: (scrollBox: ScrollBoxRenderable) => void`

The header SHALL display `✦ AI Review` (not `✦ AI Analysis`). The footer hint SHALL include `Enter post comments` when a completed review is present and `isGitLab` is true. When `postingComments` is true the footer SHALL show a spinner in place of the hint. When `commentsPosted` is true the footer SHALL show `✓ Comments posted`.

#### Scenario: Overlay renders prompt mode
- **WHEN** `promptMode` is `true`
- **THEN** the editable prompt text and "Enter to analyze · Esc to cancel" hint are visible

#### Scenario: Overlay renders streaming response
- **WHEN** `streaming` is `true` and `summary` is non-null
- **THEN** the markdown-rendered summary is visible with a streaming spinner below it

#### Scenario: Post-comments hint shown only for GitLab
- **WHEN** `isGitLab` is `false` and `summary` is non-null and not loading
- **THEN** the "Enter post comments" hint is NOT shown

#### Scenario: Post-comments hint shown for GitLab
- **WHEN** `isGitLab` is `true` and `summary` is non-null and `loading` is `false` and `streaming` is `false`
- **THEN** "Enter post comments" appears in the footer hint area

#### Scenario: Posting-in-progress state
- **WHEN** `postingComments` is `true`
- **THEN** a spinner replaces the "Enter post comments" hint

#### Scenario: Comments posted confirmation
- **WHEN** `commentsPosted` is `true`
- **THEN** footer shows `✓ Comments posted` in green and the "Enter post comments" hint is hidden

### Requirement: MrAiReviewOverlay mounted in root component
The `MrAiReviewOverlay` SHALL be conditionally rendered in the top-level `App` component (or the same overlay host used by `LogAiOverlay`) when `mrStore.mrAiVisible()` is `true`, wired to the `mrAi*` signals from `mr-store`.

#### Scenario: Overlay visible when mrAiVisible is true
- **WHEN** `mrStore.mrAiVisible()` becomes `true`
- **THEN** the `MrAiReviewOverlay` appears on screen

#### Scenario: Overlay absent when mrAiVisible is false
- **WHEN** `mrStore.mrAiVisible()` is `false`
- **THEN** no `MrAiReviewOverlay` is rendered

### Requirement: Shift+A in mr-detail-keys.ts opens AI backend picker
The `handleMrDetailKeys` function SHALL handle `event.sequence === 'A'` (Shift+A) to open the AI backend picker. It SHALL set `uiStore.setAiBackendPickerContext('mr-ai-review')` and `uiStore.setShowAiBackendPicker(true)`. The existing uppercase `A` / `event.name === 'A'` branch (approval toggle) SHALL be restricted to `event.sequence !== 'A'` or replaced by a lowercase-only `a` handler so there is no conflict.

#### Scenario: Shift+A opens picker
- **WHEN** `viewMode` is `'mergeRequestDetail'` and user presses `Shift+A`
- **THEN** `uiStore.showAiBackendPicker()` becomes `true` and `uiStore.aiBackendPickerContext()` is `'mr-ai-review'`

#### Scenario: Approval toggle no longer fires on Shift+A
- **WHEN** `viewMode` is `'mergeRequestDetail'` and user presses `Shift+A`
- **THEN** the MR approval toggle is NOT triggered

#### Scenario: Approval toggle still fires on lowercase a
- **WHEN** `viewMode` is `'mergeRequestDetail'` and user presses lowercase `a`
- **THEN** the MR approval toggle IS triggered

### Requirement: Default prompt construction
When the `'mr-ai-review'` context is confirmed in `global-keys.ts`, the system SHALL construct a default prompt string using the currently selected MR's data and set it as `mrAiPromptText`. The prompt SHALL include:
- MR title
- Target branch
- MR description (if non-empty)
- List of changed files with their change type (added, deleted, renamed, modified)

The overlay SHALL open in **prompt mode** (editable) so the user can adjust the prompt before submission.

#### Scenario: Default prompt includes MR title
- **WHEN** the backend picker confirms with context `'mr-ai-review'`
- **THEN** `mrAiPromptText()` contains the MR title

#### Scenario: Default prompt includes changed files
- **WHEN** the backend picker confirms with context `'mr-ai-review'` and `mrChanges()` is non-empty
- **THEN** `mrAiPromptText()` contains the list of changed file paths

#### Scenario: Overlay opens in prompt mode
- **WHEN** the backend picker confirms with context `'mr-ai-review'`
- **THEN** `mrAiPromptMode()` is `true` and `mrAiVisible()` is `true`

### Requirement: AI review execution and streaming
When the user presses `Enter` while `mrAiVisible()` is `true` and `mrAiPromptMode()` is `true`, the system SHALL:
1. Set `mrAiPromptMode(false)`, `mrAiLoading(true)`, `mrAiSummary(null)`, `mrAiError(null)`
2. Call the chosen backend (opencode SDK or pi CLI) with the prompt text
3. Stream tokens into `mrAiSummary` (switching `mrAiLoading` → `mrAiStreaming` on first token)
4. On completion set `mrAiStreaming(false)`
5. On error set `mrAiError(message)` and `mrAiLoading(false)` / `mrAiStreaming(false)`

This SHALL reuse the same streaming infrastructure used by the log analysis feature.

#### Scenario: Enter in prompt mode starts analysis
- **WHEN** `mrAiPromptMode()` is `true` and user presses `Enter`
- **THEN** `mrAiLoading()` becomes `true` and `mrAiPromptMode()` becomes `false`

#### Scenario: First streamed token transitions loading to streaming
- **WHEN** the AI backend emits the first token
- **THEN** `mrAiLoading()` becomes `false` and `mrAiStreaming()` becomes `true`

#### Scenario: Completed review clears streaming flag
- **WHEN** the AI backend finishes
- **THEN** `mrAiStreaming()` becomes `false` and `mrAiSummary()` holds the full response

#### Scenario: AI error is surfaced in overlay
- **WHEN** the AI call throws an error
- **THEN** `mrAiError()` is set to the error message and `mrAiLoading()` / `mrAiStreaming()` are `false`

### Requirement: Post AI-review comments to GitLab MR
When a review is complete (`mrAiSummary()` is non-null, not loading, not streaming) and the user presses `Enter` in the `MrAiReviewOverlay` (follow-up input area), and `isGitLab` is true, the system SHALL:
1. Set `mrAiPostingComments(true)`
2. Prepend the standard AI-attribution header to the summary text
3. Call `createMRComment(deps, appIdent, mrIID, attributedBody)` (no position — top-level note)
4. On success set `mrAiPostingComments(false)` and `mrAiCommentsPosted(true)`
5. On error display the error in the overlay footer

The AI-attribution header SHALL be exactly:
```
> 🤖 *This review was generated automatically by AI. Please verify all suggestions before acting on them.*

---

```

#### Scenario: Pressing Enter after review posts comment
- **WHEN** `mrAiSummary()` is non-null, not loading, not streaming, and user presses `Enter`
- **THEN** `mrAiPostingComments()` becomes `true` and `createMRComment` is called

#### Scenario: Posted comment includes attribution header
- **WHEN** comment is posted
- **THEN** the comment body starts with the AI-attribution blockquote

#### Scenario: Success state shown after posting
- **WHEN** `createMRComment` resolves successfully
- **THEN** `mrAiCommentsPosted()` becomes `true` and `mrAiPostingComments()` becomes `false`

#### Scenario: Post button unavailable for non-GitLab MRs
- **WHEN** the selected MR source type is not GitLab and review is complete
- **THEN** pressing `Enter` does NOT call `createMRComment`

### Requirement: MR AI review keyboard handling in mr-detail-keys.ts
When `mrAiVisible()` is `true`, the `handleMrDetailKeys` function SHALL forward scroll keys (Ctrl+J/K/G/G) to the overlay's `mrAiScrollBoxRef`, forward `Ctrl+O` to open the opencode session, and forward `Esc` to dismiss the overlay (set `mrAiVisible(false)`). All other keys SHALL be consumed while the overlay is open to prevent accidental navigation.

#### Scenario: Esc dismisses overlay
- **WHEN** `mrAiVisible()` is `true` and user presses `Esc`
- **THEN** `mrAiVisible()` becomes `false`

#### Scenario: Ctrl+J scrolls overlay
- **WHEN** `mrAiVisible()` is `true`, `mrAiSummary()` is non-null, and user presses `Ctrl+J`
- **THEN** the overlay scrollbox scrolls down by one line

#### Scenario: Background navigation blocked while overlay open
- **WHEN** `mrAiVisible()` is `true` and user presses any non-overlay key
- **THEN** the key is consumed and the view does not change
