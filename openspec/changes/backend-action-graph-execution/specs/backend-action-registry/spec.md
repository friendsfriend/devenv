## ADDED Requirements

### Requirement: Compile actions from existing configuration conventions
The backend SHALL compile application and infrastructure actions from existing DevEnv configuration conventions during startup and atomic registry reload. The system SHALL NOT require a user-authored action graph format.

#### Scenario: Startup compiles configured actions
- **WHEN** configuration contains Docker, shell, Kubernetes, Git, infrastructure, or task action resources
- **THEN** the backend SHALL register normalized action definitions for the owning resource
- **THEN** each definition SHALL include stable identity, type, runtime, label, inputs, availability, and a semantic step tree

#### Scenario: Invalid graph prevents publication
- **WHEN** compilation finds a missing dependency, cycle, missing required input producer, incompatible value type, or duplicate stable action ID
- **THEN** the backend SHALL reject the invalid registry snapshot
- **THEN** diagnostics SHALL identify the configuration source and validation failure

### Requirement: Provide stable action and step identities
Action and step definition IDs SHALL derive from stable configuration identity and SHALL NOT depend on local absolute checkout paths, array positions, or display labels.

#### Scenario: Config checkout path changes
- **WHEN** the same config repository is loaded at a different filesystem path
- **THEN** equivalent action and step definitions SHALL retain the same IDs

#### Scenario: Runtime and profile distinguish actions
- **WHEN** an app has Docker and systemshell run actions for profile `dev`
- **THEN** the registry SHALL expose distinct stable action IDs containing equivalent app, action type, runtime, and profile identity

### Requirement: Maintain versioned immutable registry snapshots
The backend SHALL publish registry updates atomically and SHALL retain the definition snapshot used by every started run.

#### Scenario: Configuration reload succeeds
- **WHEN** changed configuration compiles and validates successfully
- **THEN** new queries SHALL observe one complete new registry version
- **THEN** active runs SHALL continue using their original definition snapshot

#### Scenario: Configuration reload fails
- **WHEN** changed configuration fails compilation or validation
- **THEN** the backend SHALL retain the previous valid registry snapshot
- **THEN** the backend SHALL expose reload diagnostics

### Requirement: Expose backend action definitions to clients
The backend SHALL provide APIs to list actions for a resource, inspect an action definition, and start a run by stable action ID and validated inputs.

#### Scenario: TUI lists app actions
- **WHEN** the TUI requests actions for an application
- **THEN** the backend SHALL return registered definitions without requiring the TUI to parse filenames or synthesize targets

#### Scenario: TUI starts selected action
- **WHEN** the TUI submits a registered action ID with valid input
- **THEN** the backend SHALL instantiate that definition through the shared execution engine

#### Scenario: Invalid action input
- **WHEN** a client starts an action with missing, unknown, or invalid input
- **THEN** the backend SHALL reject the request before executing any step
- **THEN** the response SHALL identify the invalid input

### Requirement: Represent checkout-derived availability
The registry SHALL preserve stable convention-backed action identities where possible and SHALL expose current availability separately from identity.

#### Scenario: Required checkout file is absent
- **WHEN** a convention-backed action is known but its active checkout lacks a required Makefile, script, or source resource
- **THEN** the action SHALL be unavailable with a reason
- **THEN** starting it SHALL be rejected before execution

### Requirement: Persist display-safe definition snapshots with runs
Action history SHALL store enough immutable definition metadata to render prior runs after registry changes and SHALL NOT persist secret or executable provider state.

#### Scenario: Action removed after completion
- **WHEN** a completed action definition is removed from current configuration
- **THEN** its historical run SHALL retain action and step labels, kinds, hierarchy, and identity metadata

#### Scenario: Definition contains secret input
- **WHEN** an action uses secret values
- **THEN** persisted definition and run snapshots SHALL contain only secret handles or redacted metadata
