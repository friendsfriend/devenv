## Context

`IssueView` and `MergeRequestView` render one-line table rows inside `ScrollableList`. `DiscussionsView` already shows the preferred direction: selectable, full-width list items with stronger hierarchy and selected background. Navigation is parent-owned, so this change must stay presentational.

## Goals / Non-Goals

**Goals:**
- Replace issue and merge request table rows with selectable card-style list items.
- Preserve existing search header behavior, pagination indicators, loading/error/empty states, and selection index handling.
- Keep cards fixed-height so `ScrollableList` can keep its existing viewport math.
- Reuse existing colors and formatting utilities.

**Non-Goals:**
- No keyboard shortcut changes.
- No API, store, provider, pagination, sorting, filtering, or search behavior changes.
- No variable-height wrapping cards in this change.
- No new dependency.

## Decisions

- Use fixed-height cards inside existing `ScrollableList`.
  - Rationale: smallest change; avoids duplicating custom viewport/window logic from `DiscussionsView`.
  - Alternative considered: copy `DiscussionsView` manual visible-window calculation. Rejected because current list abstraction already fits constant-height cards.

- Convert table headers into compact summary headers.
  - Rationale: card layout no longer needs column labels; header should keep page/count/scope information visible.
  - Alternative considered: keep table column header above cards. Rejected because it visually conflicts with card layout.

- Truncate long titles and metadata rather than wrapping.
  - Rationale: fixed item height keeps scroll behavior predictable.
  - Alternative considered: dynamic heights. Rejected for now because `ScrollableList` uses estimated item height and current table rows are constant height.

- Add a small shared card component only if implementation would otherwise duplicate issue/MR layout.
  - Rationale: issue and MR cards share marker/title/status/meta/selection structure but differ in status details.
  - Alternative considered: inline both cards. Acceptable if duplication remains minimal, but shared component is preferred when it reduces code.

## Risks / Trade-offs

- Less data visible per screen → cards should stay compact at three lines.
- Long labels, titles, or pipeline statuses may truncate → use existing `truncateText` patterns.
- Terminal width variance may expose layout issues → keep width-based sections minimal and favor full-width rows with right-aligned status only where safe.
