## MODIFIED Requirements

### Requirement: Normalize action targets for clients
The system SHALL compile configured app operation targets into normalized backend action definitions so clients do not parse config filenames, derive step structure, or synthesize runtime targets.

#### Scenario: Client requests run actions
- **WHEN** the TUI requests registered actions for `my-app`
- **THEN** the response SHALL include each action's stable id, owner, type, runtime, label, profile when applicable, input schema, availability, and semantic step tree

#### Scenario: Action ids distinguish runtime and profile
- **WHEN** Docker and shell run actions both use profile name `dev`
- **THEN** the system SHALL expose stable distinct action ids for the Docker `dev` action and shell `dev` action

### Requirement: Select action target before execution
The TUI SHALL start a single available backend action definition directly and SHALL show an action picker when multiple available definitions exist for the selected operation type.

#### Scenario: Single build action runs directly
- **WHEN** the user triggers Build for an app with exactly one available registered build action
- **THEN** the TUI SHALL start that action ID without showing a picker

#### Scenario: Multiple build actions show picker
- **WHEN** the user triggers Build for an app with both Docker and shell build actions
- **THEN** the TUI SHALL show a picker populated from backend action definitions before starting the build

#### Scenario: Run picker shows Docker and shell actions
- **WHEN** the user triggers Run for an app with Docker Compose profiles and shell run profiles
- **THEN** the TUI SHALL show one picker containing both backend-provided Docker and shell actions

#### Scenario: No configured actions shows error
- **WHEN** the user triggers Test for an app with no available registered test action
- **THEN** the TUI SHALL show a clear message that no test action is configured or available

## ADDED Requirements

### Requirement: Start selected variants by backend action ID
The TUI SHALL start configured app variants through the backend action-run API using the selected stable action ID and validated action inputs.

#### Scenario: Docker profile selected
- **WHEN** the user selects Docker run profile `redis`
- **THEN** the TUI SHALL submit its backend action ID
- **THEN** the TUI SHALL NOT reconstruct a Compose filename or call a Docker-specific start endpoint
