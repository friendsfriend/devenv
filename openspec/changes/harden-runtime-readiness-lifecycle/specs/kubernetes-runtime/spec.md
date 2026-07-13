## ADDED Requirements

### Requirement: Kubernetes cleanup is scoped to current action changes
The system SHALL execute destructive Kubernetes cleanup only for a release resource created or upgraded by the current action run.

#### Scenario: Image check fails before Helm action
- **WHEN** Kubernetes image availability fails before Helm install or upgrade
- **THEN** the system SHALL not uninstall an existing release

#### Scenario: Current run installs release then readiness fails
- **WHEN** the current action successfully changes a Helm release and subsequent workload readiness fails
- **THEN** the system SHALL apply configured failed-release cleanup only to that release
- **THEN** action history SHALL show why cleanup was eligible

### Requirement: Kubernetes wait configuration controls readiness
The system SHALL use configured Kubernetes wait timeout for workload readiness.

#### Scenario: Configured timeout is honored
- **WHEN** a Kubernetes target configures wait timeout `5m`
- **THEN** workload readiness SHALL wait no longer than five minutes before failing
