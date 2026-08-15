## ADDED Requirements

### Requirement: Dependencies expose typed endpoint values
The system SHALL let dependency declarations name exports required by the consuming target and SHALL make resolved endpoint values available only after producer readiness.

#### Scenario: Required endpoint is absent
- **WHEN** a consumer requires an endpoint export not declared by its resolved dependency target
- **THEN** registry validation SHALL fail before the dependency starts

### Requirement: Dependency endpoints participate in start validation
The system SHALL validate endpoint bindings together with dependency target resolution before starting any member of the graph.

#### Scenario: Conflicting local port binding
- **WHEN** two resolved endpoint bindings require the same local port
- **THEN** validation SHALL fail and name both bindings
