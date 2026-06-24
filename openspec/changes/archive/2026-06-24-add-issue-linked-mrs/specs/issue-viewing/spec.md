## ADDED Requirements

### Requirement: User can view issue detail

The system SHALL display a detail view when the user selects an issue from the list. The detail view SHALL show issue title, author, state, labels, assignee, milestone, created/updated dates, description, web URL, threaded comments, and a linked MRs summary panel.

#### Scenario: View issue metadata
- **WHEN** the issue detail view is displayed
- **THEN** the system SHALL show the issue title as a bold header
- **AND** SHALL show author name and username
- **AND** SHALL show state with color coding (opened=green, closed=muted)
- **AND** SHALL show labels (if any)
- **AND** SHALL show assignee name (if any)
- **AND** SHALL show milestone title (if any)
- **AND** SHALL show created and updated dates
- **AND** SHALL show the description text (if any)
- **AND** SHALL show the web URL
- **AND** SHALL show a linked MRs summary panel at the bottom

### Requirement: System supports both GitHub and GitLab

The system SHALL provide issue viewing for both GitHub Issues and GitLab Issues, determined by the app's configured provider type. Both providers SHALL return a unified issue shape to the TUI. The system SHALL also support fetching linked MRs for issues from both providers.

#### Scenario: GitHub issue linked MRs
- **WHEN** the issue detail for a GitHub issue is displayed
- **THEN** the system SHALL parse the issue description for closing references (closes, fixes, resolves, etc.)
- **AND** SHALL fetch any referenced PRs and display them as linked MRs

#### Scenario: GitLab issue linked MRs
- **WHEN** the issue detail for a GitLab issue is displayed
- **THEN** the system SHALL call the GitLab `closed_by` API endpoint
- **AND** SHALL also parse the issue description for `!{n}` references
- **AND** SHALL display the combined results as linked MRs
