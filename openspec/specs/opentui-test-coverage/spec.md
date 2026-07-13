# opentui-test-coverage Specification

## Purpose
TBD - created by archiving change improve-opentui-test-coverage. Update Purpose after archive.
## Requirements
### Requirement: Shared OpenTUI test utilities
The system SHALL provide reusable test helpers for rendering Solid/OpenTUI components in memory without writing to the real terminal.

#### Scenario: Test renders component to frame
- **WHEN** a test renders a TUI component with the shared helper
- **THEN** the helper SHALL expose render/flush utilities and captured character frames for assertions

#### Scenario: Test captures styled spans
- **WHEN** a test needs to verify semantic styling
- **THEN** the helper SHALL expose styled span capture so tests can assert foreground/background/highlight attributes without hardcoded terminal output

#### Scenario: Test cleans renderer resources
- **WHEN** a test finishes or fails
- **THEN** the helper SHALL destroy the renderer and avoid leaking OpenTUI resources into later tests

### Requirement: Rendering coverage for shared UI chrome
The system SHALL have renderer-backed tests for shared TUI chrome and modal/list components that are reused across views.

#### Scenario: Search header renders without orphan text
- **WHEN** `SearchHeader` renders in idle and search states
- **THEN** it SHALL render expected frame text and MUST NOT create orphan text nodes

#### Scenario: Filter status bar renders stable states
- **WHEN** `FilterStatusBar` renders empty, filter-only, sort-only, and combined states
- **THEN** it SHALL render expected frame text without layout errors

#### Scenario: Modal chrome renders children
- **WHEN** shared modal components render content
- **THEN** the frame SHALL include title, body, and footer content within the expected terminal dimensions

### Requirement: Interaction coverage uses real input simulation
The system SHALL test critical keyboard flows with OpenTUI/keymap input simulation where practical.

#### Scenario: Quit confirmation flow uses input simulation
- **WHEN** a test sends `q` or `Ctrl+C` key input through the renderer/keymap path twice
- **THEN** graceful shutdown command handling SHALL start exactly once

#### Scenario: Modal priority handles conflicting key
- **WHEN** a modal is open and a conflicting key is sent through the input path
- **THEN** the modal action SHALL run and the underlying view action SHALL NOT run

#### Scenario: Standard list controls are dispatched
- **WHEN** a list view supports `/`, `F`, or `O` and the corresponding key is sent
- **THEN** the appropriate search, filter, or order/sort state SHALL activate

### Requirement: Responsive layout coverage
The system SHALL include tests for critical TUI layouts at representative terminal sizes.

#### Scenario: Narrow terminal renders without overlap
- **WHEN** critical views render at a narrow terminal width
- **THEN** visible frame content SHALL not show obvious overlap or missing required header/status elements

#### Scenario: Resize updates rendered frame
- **WHEN** a renderer-backed test resizes the terminal dimensions
- **THEN** the view SHALL settle and render content appropriate to the new dimensions

### Requirement: Coverage checklist for future features
The system SHALL document a TUI test coverage checklist that new or modified OpenTUI features can follow.

#### Scenario: New TUI feature adds tests
- **WHEN** a future feature adds or changes views, modals, keyboard behavior, or layout
- **THEN** the checklist SHALL identify expected unit, render, style, input, and responsive tests

