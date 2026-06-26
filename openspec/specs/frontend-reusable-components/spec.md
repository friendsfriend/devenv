# frontend-reusable-components Specification

## Purpose
TBD - created by archiving change extract-frontend-reusable-components. Update Purpose after archive.
## Requirements
### Requirement: Reusable state display
The frontend SHALL provide a reusable presentational component for centered loading, error, and empty states used by list-like views.

#### Scenario: List view renders loading state
- **WHEN** a refactored list view receives a loading state
- **THEN** it displays the loading message through the shared state component without changing the message text or styling intent

#### Scenario: List view renders error state
- **WHEN** a refactored list view receives an error message
- **THEN** it displays the error through the shared state component without changing the message text or styling intent

#### Scenario: List view renders empty state
- **WHEN** a refactored list view has no items and no loading or error state
- **THEN** it displays the empty message through the shared state component without changing the message text or styling intent

### Requirement: Reusable search header
The frontend SHALL provide a reusable presentational search header for views that show `searchMode` and `searchQuery` in table/list headers.

#### Scenario: Active search input is shown
- **WHEN** a refactored view is in search mode
- **THEN** the shared search header displays the query and cursor indicator equivalent to the current UI

#### Scenario: Stored search query is shown
- **WHEN** a refactored view is not in search mode but has a search query
- **THEN** the shared search header displays the query equivalent to the current UI

### Requirement: Reusable detail section
The frontend SHALL provide a reusable bordered detail section component for repeated detail panels.

#### Scenario: Detail panel renders content
- **WHEN** a refactored detail view renders a section with title and body content
- **THEN** the shared detail section displays the same title, border style, and child content behavior as the previous inline panel

### Requirement: Shared formatting utilities
The frontend SHALL reuse shared utility functions for duplicated date formatting, status color mapping, and text truncation when at least two current components need the same behavior.

#### Scenario: Duplicate formatter is removed
- **WHEN** two or more components use identical formatting logic
- **THEN** they import a shared utility instead of keeping separate inline implementations

### Requirement: Keyboard handling remains parent-owned
Reusable frontend components introduced by this change MUST NOT register their own keyboard handlers.

#### Scenario: Component is used in keyboard-driven view
- **WHEN** a reusable component is rendered inside a view whose parent handles keyboard input
- **THEN** keyboard behavior remains controlled by the existing parent handler

### Requirement: Reusable work item card
The frontend SHALL provide a reusable presentational work item card component when two or more TUI list views need the same card layout structure.

#### Scenario: Work item card renders shared structure
- **WHEN** a list view renders a work item card
- **THEN** the card SHALL support a marker, title, status text, status color, metadata text, and selected state styling

#### Scenario: Work item card remains presentational
- **WHEN** the reusable work item card is used in a keyboard-driven view
- **THEN** it SHALL NOT register keyboard handlers
- **AND** selection SHALL remain controlled by parent-provided props

