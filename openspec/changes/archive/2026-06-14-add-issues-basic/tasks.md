## 1. Server — Issue types and interface

- [x] 1.1 Create `server/pkg/issues/client.go` with `Client` interface (`GetIssues`, `GetIssue`, `GetIssueComments`) and shared `MRListResult`-style types
- [x] 1.2 Create `server/pkg/issues/types.go` with canonical `Issue` struct (fields: id, iid, title, description, state, web_url, author, labels, assignees, milestone, created_at, updated_at) and `IssueListResult`
- [x] 1.3 Create `server/pkg/issues/comment_types.go` with `IssueComment` struct and `IssueCommentListResult`

## 2. Server — GitHub Issues implementation

- [x] 2.1 Create `server/pkg/github/issues_client.go` with GitHub implementation of `issues.Client`
- [x] 2.2 Implement `GetIssues()` — call `GET /repos/{owner}/{repo}/issues` with scope filter, pagination, and search params
- [x] 2.3 Implement `GetIssue()` — call `GET /repos/{owner}/{repo}/issues/{number}`
- [x] 2.4 Implement `GetIssueComments()` — call `GET /repos/{owner}/{repo}/issues/{number}/comments`

## 3. Server — GitLab Issues implementation

- [x] 3.1 Create `server/pkg/gitlab/issues_client.go` with GitLab implementation of `issues.Client`
- [x] 3.2 Implement `GetIssues()` — call `GET /projects/{id}/issues` with scope filter, pagination, and search params
- [x] 3.3 Implement `GetIssue()` — call `GET /projects/{id}/issues/{iid}`
- [x] 3.4 Implement `GetIssueComments()` — call `GET /projects/{id}/issues/{iid}/notes`

## 4. Server — HTTP handlers

- [x] 4.1 Create `server/pkg/server/handlers_issues.go` with handler functions for all issue endpoints
- [x] 4.2 Add `resolveGitHubIssueClient()` helper (mirrors `resolveGitHubMRClient`)
- [x] 4.3 Add `resolveGitLabIssueClient()` helper (mirrors `resolveGitLabMRClient`)
- [x] 4.4 Implement `handleGitHubIssues()` — GET `/api/github/issues`
- [x] 4.5 Implement `handleGitHubIssueDetail()` — GET `/api/github/issues/{n}`
- [x] 4.6 Implement `handleGitHubIssueComments()` — GET `/api/github/issues/{n}/comments`
- [x] 4.7 Implement `handleGitLabIssues()` — GET `/api/gitlab/issues`
- [x] 4.8 Implement `handleGitLabIssueDetail()` — GET `/api/gitlab/issues/{n}`
- [x] 4.9 Implement `handleGitLabIssueComments()` — GET `/api/gitlab/issues/{n}/comments`
- [x] 4.10 Register all 6 new routes in `server.go` mux

## 5. Types — Client-side type definitions

- [x] 5.1 Add `Issue` interface to `tui/packages/types/src/index.ts`
- [x] 5.2 Add `IssueListResult` interface for paginated response
- [x] 5.3 Add `IssueComment` interface
- [x] 5.4 Add `IssueScope` type (union of 'all' | 'assigned-to-me' | 'created-by-me' | 'no-assignee')

## 6. Client API — Issues client

- [x] 6.1 Create `tui/packages/core/src/issues-client.ts` with all issue API functions
- [x] 6.2 Wire `issuesClient` into `createClient()` factory in `tui/packages/core/src/index.ts`

## 7. TUI — Store

- [x] 7.1 Create `tui/packages/cli/src/tui/stores/issue-store.ts` with all signals (issues, loading, error, pagination, selection, search, detail state, comments)
- [x] 7.2 Wire `issueStore` into `app-opentui.tsx` alongside existing stores
- [x] 7.3 Add `IssueStore` type to `KeyboardStores` and `ViewStores`
- [x] 7.4 Add `IssueStore` to `keyboard/types.ts` and `views/types.ts`

## 8. TUI — Actions

- [x] 8.1 Create `tui/packages/cli/src/tui/actions/issue-actions.ts` with all action functions (loadAllIssues, showIssueDetail, nextPage, prevPage, backToIssueList, selectScope)
- [x] 8.2 Wire `issueActions` into `app-opentui.tsx` alongside existing actions
- [x] 8.3 Add `IssueActions` type to `KeyboardActions` and `ViewActions`
- [x] 8.4 Export `issue-actions` from `actions/index.ts`

## 9. TUI — UI Components

- [x] 9.1 Create `tui/packages/ui/src/components/IssueView.tsx` — issue list with table format, pagination indicator, search mode, empty/loading/error states
- [x] 9.2 Create `tui/packages/ui/src/components/IssueDetailView.tsx` — single-column scroll detail with metadata, description, threaded comments, loading/error states
- [x] 9.3 Create `tui/packages/ui/src/components/IssueScopeModal.tsx` — modal overlay with 4 scope options
- [x] 9.4 Export all new components from `tui/packages/ui/src/index.ts`

## 10. TUI — View modes and routing

- [x] 10.1 Add `'issues'` and `'issueDetail'` to `ViewMode` union in `app-store.ts`
- [x] 10.2 Add `'issueScopePicker'` to `ViewMode` union
- [x] 10.3 Wire new view modes in `content-router.tsx` — issue list, issue detail, scope picker
- [x] 10.4 Add keyboard handler for scope picker in `content-router.tsx` or separate handler

## 11. TUI — Keyboard handlers

- [x] 11.1 Add `'i'` and `'I'` to `table-keys.ts` — `i` opens scope modal, `I` loads all issues
- [x] 11.2 Create `tui/packages/cli/src/tui/keyboard/issue-list-keys.ts` — j/k/g/G navigation, Enter→detail, / search, [,] pagination, ESC→back
- [x] 11.3 Create `tui/packages/cli/src/tui/keyboard/issue-detail-keys.ts` — ESC→back to list, q→exit
- [x] 11.4 Wire new keyboard handlers in `app-opentui.tsx` keyboard chain
- [x] 11.5 Export new handlers from `keyboard/index.ts`

## 12. TUI — Status bar and header integration

- [x] 12.1 Update `StatusBar` helpers to show issue context (page info, scope label)
- [x] 12.2 Update `header-helpers.ts` to show issue view subtitle when in issue modes

## 13. Integration and verification

- [x] 13.1 Verify Go server compiles with new packages and handlers
- [x] 13.2 Verify TUI TypeScript compiles with new stores, components, and handlers
- [x] 13.3 Manual: open issue list for a GitHub app, verify list renders with all columns
- [x] 13.4 Manual: navigate to issue detail, verify metadata and comments display
- [x] 13.5 Manual: test scope filter modal — each scope returns correct results
- [x] 13.6 Manual: test pagination with [,] keys on a repo with 50+ issues
- [x] 13.7 Manual: test server-side search with '/' key
- [x] 13.8 Manual: test 'I' (Shift+I) shortcut bypasses scope modal
- [x] 13.9 Manual: repeat all tests with a GitLab provider
