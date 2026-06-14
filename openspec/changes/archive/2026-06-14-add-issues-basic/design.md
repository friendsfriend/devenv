## Context

DevEnv TUI already supports Merge Request viewing with a proven architecture: Go server abstractions (`mr.Client` interface with GitHub/GitLab implementations), TypeScript client API, SolidJS stores, UI components, and keyboard-driven navigation. Issues follow the same provider-agnostic pattern but are simpler — no pipeline, test results, or approval concepts.

## Goals / Non-Goals

**Goals:**
- Add issue viewing (list + detail + comments) for GitHub Issues and GitLab Issues
- Match the MR feature's navigation ergonomics and visual style
- Unify GitHub and GitLab behind a single `issues.Client` interface
- Support 4 scope filters: All, Assigned to me, Created by me, No assignee
- Pagination and server-side search on the issue list

**Non-Goals:**
- Issue creation, editing, closing, or state changes (future change)
- Label/milestone management (future change)
- Linked MRs sub-view (future change)
- Bulk operations or multi-select

## Decisions

### 1. New `issues.Client` interface (mirrors `mr.Client`)

**Decision**: Create a new Go interface `issues.Client` in `server/pkg/issues/client.go` with methods `GetIssues`, `GetIssue`, `GetIssueComments`. Both `github.Client` and `gitlab.Client` gain implementations.

**Rationale**: Issues have a different semantic shape than merge requests — no pipeline, no approvals, no merge status. Adding issue methods to `mr.Client` would violate interface segregation and confuse the abstraction. A dedicated interface keeps each domain clean.

**Alternatives considered**: Add to `mr.Client` — rejected because the return types and behavior differ enough that callers would always need conditional logic.

### 2. Generic issue type shared across providers

**Decision**: Define a canonical `Issue` struct in `server/pkg/issues/types.go` that both GitHub and GitLab implementations populate. JSON tags match what the TUI expects, similar to how `github.MergeRequest` mirrors `gitlab.MergeRequest`.

**Rationale**: The TUI should receive a unified shape regardless of provider. This pattern already works well for merge requests.

### 3. Separate `issueStore` (not shared with `mrStore`)

**Decision**: New `issue-store.ts` with its own signals, scoped state, and zero coupling to MR state.

**Rationale**: Issues and MRs are independent domains. Shared state would create subtle bugs (e.g., pagination state collision, loading spinners interfering).

### 4. Scope selector as modal overlay

**Decision**: Pressing `i` opens a modal overlay (reusing the generic modal pattern from branch selector / profile picker) with 4 options. Selecting one loads the issue list with the scope param. `I` (Shift+I) bypasses the modal and loads all issues immediately.

**Rationale**: Modal overlays are an established UX pattern in the TUI. The MR feature doesn't have this because MRs naturally scoped by branch — issues need an explicit scope picker since they're repo-wide.

### 5. Single-column scroll detail layout

**Decision**: Issue detail is one scrollable column: title → metadata → description → comments. No left/right split like MR detail.

**Rationale**: Issues have less structured data than MRs (no pipeline stages, no changed files grid). A single column matches the GitHub/GitLab web UX and is simpler to implement. The metadata panel (author, labels, assignee, dates) is compact enough to render inline.

### 6. Go server: separate handler file

**Decision**: New `server/pkg/server/handlers_issues.go` for all issue endpoints. Routes follow the pattern `/api/github/issues`, `/api/github/issues/{n}`, `/api/github/issues/{n}/comments` (and `/api/gitlab/...` equivalents).

**Rationale**: Keeps handler files focused. `handlers_github.go` is already 400+ lines — adding issues there would bloat it.

### 7. TUI client: `issues-client.ts`

**Decision**: New file `packages/core/src/issues-client.ts` with `getIssues()`, `getIssue()`, `getIssueComments()`. Wired into `createClient()`.

**Rationale**: Mirrors `mr-client.ts` structure. Each client file should cover one domain.

## Risks / Trade-offs

- **[Risk] Scope filter parity across providers**: GitHub Issues API supports `filter=assigned|created|requested|repos` and `state=open|closed`. GitLab Issues API supports `scope=all|assigned-to-me|created-by-me` + `state=opened|closed`. The 4-scope set (All, Assigned to me, Created by me, No assignee) maps cleanly to both, but `No assignee` requires checking the API response on GitLab (no query param for unassigned). **Mitigation**: Client-side filter as fallback for `No assignee` on providers that don't support it natively.

- **[Risk] API rate limits**: Both GitHub and GitLab have per-hour rate limits. Issue lists with comments could trigger multiple API calls per issue. **Mitigation**: Fetch comments only on demand (issue detail view), not during list load. Use `SkipDetails`-style optimization like MRs do for list endpoints.

- **[Risk] Comment format**: Comments come as Markdown. The TUI renders plain text (OpenTUI has no Markdown renderer). **Mitigation**: Use the existing `htmlToText` utility (used for MR descriptions) to strip or basic-render Markdown.

- **[Trade-off] Pagination consistency**: GitHub uses Link headers for pagination; GitLab uses JSON response fields. The MR feature already handles this dual approach — reuse same strategy for issues.

## Open Questions

- None resolved during design. Implementation will surface any edge cases.
