## 1. Store — mr-store signals

- [x] 1.1 Add `mrAi*` reactive signals to `mr-store.ts`: `mrAiVisible`, `mrAiPromptMode`, `mrAiPromptText`, `mrAiLoading`, `mrAiStreaming`, `mrAiSummary`, `mrAiError`, `mrAiFollowupText`, `mrAiSessionId`, `mrAiBackend` (default `'opencode'`), `mrAiPostingComments`, `mrAiCommentsPosted`
- [x] 1.2 Add mutable non-signal refs to `mr-store`: `mrAiScrollBoxRef`, `mrAiAtBottom`, `mrAiLastScrollTop`
- [x] 1.3 Export all new signals and setters from the store's return object

## 2. Type — extend aiBackendPickerContext union

- [x] 2.1 Add `'mr-ai-review'` to the `aiBackendPickerContext` type in `ui-store.ts` (signal type and setter)

## 3. Keyboard — Shift+A in mr-detail-keys.ts

- [x] 3.1 Restrict approval toggle to lowercase `a`
- [x] 3.2 Add Shift+A branch for AI review picker
- [x] 3.3 Add overlay key guard at the top

## 4. Keyboard — global-keys.ts confirm handler

- [x] 4.1 Add `else if (context === 'mr-ai-review')` branch in global-keys.ts
- [x] 4.2 Implement the mr-ai-review confirm branch (set backend, build prompt, open overlay)
- [x] 4.3 Implement `buildMrReviewPrompt` helper in `mr-ai-utils.ts`

## 5. Actions — AI execution and comment posting

- [x] 5.1 Add `runMrAiReview()` action to `mr-actions.ts`
- [x] 5.2 Add `postMrAiComments()` action
- [x] 5.3 Wire `runMrAiReview()` into the keyboard handler (Enter in prompt mode)
- [x] 5.4 Wire `postMrAiComments()` into the keyboard handler (Enter after review complete)

## 6. UI — MrAiReviewOverlay component

- [x] 6.1 Create `MrAiReviewOverlay.tsx`
- [x] 6.2 Update header title to `✦ AI Review`
- [x] 6.3 Add `postingComments`, `commentsPosted`, `isGitLab` props
- [x] 6.4 Replace followup-input footer with post-comments section
- [x] 6.5 Show non-GitLab fallback note
- [x] 6.6 Export `MrAiReviewOverlay` from `@icon-tui/ui` index

## 7. UI — mount overlay in App / root component

- [x] 7.1 Import `MrAiReviewOverlay` in `modal-overlays.tsx`
- [x] 7.2 Add `<Show when={mrStore.mrAiVisible()}>` block with `MrAiReviewOverlay`
- [x] 7.3 Determine `isGitLab` from app source type and pass as prop

## 8. Help text update

- [x] 8.1 Update MR detail view help entry with `Shift+A → AI review`

## 9. Verification

- [x] 9.1 Manual smoke test: open a GitLab MR detail, press `Shift+A`, select a backend, verify default prompt contains MR title and file list, press Enter, verify overlay streams response, press Enter again, verify a comment appears in the MR with the attribution header
- [x] 9.2 Verify lowercase `a` still toggles approval (not accidentally intercepted by the new Shift+A branch)
- [x] 9.3 Verify Esc closes the overlay without navigating away from the MR detail view
- [x] 9.4 Verify that for a non-GitLab PR the "Post comments" action is hidden / disabled
