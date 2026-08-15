## 1. Test Utilities

- [ ] 1.1 Add shared Solid/OpenTUI render test helper with automatic renderer cleanup.
- [ ] 1.2 Add helper wrappers for `renderOnce`, `flush`, `waitForFrame`, `waitForVisualIdle`, and `captureCharFrame`.
- [ ] 1.3 Add styled span assertion helpers around `captureSpans()` for semantic style checks.
- [ ] 1.4 Add input/resize helper utilities for `mockInput`, `mockMouse`, and terminal resize scenarios.

## 2. Shared Chrome Coverage

- [ ] 2.1 Convert lifecycle splash rendering tests to the shared helper.
- [ ] 2.2 Add renderer-backed tests for `SearchHeader` idle/search/result states.
- [ ] 2.3 Add renderer-backed tests for `FilterStatusBar` empty/filter/sort/combined states.
- [ ] 2.4 Add renderer-backed tests for representative `GenericModal` usage with title, body, and footer content.

## 3. Semantic Styling Coverage

- [ ] 3.1 Add span-based tests for `HighlightedText` semantic highlight output.
- [ ] 3.2 Add span-based tests for `Badge` semantic status output.
- [ ] 3.3 Add span-based tests for lifecycle splash current/done/pending/failed row styling.
- [ ] 3.4 Ensure tests avoid hardcoded palette hex values unless intentionally testing theme conversion.

## 4. Interaction Coverage

- [ ] 4.1 Add renderer/keymap input simulation test for `q` confirmed quit starting graceful shutdown exactly once.
- [ ] 4.2 Add renderer/keymap input simulation test for `Ctrl+C` confirmed quit when no selection exists.
- [ ] 4.3 Add modal priority input test proving modal action wins over underlying view action.
- [ ] 4.4 Add representative list-control input tests for `/`, `F`, and `O` where supported.

## 5. Responsive Layout Coverage

- [ ] 5.1 Add narrow/wide render tests for lifecycle splash and modal chrome.
- [ ] 5.2 Add narrow/wide render tests for a representative table/list view.
- [ ] 5.3 Add resize test proving a rendered view settles and updates frame output after terminal dimensions change.
- [ ] 5.4 Add wrapped markdown or scrollbox content test for usable viewport width handling.

## 6. Coverage Checklist

- [ ] 6.1 Document required test categories for new TUI features: logic, render, style, input, resize, and cleanup.
- [ ] 6.2 Document when to use pure tests versus OpenTUI memory renderer tests.
- [ ] 6.3 Document renderer cleanup requirements and common orphan text pitfalls.

## 7. Verification

- [ ] 7.1 Run `cd tui && bun test`.
- [ ] 7.2 Run `cd tui && bun run type-check`.
- [ ] 7.3 Run full project test suite and check pi-lens issues before finishing implementation.
