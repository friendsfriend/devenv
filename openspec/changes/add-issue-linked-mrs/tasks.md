## 1. Server — Extend issues.Client interface

- [ ] 1.1 Add `GetIssueLinkedMRs(appIdent string, issueIID int) ([]MergeRequest, error)` to `issues.Client` interface in `server/pkg/issues/client.go`

## 2. Server — GitHub linked MRs implementation

- [ ] 2.1 Create `server/pkg/github/issue_linked_mrs.go` with function to parse issue body for closing references (closes/fixes/resolves patterns, GH-{n} shorthand)
- [ ] 2.2 Implement `GetIssueLinkedMRs()` — parse issue description for references, fetch each referenced PR via `GetPullRequest()`, return unified `MergeRequest[]`
- [ ] 2.3 Add test for reference parsing with known patterns

## 3. Server — GitLab linked MRs implementation

- [ ] 3.1 Create `server/pkg/gitlab/issue_linked_mrs.go` with GitLab implementation
- [ ] 3.2 Implement `GetIssueLinkedMRs()` — call `GET /projects/{id}/issues/{iid}/closed_by` for closing MRs
- [ ] 3.3 Also parse issue description for `!{n}` references and fetch those MRs via existing MR client
- [ ] 3.4 Merge and deduplicate results from both sources

## 4. Server — HTTP handlers

- [ ] 4.1 Add `handleGitHubIssueLinkedMRs()` — GET `/api/github/issues/{n}/linked-mrs`
- [ ] 4.2 Add `handleGitLabIssueLinkedMRs()` — GET `/api/gitlab/issues/{n}/linked-mrs`
- [ ] 4.3 Register both new routes in `server.go`

## 5. Client API — Linked MRs

- [ ] 5.1 Add `getIssueLinkedMRs()` function to `tui/packages/core/src/issues-client.ts`
- [ ] 5.2 Wire into `createClient()` factory

## 6. TUI — Store additions

- [ ] 6.1 Add linked MRs signals to `issue-store.ts` (linkedMRs, linkedMRsLoading, linkedMRsError)
- [ ] 6.2 Add `selectedLinkedMRIndex` signal for sub-view navigation

## 7. TUI — Actions

- [ ] 7.1 Add `loadIssueLinkedMRs()` to `issue-actions.ts` — fetches linked MRs on detail load
- [ ] 7.2 Add `showLinkedMRsSubView()` — switches viewMode to `'linkedMRs'`
- [ ] 7.3 Add `backToIssueDetailFromLinkedMRs()` — returns from sub-view

## 8. TUI — UI Components

- [ ] 8.1 Add inline "Linked Merge Requests" summary panel to `IssueDetailView.tsx` (count badge, first 3 titles, "View all N →" link)
- [ ] 8.2 Create `tui/packages/ui/src/components/LinkedMRsView.tsx` — full-screen sub-view reusing `MergeRequestView` component
- [ ] 8.3 Wire loading/error/empty states for both inline and full-screen views

## 9. TUI — View mode and routing

- [ ] 9.1 Add `'linkedMRs'` to `ViewMode` union in `app-store.ts`
- [ ] 9.2 Wire `'linkedMRs'` in `content-router.tsx` — render `LinkedMRsView` when active

## 10. TUI — Keyboard handlers

- [ ] 10.1 Add `M` (Shift+M) to `issue-detail-keys.ts` — opens linked MRs sub-view
- [ ] 10.2 Create `tui/packages/cli/src/tui/keyboard/linked-mrs-keys.ts` — j/k navigation, Enter→MR detail (reuse existing MR machinery), ESC→back
- [ ] 10.3 Wire new handler in `app-opentui.tsx` chain and `keyboard/index.ts`

## 11. Integration and verification

- [ ] 11.1 Verify Go server compiles with new packages
- [ ] 11.2 Verify TUI compiles with new components
- [ ] 11.3 Manual: open issue detail, verify inline linked MRs summary renders correctly when linked MRs exist
- [ ] 11.4 Manual: press `M` from issue detail, verify full sub-view opens
- [ ] 11.5 Manual: test empty state (issue with no linked MRs)
- [ ] 11.6 Manual: test loading state (slow network)
- [ ] 11.7 Manual: test GitHub — issue body with "closes #123" references
- [ ] 11.8 Manual: test GitLab — issue with `closed_by` MRs
