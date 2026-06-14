# mr-list-pagination Specification

## Purpose
TBD - created by archiving change add-mr-pagination. Update Purpose after archive.
## Requirements
### Requirement: Paginated MR list API
The system SHALL provide a paginated merge request list endpoint for both GitLab and GitHub providers.

#### Scenario: Request first page with default page size
- **WHEN** a client requests `/api/gitlab/merge-requests?appIdent=myapp&state=opened&allBranches=true` without explicit `page` or `perPage` parameters
- **THEN** the server SHALL return the first page (page 1) with the default page size (50 items)
- **AND** the response SHALL be a JSON object with `items`, `totalCount`, `totalPages`, `currentPage`, and `perPage` fields
- **AND** `items` SHALL contain up to 50 merge requests

#### Scenario: Request specific page and page size
- **WHEN** a client requests `/api/gitlab/merge-requests?appIdent=myapp&page=3&perPage=20&state=opened`
- **THEN** the server SHALL pass `page=3` and `per_page=20` to the GitLab API
- **AND** return the corresponding 20 merge requests in `items`

#### Scenario: GitHub pagination via Link header
- **WHEN** a client requests `/api/github/pull-requests?appIdent=myapp&page=2&perPage=50`
- **THEN** the server SHALL parse the GitHub API's `Link` response header to determine pagination state
- **AND** return `totalCount: -1` and `totalPages: -1` since GitHub does not provide total counts

#### Scenario: Last page detection on GitHub
- **WHEN** the GitHub API response `Link` header does not contain `rel="next"`
- **THEN** the server SHALL infer this is the last page
- **AND** the response SHOULD indicate this (e.g., via `totalPages` matching `currentPage` when known, or by total items in the page being less than `perPage`)

#### Scenario: GitLab total exceeds 10,000 items
- **WHEN** the GitLab API response omits `X-Total` and `X-Total-Pages` headers (GitLab behavior above 10,000 items)
- **THEN** the server SHALL return `totalCount: -1` and `totalPages: -1`
- **AND** the client SHALL still function correctly for page navigation

### Requirement: Skip details mode for MR list
The system SHALL support a `SkipDetails` mode that omits per-MR detail fetches for the list view.

#### Scenario: SkipDetails enabled returns list data only
- **WHEN** the server calls `GetMRs` with `SkipDetails: true`
- **THEN** the client SHALL NOT perform per-MR `GetMergeRequest` (GitLab) or approval/workflow-run fetches
- **AND** `head_pipeline` and `approvals` fields in returned `MergeRequest` objects MAY be nil

#### Scenario: SkipDetails disabled fetches full details (backward compatibility)
- **WHEN** the server calls `GetMRs` with `SkipDetails: false`
- **THEN** the client SHALL perform per-MR detail fetches (head pipeline for GitLab; approvals and workflow runs for GitLab and GitHub) matching the current behavior
- **AND** `head_pipeline` and `approvals` SHALL be populated when available

### Requirement: TUI pagination state and navigation
The TUI SHALL expose pagination state and navigation actions for the MR list.

#### Scenario: Pagination state initialized on MR list load
- **WHEN** the user opens the MR list view
- **THEN** the MR store SHALL contain reactive signals for `currentPage`, `totalPages`, and `totalCount`
- **AND** `currentPage` SHALL be initialized to 1

#### Scenario: User navigates to next page
- **WHEN** the user presses `]` while viewing the MR list
- **AND** there is a next page available
- **THEN** the TUI SHALL fetch the next page from the server
- **AND** display the corresponding merge requests
- **AND** update the `currentPage` signal
- **AND** update the page indicator in the UI header

#### Scenario: User navigates to previous page
- **WHEN** the user presses `[` while viewing the MR list
- **AND** there is a previous page available (`currentPage > 1`)
- **THEN** the TUI SHALL fetch the previous page from the server
- **AND** display the corresponding merge requests
- **AND** update `currentPage`

#### Scenario: Page indicator shown
- **WHEN** the MR list displays paginated data
- **THEN** the header row SHALL show a page indicator (e.g., `[Pg 3/9]` when total pages known, or `[Pg 3]` when unknown)

#### Scenario: Page navigation disabled at boundaries
- **WHEN** the user is on page 1
- **THEN** pressing `[` SHALL have no effect
- **WHEN** the user is on the last page
- **THEN** pressing `]` SHALL have no effect

### Requirement: Loading state during page navigation
The TUI SHALL show a loading state while fetching a new page.

#### Scenario: Loading indicator during page fetch
- **WHEN** the user navigates to a different page
- **THEN** the MR store SHALL set `mrLoading` to `true`
- **AND** the MR list view SHALL show a loading indicator
- **WHEN** the page data is received
- **THEN** `mrLoading` SHALL be set to `false`
- **AND** the loaded MRs SHALL replace the previous page's items

### Requirement: Client-side search scoped to current page
The TUI SHALL scope client-side text search to the currently loaded page.

#### Scenario: Search filters current page only
- **WHEN** the user types a search query in the MR list
- **THEN** the client-side filter SHALL apply only to merge requests currently loaded in the store
- **AND** the filtered count SHALL be shown (e.g., "3 results")
- **AND** server-side search SHALL NOT be used (deferred to future work)

### Requirement: MR detail view fetches full data on demand
When the user selects a specific MR from the paginated list, the system SHALL fetch the full details including pipeline and approval info.

#### Scenario: Pipeline status fetched on MR selection
- **WHEN** the user selects a merge request from the paginated list
- **AND** the MR's `head_pipeline` is nil (because `SkipDetails` was used)
- **THEN** the detail view SHALL load the head pipeline information via the existing pipeline loading mechanism
- **AND** it SHALL NOT require a separate per-MR API call if the head pipeline information can be derived from existing data

#### Scenario: Approvals fetched on MR selection
- **WHEN** the user opens the MR detail view
- **THEN** the existing per-MR approval loading SHALL occur as it does today
- **AND** the approvals endpoint SHALL be called for the selected MR only

