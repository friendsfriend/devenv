## Context

The TUI already fetches and displays all the information needed for a code review: MR title, description, source/target branches, changed files with diffs (via `getMRChanges`), and pipeline status. The `LogAiOverlay` pattern demonstrates a complete, well-tested template for streaming AI responses inside a TUI overlay. The `aiBackendPickerContext` mechanism in `ui-store.ts` / `global-keys.ts` provides a clean, decoupled way to route a backend choice to the correct feature. All comment-posting is backed by the existing `createMRComment` client function — no new backend endpoints are required.

The only missing pieces are: (1) wiring `Shift+A` in the MR detail view to trigger the AI backend picker with a new context value, (2) a store slice for the MR AI review state (cloning the `logAi*` signals from `log-store`), (3) a new `MrAiReviewOverlay` UI component, (4) an action that constructs the review prompt from the already-fetched MR context, invokes the chosen AI backend, streams the response, and then posts AI-attributed comments.

## Goals / Non-Goals

**Goals:**
- `Shift+A` in `MergeRequestDetailView` opens the AI backend picker (`opencode` / `pi`)
- A new `MrAiReviewOverlay` (modelled exactly on `LogAiOverlay`) streams the AI review
- Default prompt is pre-filled with MR context (title, description, changed files) and is editable before submission
- After a completed review the user can press `Enter` to post comments to the MR; each comment carries an AI-attribution header
- General (non-diff-specific) review remarks are posted as top-level MR notes; the initial batch is posted as a single comment containing all findings to avoid spam

**Non-Goals:**
- Inline diff comments with precise line positioning (complex, error-prone; a follow-up can add this once the basic flow works)
- GitHub PRs (only GitLab MRs for now; the `createMRComment` endpoint is GitLab-only)
- Persisting review history across TUI sessions
- Automatically re-triggering the review when the MR changes

## Decisions

### D1 — Reuse `aiBackendPickerContext` instead of a dedicated Shift+A handler

**Decision**: Add `'mr-ai-review'` to the `aiBackendPickerContext` union and handle it in the existing `global-keys.ts` confirm branch.

**Rationale**: The picker and its keyboard handling already work. Duplicating the picker just for this feature would split maintenance. The context enum is the correct extension point.

**Alternative considered**: A dedicated `showMrAiBackendPicker` signal — rejected because it would require duplicating the full picker keyboard-handling block.

### D2 — Mirror `logAi*` signals in `mr-store` (not a new dedicated store)

**Decision**: Add `mrAi*` signals directly to `mr-store.ts` alongside the existing `mrChanges`, `mrDiscussions`, etc. state.

**Rationale**: MR AI review state is tightly coupled to the currently selected MR. Keeping it in `mr-store` means it is automatically scoped to the active MR and cleared when the user navigates away, with no additional coordination needed.

**Alternative considered**: A new `mr-ai-store.ts` — rejected because it adds indirection without benefit; the `log-store` precedent already shows this pattern working well inside the owning store.

### D3 — Post all findings as a single top-level MR comment (not per-finding notes)

**Decision**: Compile the AI's full review text into one MR note posted via `createMRComment` (no `position` argument → top-level comment).

**Rationale**: Posting one comment per finding would flood the discussion thread, hit GitLab rate limits, and be hard to batch-cancel. A single structured comment is easy to delete/replace and easy for reviewers to read.

**Alternative considered**: One comment per heading/section in the AI response — rejected for the rate-limit and UX reasons above. Inline diff comments can be added in a follow-up.

### D4 — Default prompt includes title, description, and changed-file list (not full diffs)

**Decision**: The default prompt sent to the AI contains the MR title, description, target branch, and the list of changed files (path + `new_file`/`deleted_file`/`renamed_file` flags). Full diff content is excluded from the default prompt.

**Rationale**: Full diffs can easily exceed context-window limits for large MRs. The file list gives the AI enough signal to produce meaningful architectural / naming / structural feedback. The user can always edit the prompt before submitting to paste in specific diffs.

**Alternative considered**: Include truncated diff content (first N lines per file) — possible enhancement for a follow-up; excluded now to keep the initial scope safe.

## Risks / Trade-offs

- **[Risk] AI response is too long to post** → GitLab notes have a 1 MB body limit; the overlay shows the full text but the post action can silently truncate at 50 000 chars with a note appended. Mitigation: add a character-count warning in the overlay footer.
- **[Risk] `Shift+A` conflicts with the existing approval toggle (`a`)** → `a`/`A` currently toggles MR approval (`mr-detail-keys.ts` handles `event.name === 'A'`). The new binding uses `event.sequence === 'A'` (shift+a in sequence notation) — same value. **Resolution**: repurpose `Shift+A` for AI review (approval stays on lowercase `a`); update the help text accordingly.
- **[Risk] MR has no changes loaded yet** → guard: if `mrChanges()` is empty/undefined, show an inline message in the overlay instead of a blank prompt.
- **[Risk] GitLab-only** → non-GitLab MRs (GitHub PRs) will show the overlay but disable the "Post comments" action with an explanatory note.
