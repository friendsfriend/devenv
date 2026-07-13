# aggregated-log-view Specification

## Purpose
TBD - created by archiving change cross-app-log-aggregation. Update Purpose after archive.
## Requirements
### Requirement: Stream logs from all running containers
The server SHALL multiplex Docker log streams from all running containers into a single SSE stream.

#### Scenario: Multiple containers running
- **WHEN** apps `frontend`, `backend`, and `worker` are running
- **THEN** the aggregated log endpoint SHALL stream lines from all three containers
- **THEN** each line SHALL include the source app name: `{ app: "frontend", line: "..." }`

#### Scenario: No containers running
- **WHEN** no containers are running
- **THEN** the stream SHALL be empty (no events)

#### Scenario: Container starts mid-stream
- **WHEN** a new container starts while the aggregated stream is active
- **THEN** the server SHALL automatically add the new container's log stream
- **THEN** new lines from that container SHALL appear in the stream

#### Scenario: Container stops mid-stream
- **WHEN** a container stops while the aggregated stream is active
- **THEN** the server SHALL stop streaming from that container
- **THEN** no error SHALL be raised

### Requirement: Expose aggregated log endpoint
The server SHALL provide an SSE endpoint for aggregated logs.

#### Scenario: GET /api/logs/stream
- **WHEN** the client connects to the aggregated log endpoint
- **THEN** the server SHALL start streaming from all running containers
- **THEN** each SSE event SHALL contain `{ app: string, line: string }`

#### Scenario: Filter by app
- **WHEN** the client connects with `?apps=frontend,backend`
- **THEN** the server SHALL only stream from the specified containers

### Requirement: Display aggregated log view
The TUI SHALL display a unified log view with per-app source tagging.

#### Scenario: Log line rendering
- **WHEN** a log line arrives from app `frontend`
- **THEN** it SHALL display with a colored `[frontend]` prefix
- **THEN** each app SHALL have a distinct color (cycling through theme palette)

#### Scenario: Follow mode
- **WHEN** the aggregated log view is open
- **THEN** new lines SHALL auto-scroll to bottom (follow mode)
- **THEN** the user SHALL be able to scroll up to pause follow mode

#### Scenario: Empty state
- **WHEN** no log lines are available
- **THEN** the view SHALL show "No running containers" in muted text

### Requirement: Search in aggregated logs
The user SHALL be able to search across all aggregated log lines.

#### Scenario: Activate search
- **WHEN** the user presses `/` in the aggregated log view
- **THEN** search mode SHALL activate
- **THEN** typing SHALL filter lines containing the search term

#### Scenario: Search highlights matches
- **WHEN** search is active and lines match
- **THEN** matching text SHALL be highlighted using the shared `MatchedText` component

#### Scenario: Clear search
- **WHEN** the user presses `Escape` in search mode
- **THEN** search SHALL deactivate and all lines SHALL be shown

### Requirement: Filter by app name
The user SHALL be able to filter the aggregated log to specific apps.

#### Scenario: Open app filter
- **WHEN** the user presses `F` in the aggregated log view
- **THEN** a filter modal SHALL appear listing all apps with running containers

#### Scenario: Select apps to include
- **WHEN** the user selects `frontend` and `backend` in the filter
- **THEN** only lines from those apps SHALL be displayed
- **THEN** the filter status SHALL show in the header

#### Scenario: Clear filter
- **WHEN** the user clears the app filter
- **THEN** all apps SHALL be included again

### Requirement: Keyboard shortcut for aggregated log view
The system SHALL provide a keyboard shortcut to open the aggregated log view.

#### Scenario: Open from table view
- **WHEN** the user presses `L` (capital) in the table view
- **THEN** the aggregated log view SHALL open

#### Scenario: Close aggregated log view
- **WHEN** the user presses `Escape` or `q` in the aggregated log view
- **THEN** the view SHALL close and return to the table view

