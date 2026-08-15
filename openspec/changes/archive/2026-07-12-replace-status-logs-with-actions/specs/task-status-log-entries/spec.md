## MODIFIED Requirements

### Requirement: Emit status log entry on task completion
The system SHALL create and complete an action run for every task/script execution instead of appending a status log entry.

#### Scenario: Successful task execution
- **WHEN** task `deploy.sh` completes successfully in 5.2s
- **THEN** task action SHALL have completed status and label containing task name
- **AND** command, arguments, output, exit status, and duration SHALL be retained

#### Scenario: Failed task execution
- **WHEN** task `migrate.py` fails with exit code 1
- **THEN** task action SHALL have failed status
- **AND** command output and exit failure SHALL be available in action modal

#### Scenario: Task with arguments
- **WHEN** task `deploy.sh` runs with args `--env prod --dry-run`
- **THEN** action command SHALL retain complete executed arguments

### Requirement: Distinguish task entries from app entries
The system SHALL identify task actions through action metadata and label rather than `StatusLogEntry.source`.

#### Scenario: Task action
- **WHEN** task execution creates action
- **THEN** action metadata SHALL identify task/script operation and target

#### Scenario: App action
- **WHEN** app operation creates action
- **THEN** action metadata SHALL identify app operation and target

### Requirement: Display task entries in status log
The TUI SHALL display task actions in compact action strip and detailed action modal rather than status log.

#### Scenario: Task action rendering
- **WHEN** task action is relevant to compact strip
- **THEN** strip SHALL show only status and task action label
- **AND** full details SHALL remain in action modal

#### Scenario: App action rendering
- **WHEN** app action is relevant to compact strip
- **THEN** same compact action rendering rules SHALL apply

### Requirement: Duration tracking for tasks
The system SHALL track task action start and finish timestamps.

#### Scenario: Duration available
- **WHEN** task completes
- **THEN** duration SHALL be derivable from action timestamps in detailed action data

#### Scenario: Compact strip
- **WHEN** task action appears in compact strip
- **THEN** duration SHALL NOT consume strip space
