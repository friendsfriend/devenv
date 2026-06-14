## Why

Reviewing a merge request today requires the developer to read diffs manually and write comments by hand. The TUI already surfaces the MR's metadata, changed files, pipeline status, and discussions — all the raw material needed for a review — but there is no way to ask an AI to analyze it and post structured feedback directly from the keyboard. Adding an AI-powered code review flow (Shift+A in the MR detail view) closes this gap and makes the TUI a complete review workstation.

## What Changes

- **New keybinding** — `Shift+A` in `MergeRequestDetailView` opens the AI backend picker (`opencode` vs `pi`), exactly as `Shift+A` does in the log modal.
- **New overlay** — `MrAiReviewOverlay` (modelled after `LogAiOverlay`) shows a default editable prompt, streams the AI response, then offers a "Post comments" action that creates GitLab discussion notes on the MR.
- **New store state** — `mr-store` gains `mrAi*` signals (visible, promptMode, promptText, loading, streaming, summary, error, backend, scrollBoxRef, sessionId) mirroring the `logAi*` pattern in `log-store`.
- **Extend AI backend picker context** — adds `'mr-ai-review'` to the `aiBackendPickerContext` union type and handles it in `global-keys.ts`.
- **AI-generated comments** — after review is complete the user can press Enter to post comments; each comment is prefixed with a standard AI-attribution header; comments are posted via the existing `createMRComment` client function.

## Capabilities

### New Capabilities
- `mr-ai-review`: Full MR AI review feature — overlay UI, store signals, keyboard wiring, default prompt construction from MR context (title, description, changed files with diffs), streamed AI response, and posting of AI-attributed review comments to GitLab.

### Modified Capabilities
- `ai-backend-picker`: `aiBackendPickerContext` signal type must include `'mr-ai-review'`; `global-keys.ts` confirm handler gains a new branch for this context.

## Impact

- **Files changed**: `mr-store.ts`, `ui-store.ts`, `mr-detail-keys.ts`, `global-keys.ts`, `mr-actions.ts`, `MergeRequestDetailView.tsx` (hint text), new `MrAiReviewOverlay.tsx` in `@icon-tui/ui`
- **APIs used**: existing `createMRComment` (no new backend endpoints needed — diffs come from `getMRChanges`, which is already fetched)
- **Dependencies**: none new — reuses `@opentui/solid`, existing spinner/color/markdown helpers, and the established `aiBackendPickerContext` mechanism
- **Breaking changes**: none — Shift+A was previously unbound in the MR detail view
