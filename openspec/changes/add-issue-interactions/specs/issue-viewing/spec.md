## MODIFIED Requirements

### Requirement: User can view issue detail

The system SHALL display a detail view when the user selects an issue from the list. The detail view SHALL show issue title, author, state, labels, assignee, milestone, created/updated dates, description, web URL, threaded comments, a linked MRs summary panel, and an action bar with available mutations.

#### Scenario: View issue metadata
- **WHEN** the issue detail view is displayed
- **THEN** the system SHALL show the issue title as a bold header
- **AND** SHALL show author name and username
- **AND** SHALL show state with color coding (opened=green, closed=muted)
- **AND** SHALL show labels (if any) with color indicators
- **AND** SHALL show assignee name (if any)
- **AND** SHALL show milestone title (if any)
- **AND** SHALL show created and updated dates
- **AND** SHALL show the description text (if any)
- **AND** SHALL show the web URL
- **AND** SHALL show a linked MRs summary panel at the bottom
- **AND** SHALL show available action keybinds (e, c/C, l, a, n)

#### Scenario: Return to issue list from detail
- **WHEN** user presses Escape from the issue detail view
- **THEN** the system SHALL return to the issue list

### Requirement: User can view issue list from selected app

The system SHALL display a paginated list of issues for the selected app's repository when the user triggers the issue view. The list SHALL show: issue number, title, author, state, labels, and last updated time. The system SHALL support keyboard navigation identical to the MR list (j/k, page up/down, search with /) and SHALL support issue creation via `n`.

#### Scenario: Open issue creation from list
- **WHEN** user presses `n` from the issue list view
- **THEN** the system SHALL open the issue creation modal
