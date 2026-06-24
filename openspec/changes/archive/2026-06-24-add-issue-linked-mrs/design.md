## Context

The base `add-issues-basic` change adds issue list and detail viewing. Issues often reference merge requests in their descriptions (e.g., "See !342") or are linked via GitLab's "linked issues" feature / GitHub's "closing references." This change adds visibility into those cross-references directly in the TUI.

GitLab has a dedicated API endpoint for listing merge requests that close an issue (`GET /projects/{id}/issues/{iid}/closed_by`). GitHub has no equivalent — MRs linked to issues are found by searching closing references in commit messages and PR bodies. Both approaches converge into a unified `MergeRequest[]` response.

## Goals / Non-Goals

**Goals:**
- Display linked MRs inline in issue detail (compact summary with count + titles)
- Provide a full-screen `LinkedMRsView` sub-view (key `M`), matching the C/J/T/D sub-view pattern from MR detail
- Support both GitHub and GitLab

**Non-Goals:**
- Creating or modifying issue-MR links
- Bidirectional linking (viewing issues from MR detail)
- Editing or removing links

## Decisions

### 1. Inline summary + sub-view pattern

**Decision**: Issue detail shows a compact "Linked MRs" section at the bottom: count badge + first 3 titles with a "View all N →" cue. Pressing `M` opens the full `LinkedMRsView` sub-view showing all linked MRs in a table format.

**Rationale**: Matches the existing MR detail → sub-view pattern (C=ChangedFiles, J=Jobs, T=TestResults, D=Discussions). The inline summary gives immediate awareness without navigation. The sub-view provides full detail.

### 2. GitLab: use `closed_by` API endpoint

**Decision**: GitLab's `GET /projects/{id}/issues/{iid}/closed_by` endpoint returns merge requests that close the issue. This is the canonical way to find linked MRs on GitLab.

**Rationale**: Official API. Returns full MR objects including status, pipeline info, and merge status.

### 3. GitHub: parse issue body for closing references

**Decision**: Parse the issue description for GitHub closing keyword patterns (e.g., "closes #123", "fixes org/repo#123", "resolves GH-123") and referenced PR numbers. For each match, fetch the PR details via the existing `GetPullRequest` method.

**Rationale**: GitHub has no dedicated API for issue-to-PR links. Closing references in issue bodies are the most reliable source. The existing PR fetching infrastructure is reused.

**Alternatives considered**: GitHub GraphQL API has `closingIssuesReferences` — rejected because the codebase uses REST consistently and introducing GraphQL adds complexity for this single feature.

### 4. Reuse `MergeRequest` type directly

**Decision**: Linked MRs use the existing `MergeRequest` type and `MergeRequestView` component. No new types needed.

**Rationale**: The data IS merge requests. Reusing the existing types and components avoids duplication and ensures consistent rendering.

### 5. Data fetching: parallel with issue detail load

**Decision**: Linked MRs are fetched asynchronously alongside comments when the issue detail loads. The inline summary appears when data arrives; a loading spinner shows while fetching.

**Rationale**: The inline summary is part of the detail view. Fetching it in parallel with comments minimizes perceived latency.

## Risks / Trade-offs

- **[Risk] GitHub reference parsing is heuristic**: Closing reference formats vary widely. Some repos use custom conventions. **Mitigation**: Support the standard GitHub closing keyword patterns (`closes`, `fixes`, `resolves`, `closed by`, etc.) plus `GH-{n}`. Document the limitation in the UI (show a note if parsing found zero linked MRs but an issue description mentions PR-like patterns).

- **[Risk] GitLab `closed_by` only returns MRs that close the issue**: Not all linked MRs are closers — some just reference the issue. **Mitigation**: Also check the issue description for `!{n}` patterns and include those MRs. Accept that the set won't be 100% complete on either provider.

- **[Trade-off] Extra API call on detail load**: Fetching linked MRs adds one more API call per issue detail view. **Mitigation**: Fetch is async and independent — it doesn't block the detail rendering. The inline panel shows a loading state while resolving.

## Open Questions

- None.
