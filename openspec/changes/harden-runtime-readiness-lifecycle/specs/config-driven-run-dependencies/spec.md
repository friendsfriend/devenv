## ADDED Requirements

### Requirement: Dependency start waits for runtime-specific readiness
The system SHALL start dependencies in resolved order and SHALL wait for their runtime-specific readiness contracts before starting the requesting target.

#### Scenario: Dependency readiness failure prevents parent start
- **WHEN** any resolved dependency fails readiness
- **THEN** the system SHALL not start the requesting target
- **THEN** action history SHALL identify the failing dependency and readiness evidence

### Requirement: Dependency lifecycle mode controls stop behavior
The system SHALL apply each dependency reference lifecycle mode when stopping or restarting the requesting target.

#### Scenario: Restart revalidates shared dependency
- **WHEN** a target with a shared dependency is restarted
- **THEN** the system SHALL revalidate dependency readiness before restarting the target
- **THEN** the system SHALL not stop the shared dependency
