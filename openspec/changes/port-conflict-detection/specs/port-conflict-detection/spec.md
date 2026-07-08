## ADDED Requirements

### Requirement: Detect port conflicts before app start
The system SHALL check for port conflicts between the app's declared ports and ports used by running containers before starting.

#### Scenario: No conflict
- **WHEN** the app declares port `3000:3000` and no running container uses port 3000
- **THEN** the start operation SHALL proceed normally
- **THEN** no conflict notification SHALL be shown

#### Scenario: Port conflict detected
- **WHEN** the app declares port `5432:5432` and container `postgres` already binds port 5432
- **THEN** the start response SHALL include `portConflicts: [{ port: "5432", usedBy: "postgres" }]`
- **THEN** the start operation SHALL NOT be blocked (warning only)

#### Scenario: Multiple port conflicts
- **WHEN** the app declares ports `5432:5432` and `6379:6379`
- **AND** `postgres` uses 5432 and `redis` uses 6379
- **THEN** the response SHALL include both conflicts

#### Scenario: Port conflict with same app (restart)
- **WHEN** the app is being restarted and its own container binds the same port
- **THEN** the conflict SHALL NOT be reported (self-conflict is expected during restart)

### Requirement: Query running container port bindings
The system SHALL query all running Docker containers for their host port bindings.

#### Scenario: List all bound ports
- **WHEN** the system queries running containers
- **THEN** it SHALL return a map of port → container name for all bound host ports

#### Scenario: No running containers
- **WHEN** no containers are running
- **THEN** the port map SHALL be empty

### Requirement: Parse ports from compose file
The system SHALL extract host port bindings from the app's compose file.

#### Scenario: Standard port mapping
- **WHEN** compose file contains `ports: ["3000:3000"]`
- **THEN** the system SHALL extract host port `3000`

#### Scenario: Range port mapping
- **WHEN** compose file contains `ports: ["8080-8090:8080-8090"]`
- **THEN** the system SHALL extract the full range for conflict checking

#### Scenario: No ports declared
- **WHEN** compose file has no `ports` section
- **THEN** no conflict check is needed

### Requirement: TUI notification for port conflicts
The TUI SHALL display a warning notification when port conflicts are detected.

#### Scenario: Conflict notification on start
- **WHEN** the start response includes `portConflicts`
- **THEN** the TUI SHALL show a warning notification listing conflicting ports
- **THEN** the notification format SHALL be: "Port {port} in use by {container}"

#### Scenario: Multiple conflicts in notification
- **WHEN** multiple port conflicts exist
- **THEN** the notification SHALL list all conflicts (e.g., "Ports 5432, 6379 in use by postgres, redis")

#### Scenario: No conflict notification
- **WHEN** no port conflicts are detected
- **THEN** NO notification SHALL be shown
