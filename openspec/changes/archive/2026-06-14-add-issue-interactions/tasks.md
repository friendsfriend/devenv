## 1. Server — Extend issues.Client interface with mutations

- [x] 1.2 Add `SetLabels()`, `AddAssignee()`, `RemoveAssignee()` to `issues.Client`

## 2. Server — GitHub mutation implementations

- [x] 2.3 Implement `CloseIssue()` — PATCH issue with `state: closed`
- [x] 2.4 Implement `ReopenIssue()` — PATCH issue with `state: open`
- [x] 2.5 Implement `SetLabels()` — PUT labels on issue via `PUT /repos/{owner}/{repo}/issues/{number}/labels`
- [x] 2.6 Implement `AddAssignee()` — `POST /repos/{owner}/{repo}/issues/{number}/assignees`
- [x] 2.7 Implement `RemoveAssignee()` — `DELETE /repos/{owner}/{repo}/issues/{number}/assignees`

## 3. Server — GitLab mutation implementations

- [x] 3.3 Implement `CloseIssue()` — PUT issue with `state_event: close`
- [x] 3.4 Implement `ReopenIssue()` — PUT issue with `state_event: reopen`
- [x] 3.5 Implement `SetLabels()` — PUT issue with updated `labels` field
- [x] 3.6 Implement `AddAssignee()` — PUT issue with `assignee_ids`
- [x] 3.7 Implement `RemoveAssignee()` — PUT issue with `assignee_ids: []`
- [x] 3.8 Add helper to fetch and cache label name→ID mapping for GitLab

## 4. Server — HTTP handlers for mutations

- [x] 4.3 Add `handleGitHubCloseIssue()` — POST `/api/github/issues/{n}/close`
- [x] 4.4 Add `handleGitHubReopenIssue()` — POST `/api/github/issues/{n}/reopen`
- [x] 4.5 Add `handleGitHubSetLabels()` — POST `/api/github/issues/{n}/labels`
- [x] 4.6 Add `handleGitHubSetAssignee()` — POST `/api/github/issues/{n}/assignee`
- [x] 4.7 Add `handleGitHubRemoveAssignee()` — POST `/api/github/issues/{n}/unassign`
- [x] 4.8 Add GitLab equivalents for all of the above
- [x] 4.9 Add `handleGitHubRepoLabels()` — GET `/api/github/labels` (for label picker)
- [x] 4.10 Add `handleGitHubRepoCollaborators()` — GET `/api/github/collaborators` (for assignee picker)
- [x] 4.11 Add GitLab equivalents for labels and collaborators endpoints
- [x] 4.12 Register all new routes in `server.go`

## 5. Client API — Mutation functions

- [x] 5.3 Add `closeIssue()` / `reopenIssue()` to `issues-client.ts`
- [x] 5.4 Add `setIssueLabels()` to `issues-client.ts`
- [x] 5.5 Add `setIssueAssignee()` / `removeIssueAssignee()` to `issues-client.ts`
- [x] 5.6 Add `getRepoLabels()` / `getRepoCollaborators()` to `issues-client.ts`
- [x] 5.7 Wire all into `createClient()` factory

## 6. TUI — Store additions

- [x] 6.1 Add mutation state signals to `issue-store.ts` (submitting, submitError, availableLabels, availableCollaborators)
- [x] 6.2 Add modal visibility signals (showLabelPicker, showAssigneePicker)

## 7. TUI — Actions for mutations

- [x] 7.3 Add `closeIssue()` / `reopenIssue()` actions with confirmation dialog
- [x] 7.4 Add `setIssueLabels()` action
- [x] 7.5 Add `setIssueAssignee()` / `removeIssueAssignee()` actions
- [x] 7.6 Add `fetchRepoLabels()` / `fetchRepoCollaborators()` actions

## 8. TUI — UI Components for mutations

- [x] 8.3 Create `tui/packages/ui/src/components/LabelPickerModal.tsx` — multi-select modal with toggleable labels
- [x] 8.4 Create `tui/packages/ui/src/components/AssigneePickerModal.tsx` — single-select modal with collaborators

- [x] 8.6 Export all new components from `tui/packages/ui/src/index.ts`

## 9. TUI — Keyboard handlers for mutations

- [x] 9.3 Add `c` / `C` to `issue-detail-keys.ts` — close / reopen with/without confirmation
- [x] 9.4 Add `l` to `issue-detail-keys.ts` — opens label picker
- [x] 9.5 Add `a` to `issue-detail-keys.ts` — opens assignee picker

## 10. Integration and verification

- [x] 10.1 Verify Go server compiles with new mutation packages and handlers
- [x] 10.2 Verify TUI compiles with new components and keyboard handlers
- [x] 10.3 Manual: close issue via `c` with confirmation, verify state changes to closed
- [x] 10.4 Manual: reopen closed issue via `C`, verify state changes to opened
- [x] 10.5 Manual: add and remove labels via `l`, verify changes persist
- [x] 10.6 Manual: set and remove assignee via `a`, verify changes persist
- [x] 10.7 Manual: test all mutations with GitHub provider
- [x] 10.8 Manual: test all mutations with GitLab provider
