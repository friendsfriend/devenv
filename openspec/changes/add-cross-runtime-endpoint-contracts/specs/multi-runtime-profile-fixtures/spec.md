## ADDED Requirements

### Requirement: Multi-runtime fixture profiles are isolated
The system SHALL provide reusable fixture profiles for supported mixed-runtime dependency combinations. Each fixture SHALL use unique provider, cluster/context, namespace, Helm release, Compose project, and local ports.

#### Scenario: Podman Kubernetes fixture isolation
- **WHEN** the Podman Kubernetes fixture is run after a Docker fixture
- **THEN** it SHALL not reuse the Docker fixture's cluster, release, network, or local port

### Requirement: Fixture consumers verify connectivity
The system SHALL make each fixture consumer execute a real endpoint probe after dependency readiness.

#### Scenario: Kubernetes app consumes host Compose service
- **WHEN** a Kubernetes fixture depends on a host Compose database
- **THEN** fixture success SHALL require a successful database connection from the Kubernetes consumer

### Requirement: Unsupported combinations are represented as validation fixtures
The system SHALL include fixtures that assert invalid cross-provider configurations fail before execution.

#### Scenario: Unexposed Podman endpoint for Docker consumer
- **WHEN** the invalid fixture requests direct Docker-to-Podman connectivity without host exposure
- **THEN** registry validation SHALL fail with endpoint strategy guidance
