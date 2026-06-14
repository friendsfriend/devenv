## Context

The current MR list feature loads up to 100 merge requests with a hardcoded `per_page=100` and no support for navigating additional pages. Worse, both the GitLab and GitHub clients perform N+1 API calls per page — one list call plus two detail calls per MR (head pipeline + approvals for GitLab; approvals + workflow runs for GitHub). This means loading 100 MRs requires ~201 API calls, taking 5–10 seconds on repositories with many MRs, and cannot show more than 100 results at all.

Both providers support standard page-based pagination:
- **GitLab**: `page` + `per_page` query params, `X-Total`/`X-Total-Pages`/`X-Page` response headers
- **GitHub**: `page` + `per_page` query params, `Link` header with `rel="next"`/`rel="last"`/`rel="prev"`
- Neither returns `head_pipeline` or approval info in their list endpoints — these require per-item API calls

## Goals / Non-Goals

**Goals:**
- Allow users to browse all open MRs in a repository via paginated pages
- Eliminate the N+1 performance problem for the MR list view (the most common operation)
- Support the same pagination UX for both GitLab and GitHub providers
- Keep page navigation simple and keyboard-driven (terminal UI)

**Non-Goals:**
- Infinite scroll — page-based navigation is simpler and maps directly to API structure
- Server-side search — the TUI already does client-side filtering; server-side search is a future enhancement
- Paginating MR changes, discussions, or pipelines — those are scoped to a single MR and typically small
- Changing the single-MR detail view behavior — approvals and pipeline info are still fetched when viewing a specific MR

## Decisions

### Decision: `MRListOptions` / `MRListResult` types replace flat `GetMRs` signature

**Why:** The current `GetMRs(info, sourceBranch, targetBranch) ([]MergeRequest, error)` cannot express page number, page size, or return pagination metadata. Bundling all optional parameters into a struct makes the interface extensible without further signature changes.

```go
type MRListOptions struct {
    SourceBranch string
    TargetBranch string
    State        string   // "opened", "merged", "closed", "all"
    Page         int      // 1-based, 0 = default (page 1)
    PerPage      int      // max 100, 0 = provider default
    Search       string   // GitLab only
    SkipDetails  bool     // skip per-MR detail/approval/pipeline fetches
}

type MRListResult struct {
    MergeRequests []MergeRequest
    TotalCount    int   // -1 if unknown (GitHub)
    TotalPages    int   // -1 if unknown
    CurrentPage   int
    PerPage       int
}
```

### Decision: `SkipDetails=true` by default for list view

**Why:** The N+1 pattern is the main performance bottleneck. For the MR list, users primarily need title, author, state, timestamps, and merge status — all available from the list endpoint. Pipeline status and approvals are fetched lazily when the user opens a specific MR.

| Mode | GitLab API calls | GitHub API calls |
|------|-----------------|-----------------|
| `SkipDetails=false` (old behavior) | 1 + 2N | 1 + 2N |
| `SkipDetails=true` (new default for list) | 1 | 1 |

Trade-off: The pipeline status column in the MR list table will show "-" instead of the actual status. This is acceptable — the status is available in the MR detail view and in the app's pipeline view.

### Decision: Page-based pagination (not cursor/keyset)

**Why:** Both GitLab and GitHub support simple `page`/`per_page` pagination. GitLab also offers keyset pagination, but page-based is simpler, sufficient for this use case, and works identically across both providers.

### Decision: GitLab parses `X-Total`/`X-Total-Pages` headers; GitHub parses `Link` header

**GitLab:** Headers `X-Total`, `X-Total-Pages`, `X-Page`, `X-Next-Page`, `X-Prev-Page` are available. Note: GitLab omits these when total exceeds 10,000 items; we fall back to `TotalPages: -1` in that case.

**GitHub:** Only `Link` header with `rel="next"`/`rel="last"`/`rel="prev"` is available. We extract the next page number from the `Link` URL. No `X-Total` means `TotalCount: -1` and `TotalPages: -1`. We detect the last page by checking for absence of `rel="next"`.

### Decision: HTTP API returns wrapped response, not bare array

**Why:** The pagination metadata (totalCount, totalPages, currentPage, perPage) must be communicated alongside the items. A JSON envelope is the standard approach.

```json
// Before
[{...}, {...}]

// After
{
    "items": [{...}, {...}],
    "totalCount": 423,
    "totalPages": 9,
    "currentPage": 1,
    "perPage": 50
}
```

### Decision: `[` / `]` keys for page navigation in TUI

**Why:** The MR list view already uses up/down for item selection and Enter for detail. `[` and `]` are intuitive (previous/next) and don't conflict with existing bindings. A "Pg N of M" indicator is shown in the table header.

## Risks / Trade-offs

- **[Risk] GitHub has no `X-Total` header** → We cannot show "Page 3 of 9" on GitHub; we show "Page 3" without a total. Mitigation: We detect the last page by checking `Link` header for absence of `rel="next"`, so users can still navigate to the last page.
- **[Risk] GitLab omits pagination headers above 10,000 items** → Fall back to `TotalPages: -1`, show "Page N" without total.
- **[Trade-off] SkipDetails hides pipeline status in list** → The pipeline column shows "-" for MRs where `head_pipeline` is nil. The pipeline status is always available in the MR detail view. This is a deliberate trade-off to eliminate the N+1.
- **[Risk] Breaking interface change** → The `mr.Client` interface change breaks all implementations. Since `gitlab.Client` and `github.Client` are the only implementations (used internally), this is a clean single-codebase change with no external consumers.
