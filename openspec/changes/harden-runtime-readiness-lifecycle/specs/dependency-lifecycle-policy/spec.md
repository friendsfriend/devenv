## ADDED Requirements

### Requirement: Dependencies declare lifecycle policy
The system SHALL support `shared`, `owned`, and `external` lifecycle modes on dependency references. Omitted lifecycle mode SHALL mean `shared`.

#### Scenario: Shared dependency remains after app stop
- **WHEN** an app with a shared dependency is stopped
- **THEN** the system SHALL stop only the app target
- **THEN** the shared dependency SHALL remain running

#### Scenario: External dependency is not started
- **WHEN** an app depends on an external target
- **THEN** the system SHALL verify readiness without issuing a start or stop command

#### Scenario: Owned dependency releases after final owner stops
- **WHEN** two running app targets own the same dependency and one app stops
- **THEN** the dependency SHALL remain running
- **WHEN** the final owner stops
- **THEN** the system SHALL stop the owned dependency

### Requirement: Manual dependency stop protects active dependents
The system SHALL detect active dependent leases before manually stopping an owned dependency.

#### Scenario: Manual stop with active owner
- **WHEN** a user stops a dependency with an active owned dependent
- **THEN** the system SHALL require explicit cascade confirmation or reject the stop with dependent details
