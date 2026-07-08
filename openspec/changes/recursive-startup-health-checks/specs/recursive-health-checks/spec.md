## ADDED Requirements

### Requirement: Wait for dependency health before starting dependent apps
The system SHALL wait for each dependency to be healthy before starting the next target in the dependency plan.

#### Scenario: Simple dependency chain
- **WHEN** `frontend` depends on `backend` which depends on `postgres`
- **THEN** the system SHALL start `postgres` first
- **THEN** the system SHALL wait for `postgres` to be healthy
- **THEN** the system SHALL start `backend`
- **THEN** the system SHALL wait for `backend` to be healthy
- **THEN** the system SHALL start `frontend`

#### Scenario: Already-running dependency is skipped
- **WHEN** a dependency is already running and healthy
- **THEN** the system SHALL skip it and proceed to the next target
- **THEN** no health check wait SHALL occur for that dependency

#### Scenario: Shared dependency started once
- **WHEN** both `backend` and `worker` depend on `postgres`
- **THEN** `postgres` SHALL be started and made healthy before either `backend` or `worker`
- **THEN** `postgres` SHALL NOT be started twice

### Requirement: Health check via Docker inspect
The system SHALL determine container health by polling Docker container state.

#### Scenario: Container with healthcheck
- **WHEN** a container has a Docker healthcheck configured
- **THEN** the system SHALL poll `docker inspect` for `State.Health.Status`
- **THEN** the container SHALL be considered healthy when status is `healthy`

#### Scenario: Container without healthcheck
- **WHEN** a container has no Docker healthcheck
- **THEN** the system SHALL consider it healthy when `State.Running` is `true`

#### Scenario: Container healthcheck reports unhealthy
- **WHEN** a container's healthcheck reports `unhealthy`
- **THEN** the system SHALL consider the dependency failed
- **THEN** the entire start operation SHALL fail with an error identifying the unhealthy dependency

### Requirement: Health check timeout
The system SHALL enforce a timeout per dependency health check.

#### Scenario: Dependency becomes healthy within timeout
- **WHEN** a dependency becomes healthy within 60 seconds
- **THEN** the system SHALL proceed to start the next target

#### Scenario: Dependency times out
- **WHEN** a dependency does not become healthy within 60 seconds
- **THEN** the system SHALL abort the start operation
- **THEN** the error message SHALL identify the timed-out dependency and the duration

#### Scenario: Health check poll interval
- **WHEN** polling for container health
- **THEN** the system SHALL poll every 2 seconds

### Requirement: Emit dependency startup progress events
The system SHALL emit SSE events showing dependency startup progress.

#### Scenario: Dependency starting
- **WHEN** the system starts a dependency container
- **THEN** it SHALL emit `{ type: "dependency.starting", app: "postgres", status: "starting" }`

#### Scenario: Dependency healthy
- **WHEN** a dependency becomes healthy
- **THEN** it SHALL emit `{ type: "dependency.starting", app: "postgres", status: "healthy" }`

#### Scenario: Dependency failed
- **WHEN** a dependency fails health check or times out
- **THEN** it SHALL emit `{ type: "dependency.starting", app: "postgres", status: "failed" }`

### Requirement: TUI displays dependency startup progress
The TUI SHALL show which dependencies are being started in the main table.

#### Scenario: Dependency startup in status column
- **WHEN** a dependency is being started
- **THEN** the status column for that app SHALL show "⏳ Starting dependency: postgres"

#### Scenario: Dependency ready
- **WHEN** a dependency becomes healthy
- **THEN** the status column SHALL update to show the dependency is ready

#### Scenario: Dependency failed
- **WHEN** a dependency fails or times out
- **THEN** the status column SHALL show the failure status
- **THEN** a notification SHALL appear with the error details
