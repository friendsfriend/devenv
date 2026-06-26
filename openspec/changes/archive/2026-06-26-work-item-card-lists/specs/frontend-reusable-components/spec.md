## ADDED Requirements

### Requirement: Reusable work item card
The frontend SHALL provide a reusable presentational work item card component when two or more TUI list views need the same card layout structure.

#### Scenario: Work item card renders shared structure
- **WHEN** a list view renders a work item card
- **THEN** the card SHALL support a marker, title, status text, status color, metadata text, and selected state styling

#### Scenario: Work item card remains presentational
- **WHEN** the reusable work item card is used in a keyboard-driven view
- **THEN** it SHALL NOT register keyboard handlers
- **AND** selection SHALL remain controlled by parent-provided props
