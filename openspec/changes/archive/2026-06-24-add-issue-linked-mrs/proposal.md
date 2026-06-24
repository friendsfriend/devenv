## Why

Issue descriptions often reference merge requests (e.g., "Fix in !342"). Users need to see which MRs are linked to an issue without context-switching to a browser. Adding a linked MRs sub-view completes the issue viewing experience and provides the cross-reference visibility that developers rely on in daily workflow.

## What Changes

- Add `GetIssueLinkedMRs()` method to `issues.Client` Go interface and all implementations
- Add new HTTP endpoint for fetching linked MRs for an issue (both GitHub and GitLab)
- Add `getIssueLinkedMRs()` to `issues-client.ts` (TUI API client)
- Add inline linked MRs summary panel to `IssueDetailView` (shows count + titles)
- Create `LinkedMRsView.tsx` — full-screen sub-view of linked MRs (mirrors ChangedFiles/Jobs pattern)
- Add new view mode `'linkedMRs'` and wire in content router
- Add keyboard handler: `M` from issue detail opens linked MRs sub-view
- Add store signals for linked MRs state (list, loading, error)

## Capabilities

### New Capabilities
- `issue-linked-mrs`: Ability to view merge requests linked to an issue, both as an inline summary in the issue detail and as a full-screen sub-view with keyboard navigation

### Modified Capabilities
- `issue-viewing`: The issue detail view now displays an inline linked MRs summary section. The spec gains requirements for this inline display and the linked MRs sub-view navigation.

## Impact

- **Server (Go)**: New method on `issues.Client` interface. New implementations in `github/` and `gitlab/`. New HTTP handler endpoints registered in `server.go`.
- **Client API (TypeScript)**: New function in `issues-client.ts`.
- **TUI (TypeScript)**: New `LinkedMRsView` component. Modified `IssueDetailView` (adds inline summary). New view mode. New keyboard handler. New store signals.
- **Types**: No new types needed — reuses existing `MergeRequest` type for linked MRs.
