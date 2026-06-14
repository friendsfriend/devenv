## Why

Loading merge requests for repositories with hundreds or thousands of MRs is unusably slow. The GitLab and GitHub clients both hardcode `per_page=100` without reading additional pages, and worse, they perform N+1 API calls (one list call + two detail calls per MR) — resulting in ~201 API requests for a single "page" of 100 MRs. This makes the MR list view take 5–10 seconds for repositories with many MRs, and it cannot show more than the first 100 results at all.

## What Changes

- **BREAKING**: `mr.Client.GetMRs()` signature changes to accept explicit pagination options (`MRListOptions`) and return pagination metadata (`MRListResult`) instead of a flat slice.
- **BREAKING**: HTTP handlers for `/api/gitlab/merge-requests` and `/api/github/pull-requests` change their response format from a bare `[]MergeRequest` JSON array to a wrapped `{ items, totalCount, totalPages, currentPage, perPage }` object.
- **BREAKING**: TUI `getMergeRequests()` client function returns a paginated result instead of a flat array.
- GitLab client reads `page`/`per_page` query parameters and `X-Total`/`X-Total-Pages` response headers.
- GitHub client reads `page`/`per_page` query parameters and `Link` header for pagination.
- `SkipDetails` option skips per-MR detail/approval/pipeline fetches for the list view, reducing ~201 API calls to just 1 per page.
- TUI MR store adds pagination state signals (`currentPage`, `totalPages`, `totalCount`).
- TUI MR list view shows "Page N of M" indicator and supports `[` / `]` keyboard navigation.

## Capabilities

### New Capabilities
- `mr-list-pagination`: Paginated browsing of merge requests/pull requests across GitLab and GitHub providers, with page indicators and keyboard navigation.

### Modified Capabilities
<!-- No existing capability changes — the pagination capability is entirely new. -->

## Impact

- `server/pkg/mr/client.go` — interface change: `GetMRs` signature updated, new types `MRListOptions` and `MRListResult` added
- `server/pkg/gitlab/client.go` — GitLab implementation updated to paginate, parse headers, support `SkipDetails`
- `server/pkg/github/client.go` — GitHub implementation updated to paginate, parse Link headers, support `SkipDetails`
- `server/pkg/server/handlers_gitlab.go` — HTTP handler returns paginated response, accepts page/perPage params
- `server/pkg/server/handlers_github.go` — same for GitHub
- `tui/packages/core/src/mr-client.ts` — client function returns paginated result
- `tui/packages/cli/src/tui/stores/mr-store.ts` — new pagination state signals
- `tui/packages/cli/src/tui/actions/mr-actions.ts` — page navigation actions
- `tui/packages/ui/src/components/MergeRequestView.tsx` — page indicator display
- `tui/packages/types/src/index.ts` — new `MRListResult` type
