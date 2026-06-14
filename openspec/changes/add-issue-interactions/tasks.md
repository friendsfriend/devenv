## 1. Server — Extend issues.Client interface with mutations

- [ ] 1.1 Add `CreateIssue()`, `UpdateIssue()`, `CloseIssue()`, `ReopenIssue()` to `issues.Client`
- [ ] 1.2 Add `SetLabels()`, `AddAssignee()`, `RemoveAssignee()` to `issues.Client`
- [ ] 1.3 Add request/response types for mutations (CreateIssueRequest, UpdateIssueRequest, etc.)

## 2. Server — GitHub mutation implementations

- [ ] 2.1 Implement `CreateIssue()` — `POST /repos/{owner}/{repo}/issues`
- [ ] 2.2 Implement `UpdateIssue()` — `PATCH /repos/{owner}/{repo}/issues/{number}`
- [ ] 2.3 Implement `CloseIssue()` — PATCH issue with `state: closed`
- [ ] 2.4 Implement `ReopenIssue()` — PATCH issue with `state: open`
- [ ] 2.5 Implement `SetLabels()` — PUT labels on issue via `PUT /repos/{owner}/{repo}/issues/{number}/labels`
- [ ] 2.6 Implement `AddAssignee()` — `POST /repos/{owner}/{repo}/issues/{number}/assignees`
- [ ] 2.7 Implement `RemoveAssignee()` — `DELETE /repos/{owner}/{repo}/issues/{number}/assignees`

## 3. Server — GitLab mutation implementations

- [ ] 3.1 Implement `CreateIssue()` — `POST /projects/{id}/issues` (map label names to IDs)
- [ ] 3.2 Implement `UpdateIssue()` — `PUT /projects/{id}/issues/{iid}`
- [ ] 3.3 Implement `CloseIssue()` — PUT issue with `state_event: close`
- [ ] 3.4 Implement `ReopenIssue()` — PUT issue with `state_event: reopen`
- [ ] 3.5 Implement `SetLabels()` — PUT issue with updated `labels` field
- [ ] 3.6 Implement `AddAssignee()` — PUT issue with `assignee_ids`
- [ ] 3.7 Implement `RemoveAssignee()` — PUT issue with `assignee_ids: []`
- [ ] 3.8 Add helper to fetch and cache label name→ID mapping for GitLab

## 4. Server — HTTP handlers for mutations

- [ ] 4.1 Add `handleGitHubCreateIssue()` — POST `/api/github/issues/create`
- [ ] 4.2 Add `handleGitHubUpdateIssue()` — PATCH `/api/github/issues/{n}/update`
- [ ] 4.3 Add `handleGitHubCloseIssue()` — POST `/api/github/issues/{n}/close`
- [ ] 4.4 Add `handleGitHubReopenIssue()` — POST `/api/github/issues/{n}/reopen`
- [ ] 4.5 Add `handleGitHubSetLabels()` — POST `/api/github/issues/{n}/labels`
- [ ] 4.6 Add `handleGitHubSetAssignee()` — POST `/api/github/issues/{n}/assignee`
- [ ] 4.7 Add `handleGitHubRemoveAssignee()` — POST `/api/github/issues/{n}/unassign`
- [ ] 4.8 Add GitLab equivalents for all of the above
- [ ] 4.9 Add `handleGitHubRepoLabels()` — GET `/api/github/labels` (for label picker)
- [ ] 4.10 Add `handleGitHubRepoCollaborators()` — GET `/api/github/collaborators` (for assignee picker)
- [ ] 4.11 Add GitLab equivalents for labels and collaborators endpoints
- [ ] 4.12 Register all new routes in `server.go`

## 5. Client API — Mutation functions

- [ ] 5.1 Add `createIssue()` to `issues-client.ts`
- [ ] 5.2 Add `updateIssue()` to `issues-client.ts`
- [ ] 5.3 Add `closeIssue()` / `reopenIssue()` to `issues-client.ts`
- [ ] 5.4 Add `setIssueLabels()` to `issues-client.ts`
- [ ] 5.5 Add `setIssueAssignee()` / `removeIssueAssignee()` to `issues-client.ts`
- [ ] 5.6 Add `getRepoLabels()` / `getRepoCollaborators()` to `issues-client.ts`
- [ ] 5.7 Wire all into `createClient()` factory

## 6. TUI — Store additions

- [ ] 6.1 Add mutation state signals to `issue-store.ts` (submitting, submitError, availableLabels, availableCollaborators)
- [ ] 6.2 Add modal visibility signals (showCreateModal, showEditModal, showLabelPicker, showAssigneePicker)

## 7. TUI — Actions for mutations

- [ ] 7.1 Add `createIssue()` action to `issue-actions.ts`
- [ ] 7.2 Add `updateIssue()` action (title + description)
- [ ] 7.3 Add `closeIssue()` / `reopenIssue()` actions with confirmation dialog
- [ ] 7.4 Add `setIssueLabels()` action
- [ ] 7.5 Add `setIssueAssignee()` / `removeIssueAssignee()` actions
- [ ] 7.6 Add `fetchRepoLabels()` / `fetchRepoCollaborators()` actions
- [ ] 7.7 Add `openCreateModal()` / `openEditModal()` / `openLabelPicker()` / `openAssigneePicker()` actions

## 8. TUI — UI Components for mutations

- [ ] 8.1 Create `tui/packages/ui/src/components/CreateIssueModal.tsx` — form with title, description, label picker, assignee picker
- [ ] 8.2 Create `tui/packages/ui/src/components/EditIssueModal.tsx` — pre-filled title + description form
- [ ] 8.3 Create `tui/packages/ui/src/components/LabelPickerModal.tsx` — multi-select modal with toggleable labels
- [ ] 8.4 Create `tui/packages/ui/src/components/AssigneePickerModal.tsx` — single-select modal with collaborators
- [ ] 8.5 Update `IssueDetailView.tsx` — add action bar at top/bottom showing available keybinds
- [ ] 8.6 Export all new components from `tui/packages/ui/src/index.ts`

## 9. TUI — Keyboard handlers for mutations

- [ ] 9.1 Add `n` to `issue-list-keys.ts` — opens create issue modal
- [ ] 9.2 Add `e` to `issue-detail-keys.ts` — opens edit modal
- [ ] 9.3 Add `c` / `C` to `issue-detail-keys.ts` — close / reopen with/without confirmation
- [ ] 9.4 Add `l` to `issue-detail-keys.ts` — opens label picker
- [ ] 9.5 Add `a` to `issue-detail-keys.ts` — opens assignee picker

## 10. Integration and verification

- [ ] 10.1 Verify Go server compiles with new mutation packages and handlers
- [ ] 10.2 Verify TUI compiles with new components and keyboard handlers
- [ ] 10.3 Manual: create an issue via `n`, verify it appears in the list and provider web UI
- [ ] 10.4 Manual: edit title and description via `e`, verify changes persist
- [ ] 10.5 Manual: close issue via `c` with confirmation, verify state changes to closed
- [ ] 10.6 Manual: reopen closed issue via `C`, verify state changes to opened
- [ ] 10.7 Manual: add and remove labels via `l`, verify changes persist
- [ ] 10.8 Manual: set and remove assignee via `a`, verify changes persist
- [ ] 10.9 Manual: test all mutations with GitHub provider
- [ ] 10.10 Manual: test all mutations with GitLab provider
