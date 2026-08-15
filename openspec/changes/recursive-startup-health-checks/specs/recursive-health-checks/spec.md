## ADDED Requirements

### Requirement: Dependency-first step execution
The system SHALL resolve dependencies into dependency-first ordered steps and SHALL not start a dependent step until all dependencies are healthy.

#### Scenario: Recursive dependency chain
- **WHEN** A depends on B and B depends on C
- **THEN** the system SHALL start C, wait until healthy, start B, wait until healthy, then start A

#### Scenario: Shared dependency
- **WHEN** A and B both depend on C
- **THEN** C SHALL start once and become healthy before A or B starts

### Requirement: Docker health readiness
The system SHALL poll Docker container state every 2 seconds after starting each dependency.

#### Scenario: Healthcheck container
- **WHEN** `State.Health.Status` becomes `healthy`
- **THEN** the step SHALL become ready

#### Scenario: Container without healthcheck
- **WHEN** container has no healthcheck and `State.Running` is true
- **THEN** the step SHALL become ready

#### Scenario: Health failure or timeout
- **WHEN** status becomes `unhealthy` or readiness exceeds configurable timeout
- **THEN** step SHALL fail with dependency name and timeout
- **THEN** dependent steps SHALL not start

### Requirement: Action screen opens for triggered actions
The TUI SHALL open an action screen whenever an action is triggered.

#### Scenario: Action starts
- **WHEN** user triggers an action
- **THEN** action screen SHALL open
- **THEN** screen SHALL show ordered steps required by action

### Requirement: Step overview
The action screen SHALL show each step with lifecycle state.

#### Scenario: Active step
- **WHEN** step is executing
- **THEN** step SHALL show active loading indicator using shared splash/shutdown modal styling

#### Scenario: Completed or failed step
- **WHEN** step completes or fails
- **THEN** step SHALL show completed or failed state
- **THEN** failed state SHALL include error summary

### Requirement: Live command output
The action screen SHALL show executed commands and live stdout/stderr output.

#### Scenario: Command output arrives
- **WHEN** command emits output
- **THEN** output SHALL appear in log pane without waiting for command completion

### Requirement: Per-step logs
The action screen SHALL retain command output per step.

#### Scenario: Focus changes
- **WHEN** user focuses step
- **THEN** log pane SHALL show that step's command and accumulated output

### Requirement: Automatic focus
The action screen SHALL focus latest started step by default, then failed step when failure occurs.

#### Scenario: User has not moved focus
- **WHEN** step starts
- **THEN** focus SHALL move to most recently started step
- **WHEN** step fails
- **THEN** focus SHALL move to failed step

#### Scenario: User manually moves focus
- **WHEN** user manually changes focused step
- **THEN** automatic focus changes SHALL stop for remainder of action run

### Requirement: Structured action events
The server SHALL emit action lifecycle events containing run ID and step ID.

#### Scenario: Action lifecycle
- **WHEN** action starts, emits output, completes, or fails
- **THEN** server SHALL emit corresponding structured SSE event
- **THEN** output event SHALL identify stream and step
