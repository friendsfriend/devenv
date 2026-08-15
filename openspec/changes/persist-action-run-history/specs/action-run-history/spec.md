## ADDED Requirements

### Requirement: Durable action run snapshots
System SHALL persist complete action runs in existing SQLite state database, including status, nested steps, commands, stdout, stderr, errors, and timestamps.

#### Scenario: Completed run survives restart
- **WHEN** an action completes and server restarts
- **THEN** complete run and command logs remain retrievable

#### Scenario: Failed run survives restart
- **WHEN** nested step fails with command output
- **THEN** failed path, error, command output, and exit status remain retrievable after restart

### Requirement: Action history API
Server SHALL expose bounded recent action history ordered newest first.

#### Scenario: Client requests history
- **WHEN** client requests recent action runs
- **THEN** server returns persisted snapshots with unique run IDs

### Requirement: TUI history hydration
TUI SHALL hydrate action tree with runs from last 10 minutes before consuming live action events and merge runs by unique run ID.

#### Scenario: TUI restarts
- **WHEN** TUI reconnects to running server
- **THEN** prior completed and failed actions appear with selectable steps and logs

#### Scenario: Live action follows hydration
- **WHEN** new action starts after history hydration
- **THEN** new run is added without corrupting existing history

#### Scenario: User loads older actions
- **WHEN** user selects action-level load-older tree node
- **THEN** TUI loads and merges all retained actions from last 24 hours and removes load-older node

### Requirement: 24-hour retention
System SHALL delete persisted action events and in-memory completed runs after 24 hours.

#### Scenario: History is younger than 24 hours
- **WHEN** action history is less than 24 hours old
- **THEN** action and logs remain available

#### Scenario: History reaches 24 hours
- **WHEN** action history is at least 24 hours old
- **THEN** action metadata, commands, output, and errors are deleted
