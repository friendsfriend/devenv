## Why

Issue and merge request lists currently use dense table rows that make the TUI feel dated and harder to scan. Card-style selectable list items can surface the same metadata with clearer hierarchy and align these views with the discussion list style.

## What Changes

- Replace classic table-row presentation in `IssueView` with fixed-height selectable issue cards.
- Replace classic table-row presentation in `MergeRequestView` with fixed-height selectable merge request cards.
- Preserve existing loading, error, empty, search, pagination, and parent-owned keyboard behavior.
- Reuse existing list infrastructure and shared formatting utilities; introduce only the smallest shared card component if it avoids duplicate issue/MR markup.

## Capabilities

### New Capabilities
- `work-item-card-lists`: Card-style selectable list presentation for issue and merge request list views.

### Modified Capabilities
- `frontend-reusable-components`: Add a reusable presentational work item card only if needed to share duplicated issue/MR list layout.

## Impact

- Affects `tui/packages/ui/src/components/IssueView.tsx`.
- Affects `tui/packages/ui/src/components/MergeRequestView.tsx`.
- May add a small shared TUI component under `tui/packages/ui/src/components/`.
- No API, data model, dependency, or keyboard shortcut changes.
