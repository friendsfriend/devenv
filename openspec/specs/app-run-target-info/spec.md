# app-run-target-info Specification

## Purpose
TBD - created by archiving change store-app-run-target-info. Update Purpose after archive.
## Requirements
### Requirement: Track app run target information
The system SHALL record app run target information when an app run/start action launches a resolved action target.

#### Scenario: Tmux shell run target recorded
- **WHEN** the user launches a shell run target with launch mode `tmux`, label `bun build`, and profile `default`
- **THEN** the system SHALL record run target information for the app including runtime `shell`, launch mode `tmux`, label `bun build`, profile `default`, target id, source path, started timestamp, and display text `[tmux] bun build (default)`

#### Scenario: Docker profile run target recorded
- **WHEN** the user launches Docker run profile `redis` for app `my-app`
- **THEN** the system SHALL record run target information for `my-app` including runtime `docker`, profile `redis`, target id, source path, started timestamp, and display text `[docker] redis (redis)` or equivalent picker-style target text

#### Scenario: Kubernetes run target recorded
- **WHEN** the user launches a Kubernetes run target for an app
- **THEN** the system SHALL record run target information including runtime `kubernetes`, label, profile when present, target id, source path, and started timestamp

#### Scenario: Run target information survives server restart
- **WHEN** an app has recorded run target information
- **AND** the server restarts before the app is stopped through DevEnv
- **THEN** subsequent app status responses SHALL include the previously recorded run target information from runtime state storage

### Requirement: Use recorded run target information for stop routing
The system SHALL use recorded app run target information to route stop operations to the active run target when a stop request does not explicitly provide a target id.

#### Scenario: Stop uses recorded target id
- **WHEN** an app has recorded run target information with a target id
- **AND** the user stops the app without an explicit target id
- **THEN** the backend SHALL resolve and stop the recorded target id

#### Scenario: Stop uses persisted target after restart
- **WHEN** an app has recorded Docker run target information
- **AND** the server restarts before the app is stopped through DevEnv
- **AND** the user stops the app
- **THEN** the backend SHALL use the persisted run target information to stop the same Docker run target

#### Scenario: Successful stop clears recorded target
- **WHEN** the backend stops an app using recorded run target information
- **THEN** the system SHALL clear recorded run target information for that app after stop succeeds

### Requirement: Expose app run target information in status APIs
The system SHALL expose recorded app run target information as optional app status data without breaking existing clients.

#### Scenario: App status includes run target information
- **WHEN** the TUI requests current app statuses after an app has been launched through a run target
- **THEN** the status response for that app SHALL include run target information with the picker-style display text

#### Scenario: Live status update includes run target information
- **WHEN** the server broadcasts `status.updated` for an app with recorded run target information
- **THEN** the event properties SHALL include the app run target information

#### Scenario: Clients without run target support remain compatible
- **WHEN** a client ignores the optional run target information field
- **THEN** existing app status, docker info, git info, and operation status behavior SHALL remain unchanged

### Requirement: Clear stale app run target information
The system SHALL clear app run target information when the system knows the corresponding app run has stopped.

#### Scenario: Stop clears run target information
- **WHEN** the user stops an app run target and the stop operation succeeds
- **THEN** the system SHALL clear recorded run target information for that app

#### Scenario: Inactive shell tmux run clears run target information
- **WHEN** a previously tracked shell tmux app run is no longer active
- **THEN** the system SHALL clear or omit run target information for that app in subsequent status updates

### Requirement: Display app run target information in the TUI
The TUI SHALL display app run target information in app detail and the main app list when that information is available.

#### Scenario: Detail view shows picker-style run target
- **WHEN** `AppDetailView` renders an app with run target display text `[tmux] bun build (default)`
- **THEN** the detail info panel SHALL show the app run target using that text

#### Scenario: Main list shows compact run target hint
- **WHEN** the main application list renders an app with run target display text `[tmux] bun build (default)`
- **THEN** the app row metadata or status suffix SHALL include a compact run target hint using that text

#### Scenario: Missing run target information hides rows
- **WHEN** an app has no recorded run target information
- **THEN** the TUI SHALL not show empty or placeholder run target fields for that app

