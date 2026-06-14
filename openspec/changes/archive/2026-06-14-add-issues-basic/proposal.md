## Why

Users currently have no way to view GitHub Issues or GitLab Issues within the DevEnv TUI. They must context-switch to a browser to track bugs, feature requests, and assigned tasks. This makes the TUI less useful as a daily driver for development workflow. Adding issue viewing brings parity with the existing Merge Request feature and keeps users in the terminal.

## What Changes

- Add `Issue` type definitions to `@devenv/types` (shared across client and server)
- Add `issues.Client` Go interface in `server/pkg/issues/` (mirrors `mr.Client` pattern)
- Implement GitHub Issues client (`server/pkg/github/issues_client.go`)
- Implement GitLab Issues client (`server/pkg/gitlab/issues_client.go`)
- Register HTTP handlers for issue endpoints on both providers
- Add `issues-client.ts` to `packages/core/src/` (TUI API client layer)
- Create `issue-store.ts` with SolidJS signals for issue state management
- Create `issue-actions.ts` (load, paginate, navigate, scope selection)
- Create `IssueView.tsx` — issue list with table format (columns: #ID, Title, Author, State, Labels, Updated)
- Create `IssueDetailView.tsx` — single-column scroll detail view (metadata, description, comments)
- Add scope selector modal overlay with 4 scopes: All, Assigned to me, Created by me, No assignee
- Wire `ContentRouter` with new view modes: `'issues'`, `'issueDetail'`
- Add keyboard handling: `i` (scope modal → issue list), `I` (all issues), j/k navigation, Enter/ESC
- Register keyboard handlers in the chain-of-responsibility dispatcher
- Extend `ViewMode` type and `KeyboardStores`/`KeyboardActions` types

## Capabilities

### New Capabilities
- `issue-viewing`: Ability to browse and read issues from GitHub/GitLab providers within the TUI, including list view with pagination and detail view with comments

### Modified Capabilities

- *(none — this is a net-new feature)*

## Impact

- **Server (Go)**: New `server/pkg/issues/` package with client interface. New implementations in `github/` and `gitlab/`. New HTTP handlers in `server/pkg/server/handlers_issues.go`. New routes registered in `server.go`.
- **Client API (TypeScript)**: New `packages/core/src/issues-client.ts`. Extended `createClient()` factory.
- **TUI (TypeScript)**: New store, actions, and 2 components. New view modes. New keyboard handlers. Modified `app-store.ts` (ViewMode enum), `app-opentui.tsx` (store/action wiring), `content-router.tsx` (new view cases), `keyboard/index.ts` (exports).
- **Types**: New `Issue` type and related types in `@devenv/types`.
- **Dependencies**: None. Pure additive.
