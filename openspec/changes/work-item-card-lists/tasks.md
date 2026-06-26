## 1. Shared Card Layout

- [x] 1.1 Inspect existing `ScrollableList`, `SearchHeader`, and card-like `DiscussionsView` styling before editing.
- [x] 1.2 Add a small presentational work item card component if it reduces duplicated issue/MR markup.
- [x] 1.3 Ensure the card component accepts marker, title, status text/color, metadata, optional prefix, and selected state without keyboard handling.

## 2. Issue List Cards

- [x] 2.1 Replace `IssueView` table column header content with a compact summary header that keeps search/page/loaded/scope indicators.
- [x] 2.2 Render issues as fixed-height selectable cards inside existing `ScrollableList`.
- [x] 2.3 Preserve issue IID, title, author, state color, labels, updated date, loading/error/empty states, and parent-owned selection.

## 3. Merge Request List Cards

- [x] 3.1 Replace `MergeRequestView` table column header content with a compact summary header that keeps search/page/loaded indicators.
- [x] 3.2 Render merge requests as fixed-height selectable cards inside existing `ScrollableList`.
- [x] 3.3 Preserve MR IID, mergeability indicator, title, author, state color, pipeline status color, updated date, loading/error/empty states, and parent-owned selection.

## 4. Validation

- [x] 4.1 Run formatting/type checks for the TUI package.
- [x] 4.2 Run the full test suite.
- [x] 4.3 Check pi-lens issues if available.
