## Why

Issue viewing (change 1) and linked MRs (change 2) make issues readable but not actionable. Users currently must switch to a browser to create, edit, close, or reassign issues. Adding full CRUD from the TUI — creation, editing, state changes, label management, and assignee changes — eliminates the need to leave the terminal for any issue workflow task.

## What Changes

- Add `CreateIssue()`, `UpdateIssue()`, `CloseIssue()`, `ReopenIssue()` to `issues.Client` Go interface
- Add `AddLabel()`, `RemoveLabel()`, `SetAssignee()`, `RemoveAssignee()` to `issues.Client` interface
- Implement all methods for both GitHub and GitLab
- Add HTTP handler endpoints for issue mutations (POST/PUT/DELETE)
- Add issue creation modal in TUI (title, description, labels, assignee)
- Add issue editing capability (edit title/description from detail view)
- Add close/reopen action from issue detail (key: `c` / `C`)
- Add label add/remove from issue detail (key: `l`)
- Add assignee set/remove from issue detail (key: `a`)
- Wire confirmation dialogs for destructive actions (close, remove assignee)
- Update store and actions with mutation state management

## Capabilities

### New Capabilities
- `issue-mutations`: Ability to create, edit, close, reopen, and manage labels and assignees for issues from within the TUI

### Modified Capabilities
- `issue-viewing`: The issue detail view now supports interactive actions (edit, close/reopen, label management, assignee changes) in addition to read-only display. Keyboard bindings for actions are added.
- `issue-linked-mrs`: No change — linked MRs are read-only unaffected by mutations.

## Impact

- **Server (Go)**: New methods on `issues.Client` interface. New implementations in `github/` and `gitlab/`. New HTTP handler endpoints (POST/PUT/DELETE). All handlers registered in `server.go`.
- **Client API (TypeScript)**: New mutation functions in `issues-client.ts`.
- **TUI (TypeScript)**: New modals (issue creation form, label picker, assignee picker). Modified `IssueDetailView` (adds action bar). New keyboard bindings. Updated store with mutation signals (submitting state, error handling).
