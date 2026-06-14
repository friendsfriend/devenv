## 1. Go Client Types

- [x] 1.1 Add `MRListOptions` struct with SourceBranch, TargetBranch, State, Page, PerPage, Search, SkipDetails fields to `pkg/mr/client.go`
- [x] 1.2 Add `MRListResult` struct with MergeRequests, TotalCount, TotalPages, CurrentPage, PerPage fields to `pkg/mr/client.go`
- [x] 1.3 Update `Client.GetMRs` interface signature from `(info, sourceBranch, targetBranch) ([]MergeRequest, error)` to `(info, *MRListOptions) (*MRListResult, error)`
- [x] 1.4 Update all callers of `GetMRs` (HTTP handlers, tests) to match the new signature

## 2. GitLab Client Implementation

- [x] 2.1 Update `GetMergeRequests` (and `MRClient.GetMRs` adapter) signature to accept `*MRListOptions` and return `*MRListResult`
- [x] 2.2 Add `page`, `per_page`, `search` query params to the GitLab API request URL based on options
- [x] 2.3 Parse `X-Total`, `X-Total-Pages`, `X-Page` headers from GitLab API response for pagination metadata
- [x] 2.4 Handle missing pagination headers (GitLab omits above 10,000 items) — set `TotalCount: -1`, `TotalPages: -1`
- [x] 2.5 Implement `SkipDetails` mode: when true, skip per-MR `GetMergeRequest` and `GetMRApprovals` calls; when false, keep current N+1 behavior for backward compat
- [x] 2.6 Update `MRClient.GetMRs` adapter in `pkg/gitlab/client.go` to convert `MRListResult`

## 3. GitHub Client Implementation

- [x] 3.1 Update `GetMRs` signature to accept `*MRListOptions` and return `*MRListResult`
- [x] 3.2 Add `page`, `per_page` query params to the GitHub API request URL based on options
- [x] 3.3 Parse `Link` header from GitHub API response using regex to extract next/prev/last page URLs and page numbers
- [x] 3.4 GitHub does not provide `X-Total` — always return `TotalCount: -1`, `TotalPages: -1`; detect last page by absence of `rel="next"` in Link header
- [x] 3.5 Implement `SkipDetails` mode: when true, skip per-PR approval and workflow-run fetches; when false, keep current behavior
- [x] 3.6 Update tests in `pkg/github/client_test.go`

## 4. HTTP API Layer

- [x] 4.1 Update `handleGitLabMergeRequests` in `handlers_gitlab.go`:
    - Parse `page` (int, default 1) and `perPage` (int, default 50) query params
    - Parse `search` query param if present
    - Call `GetMRs` with `SkipDetails: true` (list view) and `SkipDetails: false` only when page params absent (backward compat)
    - Return `{ items, totalCount, totalPages, currentPage, perPage }` JSON object
- [x] 4.2 Update `handleGitHubPullRequests` in `handlers_github.go` with same changes
- [x] 4.3 Update app-detail MR loading and other callers of the old flat response shape in server handlers

## 5. TUI Types

- [x] 5.1 Add `MRListResult` interface to `tui/packages/types/src/index.ts` with `items: MergeRequest[]`, `totalCount`, `totalPages`, `currentPage`, `perPage`
- [x] 5.2 Update `MergeRequest` type if needed for partial data (optional `head_pipeline`, optional `approvals`)

## 6. TUI Client

- [x] 6.1 Update `getMergeRequests` in `mr-client.ts`:
    - Accept optional `page` (default 1) and `perPage` (default 50) parameters
    - Return `MRListResult` instead of `MergeRequest[]`
    - Pass `page`/`perPage` as query params to the server
- [x] 6.2 Update all callers of `getMergeRequests` (`mr-actions.ts`, `app-actions.ts`) to handle the new return type

## 7. TUI Store

- [x] 7.1 Add pagination state signals to `mr-store.ts`: `currentPage` (default 1), `totalPages` (default 0), `totalCount` (default 0), `perPage` (default 50)
- [x] 7.2 Expose these signals in the store's return object

## 8. TUI Actions

- [x] 8.1 Add `nextPage` action in `mr-actions.ts`: increments `currentPage`, calls `getMergeRequests` with new page, updates store
- [x] 8.2 Add `prevPage` action: decrements `currentPage`, fetches previous page
- [x] 8.3 Update `loadAllMergeRequests` to initialize pagination state from `MRListResult`
- [x] 8.4 Update `loadMergeRequestForCurrentBranch` similarly
- [x] 8.5 Update the approval toggle and rebase actions to re-fetch with current page state

## 9. TUI Views

- [x] 9.1 Update `MergeRequestView.tsx` header to show page indicator: `[Pg 3/9]` when totalPages known, `[Pg 3]` when unknown
- [x] 9.2 Wire `[` and `]` key handlers to `prevPage` and `nextPage` actions in the parent keyboard handler
- [x] 9.3 Ensure page nav keys are disabled (no-op) at boundaries (page 1, last page)
- [x] 9.4 Verify loading state shows during page transitions

## 10. Tests

- [x] 10.1 Verify GitLab client handles pagination headers correctly (unit test with mock response)
- [x] 10.2 Verify GitHub client parses Link header correctly (unit test with mock response)
- [x] 10.3 Verify `SkipDetails` mode skips per-MR fetches (unit test)
- [x] 10.4 Verify TUI pagination state transitions (page nav, boundary conditions)
