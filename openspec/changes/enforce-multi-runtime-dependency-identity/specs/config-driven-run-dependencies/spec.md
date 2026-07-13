## MODIFIED Requirements

### Requirement: Use object dependency references
The system SHALL support object-based dependency references for app run targets and infrastructure services. A reference SHALL select one canonical target by logical runtime, profile, and provider when that target has provider variants.

#### Scenario: App dependency reference
- **WHEN** metadata contains `{ "app": "backend", "runtime": "docker", "profile": "dev", "provider": "podman" }`
- **THEN** the system SHALL resolve it to the backend app run target with runtime `docker`, profile `dev`, and provider `podman`

#### Scenario: Infra dependency reference
- **WHEN** metadata contains `{ "infra": "redis", "runtime": "docker", "profile": "local", "provider": "docker" }`
- **THEN** the system SHALL resolve it to the Docker infrastructure target for `redis` profile `local`

#### Scenario: Ambiguous provider is invalid
- **WHEN** metadata references a Docker logical target that has both Docker and Podman provider variants without a provider selector or configured target default
- **THEN** dependency validation SHALL fail with an error requiring provider selection

#### Scenario: App dependency without runtime is invalid
- **WHEN** metadata contains `{ "app": "backend", "profile": "dev" }`
- **THEN** dependency validation SHALL fail with an error requiring `runtime`

#### Scenario: App dependency without profile is invalid
- **WHEN** metadata contains `{ "app": "backend", "runtime": "systemshell" }`
- **THEN** dependency validation SHALL fail with an error requiring `profile`

#### Scenario: App dependencies always target run actions
- **WHEN** metadata contains an app dependency reference
- **THEN** the system SHALL resolve it as an app run target
- **THEN** the metadata SHALL NOT require or accept an action field for build or test

### Requirement: Resolve dependency graph before starting app run target
The system SHALL resolve and validate the complete dependency graph before starting any target, and SHALL compile the exact resolved target metadata into executable steps.

#### Scenario: Missing dependency prevents start
- **WHEN** a dependency reference targets an unknown app run target or infrastructure service
- **THEN** registry rebuild SHALL report the missing target before any action starts
- **THEN** the system SHALL NOT emit a generic fallback dependency operation

#### Scenario: Dependency cycle prevents publication
- **WHEN** dependencies form a cycle between app run targets or infrastructure targets
- **THEN** registry rebuild SHALL reject the affected action definitions
- **THEN** the diagnostic SHALL include the cycle chain
