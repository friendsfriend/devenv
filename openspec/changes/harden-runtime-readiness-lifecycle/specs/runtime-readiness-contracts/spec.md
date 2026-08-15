## ADDED Requirements

### Requirement: Runtime readiness requires observable evidence
The system SHALL not mark a started target ready solely because its start command exited successfully unless the target explicitly configures a stabilization-only readiness policy.

#### Scenario: Process dependency exits during stabilization
- **WHEN** a script dependency process exits before its configured stabilization period ends
- **THEN** dependency readiness SHALL fail
- **THEN** the parent target SHALL not start

### Requirement: Kubernetes readiness uses workload state
The system SHALL wait for Kubernetes workload readiness using the target context, namespace, selector or release, and configured timeout.

#### Scenario: Kubernetes workload becomes ready
- **WHEN** a Kubernetes dependency release has all required workloads ready before timeout
- **THEN** the dependency SHALL be marked ready

#### Scenario: Kubernetes workload times out
- **WHEN** a Kubernetes dependency workload is not ready before configured timeout
- **THEN** the dependency SHALL fail with workload diagnostics

### Requirement: Compose readiness reports confidence
The system SHALL inspect Compose service state or health checks before marking a Compose dependency ready.

#### Scenario: Unhealthy Compose service
- **WHEN** a Compose dependency exposes an unhealthy container state
- **THEN** readiness SHALL fail and report affected containers

#### Scenario: Explicit stabilization policy
- **WHEN** a Compose target has no observable health check and config declares stabilization readiness
- **THEN** the system SHALL wait the declared interval and label readiness as stabilization-based
