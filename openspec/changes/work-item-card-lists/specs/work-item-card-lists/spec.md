## ADDED Requirements

### Requirement: Issue list renders selectable cards
The TUI SHALL render issue list items as fixed-height selectable cards instead of table rows.

#### Scenario: Issue cards displayed
- **WHEN** the issue list has loaded issues
- **THEN** each issue SHALL be displayed as a card-style list item containing the issue IID, title, author, state, labels when present, and updated date
- **AND** the list SHALL NOT display table column headers

#### Scenario: Selected issue card highlighted
- **WHEN** an issue item index matches the parent-provided selected index
- **THEN** that issue card SHALL use selected styling that makes it visually distinct from unselected cards

### Requirement: Merge request list renders selectable cards
The TUI SHALL render merge request list items as fixed-height selectable cards instead of table rows.

#### Scenario: Merge request cards displayed
- **WHEN** the merge request list has loaded merge requests
- **THEN** each merge request SHALL be displayed as a card-style list item containing the MR IID, mergeability indicator, title, author, state, pipeline status when present, and updated date
- **AND** the list SHALL NOT display table column headers

#### Scenario: Selected merge request card highlighted
- **WHEN** a merge request item index matches the parent-provided selected index
- **THEN** that merge request card SHALL use selected styling that makes it visually distinct from unselected cards

### Requirement: Existing list behavior is preserved
The TUI SHALL preserve existing list behavior while changing only the issue and merge request item presentation.

#### Scenario: Search and pagination remain visible
- **WHEN** issue or merge request cards are displayed
- **THEN** the header SHALL continue to show active search state when applicable
- **AND** SHALL continue to show current page and loaded item count indicators

#### Scenario: Parent-owned navigation remains unchanged
- **WHEN** issue or merge request cards are displayed
- **THEN** the view SHALL continue to use the parent-provided selected index
- **AND** SHALL NOT register keyboard handlers inside the card list view

#### Scenario: Loading error and empty states remain unchanged
- **WHEN** issue or merge request list data is loading, errored, or empty
- **THEN** the view SHALL display the same loading, error, and empty state messages as before
