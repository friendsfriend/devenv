# issue-linked-mrs Specification

## Purpose
TBD - created by archiving change add-issue-linked-mrs. Update Purpose after archive.
## Requirements
### Requirement: User can see linked MRs inline in issue detail

The issue detail view SHALL display a compact "Linked Merge Requests" section at the bottom of the scroll, showing the count of linked MRs and the titles of the first 3. The section SHALL indicate when data is loading and when no linked MRs exist.

#### Scenario: Inline linked MRs summary with data
- **WHEN** the issue detail view is displayed and linked MR data has loaded
- **THEN** the system SHALL show a section titled "Linked Merge Requests"
- **AND** SHALL show the count of linked MRs (e.g., "3 linked merge requests")
- **AND** SHALL show the title, state, and ID for the first 3 linked MRs
- **AND** SHALL show a "View all N →" cue to open the full sub-view

#### Scenario: Inline linked MRs loading state
- **WHEN** the issue detail view is displayed and linked MRs are still loading
- **THEN** the system SHALL show a loading indicator in the linked MRs section

#### Scenario: Inline linked MRs empty state
- **WHEN** the issue detail view is displayed and no linked MRs exist
- **THEN** the system SHALL show "No linked merge requests" in the section

### Requirement: User can view all linked MRs in full sub-view

The system SHALL provide a full-screen linked MRs sub-view, navigable from the issue detail by pressing `M`. The sub-view SHALL display all linked MRs in a table format using the existing `MergeRequestView` component, with keyboard navigation for list traversal and Escape to return to issue detail.

#### Scenario: Open linked MRs sub-view
- **WHEN** user presses `M` (Shift+M) from the issue detail view
- **THEN** the system SHALL switch to the linked MRs sub-view
- **AND** SHALL display all linked MRs in a table format
- **AND** SHALL support j/k navigation, Enter to open MR detail (reusing existing MR machinery), and Escape to return

#### Scenario: Open linked MRs with no data
- **WHEN** user presses `M` from the issue detail view and no linked MRs exist
- **THEN** the system SHALL display an empty state message "No linked merge requests"
- **AND** SHALL return to issue detail on Escape

#### Scenario: Return to issue detail from linked MRs
- **WHEN** user presses Escape from the linked MRs sub-view
- **THEN** the system SHALL return to the issue detail view

