## ADDED Requirements

### Requirement: Emit status log entry on task completion
The system SHALL append a status log entry after every task/script execution completes.

#### Scenario: Successful task execution
- **WHEN** a task `deploy.sh` completes successfully in 5.2s
- **THEN** a status log entry SHALL be appended with message containing the task name
- **THEN** the entry SHALL have `status: "success"`
- **THEN** the entry SHALL have `source: "task"`

#### Scenario: Failed task execution
- **WHEN** a task `migrate.py` fails with exit code 1
- **THEN** a status log entry SHALL be appended with `status: "error"`
- **THEN** the entry SHALL include the task name

#### Scenario: Task with arguments
- **WHEN** a task `deploy.sh` runs with args `--env prod --dry-run`
- **THEN** the status log entry message SHALL include a truncated args summary (e.g., "deploy.sh --env prod...")

### Requirement: Distinguish task entries from app entries
The system SHALL include a `source` field on `StatusLogEntry` to differentiate task entries from app/infra operation entries.

#### Scenario: Task entry has source "task"
- **WHEN** a status log entry is created from a task execution
- **THEN** `entry.source` SHALL be `"task"`

#### Scenario: App entry has source "app"
- **WHEN** a status log entry is created from a Docker operation (start/stop/build)
- **THEN** `entry.source` SHALL be `"app"` (or undefined for backward compatibility)

### Requirement: Display task entries in status log
The TUI status log view SHALL render task entries with a visual prefix.

#### Scenario: Task entry rendering
- **WHEN** a task entry appears in the status log
- **THEN** it SHALL display with a `[task]` prefix in muted color
- **THEN** the task name and status SHALL be visible

#### Scenario: App entry rendering
- **WHEN** an app entry appears in the status log
- **THEN** it SHALL display without a source prefix (existing behavior)

### Requirement: Duration tracking for tasks
The system SHALL track and display execution duration for task entries.

#### Scenario: Duration displayed
- **WHEN** a task completes in 3.7 seconds
- **THEN** the status log entry SHALL include the duration (e.g., "3.7s")

#### Scenario: Fast task duration
- **WHEN** a task completes in under 1 second
- **THEN** the duration SHALL be shown in milliseconds (e.g., "250ms")
