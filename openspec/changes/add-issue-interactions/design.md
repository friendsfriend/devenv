## Context

Changes 1 and 2 established issue reading (list + detail + linked MRs). This change adds write operations. The TUI already has patterns for modal forms (AddAppModal, ScriptArgsModal), confirmation dialogs (ConfirmDialog), and keyboard-triggered actions (toggle MR approval, rebase, comment). Issue mutations follow these same patterns.

## Goals / Non-Goals

**Goals:**
- Issue creation from TUI (modal form: title, description, labels, assignee)
- Edit title and description from issue detail (inline or modal)
- Close / reopen issue from detail view
- Add / remove labels from detail view
- Set / remove assignee from detail view
- Confirmation dialogs before destructive actions (close, remove assignee)
- Loading/error state management for all mutations
- Both GitHub and GitLab support for all operations

**Non-Goals:**
- Milestone management (create/edit milestones)
- Issue comments (posting, editing, deleting — that's a separate interaction)
- Bulk operations (batch close, batch label)
- Issue templates or default values

## Decisions

### 1. Issue creation via modal form

**Decision**: A new `CreateIssueModal` component triggered by pressing `n` (new) from the issue list view. The modal has fields: title (required), description (multiline, optional), and optional scope-specific fields.

**Rationale**: The modal form pattern is already established (AddAppModal, ScriptArgsModal). Reusable form input handling exists. Pressing `n` from the issue list is discoverable and consistent with other "create new" patterns.

### 2. Edit via modal (not inline)

**Decision**: Pressing `e` from issue detail opens a modal to edit title and description. Not inline editing.

**Rationale**: Inline editing in a terminal UI is complex (cursor management, text selection). Modal editing keeps implementation simple and matches existing patterns.

### 3. Close/reopen with confirmation dialog

**Decision**: Pressing `c` from issue detail closes the issue (with confirmation dialog). Pressing `C` (Shift+C) reopens it (no confirmation needed — reopening is less destructive).

**Rationale**: `c` for close follows the MR detail pattern where `a` toggles approval. Closing is destructive (hides from default list) — confirmation prevents accidents. Reopening is less risky, so no confirmation needed.

### 4. Label management via picker modal

**Decision**: Pressing `l` from issue detail opens a label picker modal showing all available labels for the repo. User can toggle labels on/off with Enter and confirm with Escape. Removes need for separate "add label" and "remove label" actions.

**Rationale**: Modal picker is the most natural UX for multi-select toggles. The branch selector modal already demonstrates this pattern.

### 5. Assignee via picker modal

**Decision**: Pressing `a` from issue detail opens an assignee picker modal showing repository collaborators. Select one to assign, or select the current assignee again to unassign.

**Rationale**: Simpler than separate set/remove keys. Match GitHub/GitLab web UX where clicking assignee cycles through options.

### 6. Unify GitHub and GitLab mutations behind interface

**Decision**: All mutation methods (`CreateIssue`, `UpdateIssue`, `CloseIssue`, `ReopenIssue`, `SetLabels`, `AddAssignee`, `RemoveAssignee`) are on the `issues.Client` interface.

**Rationale**: Consistency with the reading interface. The TUI should never need provider-specific code for mutations.

### 7. Provider API differences handled server-side

**Decision**: GitHub uses `POST /repos/{owner}/{repo}/issues` for creation with labels as string array. GitLab uses `POST /projects/{id}/issues` with label IDs. The server maps between the TUI's unified shape and each provider's specifics.

**Rationale**: Keeps TUI provider-agnostic. All provider-specific mapping lives in the server, which is the established pattern.

## Risks / Trade-offs

- **[Risk] Label names differ across providers**: GitHub uses label names (strings), GitLab uses label IDs or titles. The server normalizes to label names for the TUI and maps to IDs when calling GitLab API. **Mitigation**: Label picker shows names. Server handles ID resolution internally.

- **[Risk] API permissions**: Not all tokens will have write access to issue operations. **Mitigation**: Server returns clear error messages for permission failures. TUI displays the error in the existing error dialog pattern.

- **[Risk] Rate limits on mutations**: Creating/editing issues consumes API rate limit faster than reads. **Mitigation**: No special handling needed — same rate limits apply as existing Git operations.

- **[Trade-off] No preview before create**: Unlike GitHub/GitLab web UI, there's no Markdown preview of the issue body. **Mitigation**: The description field shows plain text. Users comfortable in the terminal are typically comfortable writing Markdown without a preview.

## Open Questions

- Should the label picker fetch all repo labels, or just labels already used on issues? **Decision**: Fetch all repo labels — more useful for initial issue creation.
