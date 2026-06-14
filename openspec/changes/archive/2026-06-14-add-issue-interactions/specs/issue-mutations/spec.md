## ADDED Requirements

### Requirement: User can close and reopen issues

The system SHALL allow closing an issue from the detail view by pressing `c` (with confirmation dialog) and reopening by pressing `C` (Shift+C, no confirmation).

#### Scenario: Close issue with confirmation
- **WHEN** user presses `c` from the issue detail view
- **THEN** the system SHALL show a confirmation dialog: "Close this issue?"
- **WHEN** user presses `y` in the confirmation dialog
- **THEN** the system SHALL call the provider's close issue API
- **AND** SHALL update the detail view to show the issue as closed
- **WHEN** user presses `n` or Escape in the confirmation dialog
- **THEN** the system SHALL dismiss the dialog without closing

#### Scenario: Reopen issue
- **WHEN** user presses `C` (Shift+C) from a closed issue's detail view
- **THEN** the system SHALL call the provider's reopen issue API
- **AND** SHALL update the detail view to show the issue as opened
- **AND** SHALL NOT show a confirmation dialog

### Requirement: User can manage issue labels

The system SHALL allow adding and removing labels from the issue detail view by pressing `l`. The system SHALL display a label picker modal showing all available labels for the repository. User can toggle labels on/off with Enter and confirm with Escape.

#### Scenario: Open label picker
- **WHEN** user presses `l` from the issue detail view
- **THEN** the system SHALL fetch all available labels for the repository
- **AND** SHALL display a label picker modal with toggleable checkboxes
- **AND** SHALL show which labels are currently applied (pre-toggled)

#### Scenario: Toggle labels
- **WHEN** user navigates the label picker with j/k and presses Enter on a label
- **THEN** the system SHALL toggle that label's selection state
- **WHEN** user presses Enter again on a currently selected label
- **THEN** the system SHALL deselect it

#### Scenario: Confirm label changes
- **WHEN** user presses Escape from the label picker
- **THEN** the system SHALL apply the selected labels via the provider API
- **AND** SHALL update the issue detail view with the new labels

### Requirement: User can manage issue assignee

The system SHALL allow setting or removing the issue assignee from the detail view by pressing `a`. The system SHALL display an assignee picker modal showing repository collaborators. Selecting the current assignee again removes them.

#### Scenario: Open assignee picker
- **WHEN** user presses `a` from the issue detail view
- **THEN** the system SHALL fetch repository collaborators
- **AND** SHALL display an assignee picker modal
- **AND** SHALL highlight the current assignee (if any)

#### Scenario: Set assignee
- **WHEN** user navigates the assignee picker with j/k and presses Enter on a collaborator
- **THEN** the system SHALL set that user as the issue assignee via the provider API
- **AND** SHALL update the issue detail view

#### Scenario: Remove assignee
- **WHEN** user presses Enter on the currently assigned user in the picker
- **THEN** the system SHALL show a confirmation dialog: "Remove assignee?"
- **WHEN** user confirms
- **THEN** the system SHALL remove the assignee via the provider API
- **AND** SHALL update the issue detail view

### Requirement: Both providers support all mutations

All issue mutation operations SHALL work for both GitHub Issues and GitLab Issues. The system SHALL handle provider-specific API differences server-side.

#### Scenario: Mutation error handling
- **WHEN** any mutation API call returns an error (permission denied, rate limit, validation)
- **THEN** the system SHALL display the error message in the existing error dialog
- **AND** SHALL NOT modify the local state
