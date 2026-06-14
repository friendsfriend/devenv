## ADDED Requirements

### Requirement: User can view issue list from selected app

The system SHALL display a paginated list of issues for the selected app's repository when the user triggers the issue view. The list SHALL show: issue number, title, author, state, labels, and last updated time. The system SHALL support keyboard navigation identical to the MR list (j/k, page up/down, search with /).

#### Scenario: Open issue list via 'i' key
- **WHEN** user presses 'i' while an app is selected in the table view
- **THEN** the system SHALL display a scope selector modal with options: All issues, Assigned to me, Created by me, No assignee
- **AND** after user selects a scope, the system SHALL load issues with that scope filter applied

#### Scenario: Open all issues via 'I' key
- **WHEN** user presses 'I' (Shift+I) while an app is selected in the table view
- **THEN** the system SHALL load all open issues for the repository immediately, skipping the scope selector

#### Scenario: Navigate issue list
- **WHEN** user presses 'j' or Down arrow
- **THEN** the selection SHALL move down one row
- **WHEN** user presses 'k' or Up arrow
- **THEN** the selection SHALL move up one row
- **WHEN** user presses 'g'
- **THEN** the selection SHALL jump to the first issue
- **WHEN** user presses 'G' (Shift+G)
- **THEN** the selection SHALL jump to the last issue

#### Scenario: Paginate through issues
- **WHEN** user presses ']' or 'l'
- **THEN** the system SHALL load the next page of issues
- **WHEN** user presses '[' or 'h'
- **THEN** the system SHALL load the previous page of issues

#### Scenario: Search issues
- **WHEN** user presses '/'
- **THEN** the system SHALL enter search mode and SHALL submit a server-side search query when user presses Enter
- **WHEN** user presses Escape during search
- **THEN** the system SHALL clear the search and exit search mode

#### Scenario: Return to table view from issue list
- **WHEN** user presses Escape from the issue list
- **THEN** the system SHALL return to the table view

### Requirement: User can view issue detail

The system SHALL display a detail view when the user selects an issue from the list. The detail view SHALL show issue title, author, state, labels, assignee, milestone, created/updated dates, description, web URL, and threaded comments.

#### Scenario: Open issue detail
- **WHEN** user presses Enter on a selected issue in the list
- **THEN** the system SHALL display the issue detail view in a single-column scrollable layout

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

#### Scenario: Return to issue list from detail
- **WHEN** user presses Escape from the issue detail view
- **THEN** the system SHALL return to the issue list

#### Scenario: View issue comments
- **WHEN** the issue detail view is displayed
- **THEN** the system SHALL load and display threaded comments below the metadata
- **AND** SHALL show author, date, and body for each comment
- **AND** SHALL indicate whether each comment is from a system action or a user

### Requirement: System supports both GitHub and GitLab

The system SHALL provide issue viewing for both GitHub Issues and GitLab Issues, determined by the app's configured provider type. Both providers SHALL return a unified issue shape to the TUI.

#### Scenario: GitHub issues
- **WHEN** the selected app has `sourceType: 'github'`
- **THEN** the system SHALL use the GitHub Issues API to fetch issues
- **AND** SHALL return results in the unified issue format

#### Scenario: GitLab issues
- **WHEN** the selected app has `sourceType: 'gitlab'`
- **THEN** the system SHALL use the GitLab Issues API to fetch issues
- **AND** SHALL return results in the unified issue format

### Requirement: Scope filter works across providers

The system SHALL support 4 scope filters: All issues, Assigned to me, Created by me, No assignee. The system SHALL map these to provider-specific API parameters where available, with client-side fallback when a parameter is not supported.

#### Scenario: Filter by assignment
- **WHEN** user selects "Assigned to me" in the scope modal
- **THEN** the system SHALL pass the appropriate assignment filter to the provider API
- **AND** SHALL only show issues assigned to the authenticated user

#### Scenario: No assignee fallback for GitLab
- **WHEN** user selects "No assignee" scope for a GitLab provider
- **THEN** the system SHALL fetch all issues and filter client-side for unassigned issues
- **AND** SHALL paginate the filtered result
