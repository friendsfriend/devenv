## ADDED Requirements

### Requirement: Targets declare endpoint exports
The system SHALL allow runnable targets to declare named endpoint exports with protocol, port, exposure strategy, and readiness probe metadata.

#### Scenario: Kubernetes Service export
- **WHEN** a Kubernetes target exports endpoint `database` from Service `postgres` port `5432`
- **THEN** the action graph SHALL publish a typed endpoint value after the Service and workload are ready

### Requirement: Targets bind dependency endpoints
The system SHALL allow a target to bind a named dependency endpoint to shell environment, Compose interpolation, or Helm value path.

#### Scenario: Shell consumer receives endpoint
- **WHEN** a shell target binds dependency endpoint `database` to `DATABASE_URL`
- **THEN** the process environment SHALL contain the resolved endpoint value before launch

#### Scenario: Helm consumer receives endpoint
- **WHEN** a Kubernetes target binds dependency endpoint `cache` to Helm value path `redis.url`
- **THEN** Helm install or upgrade SHALL receive the resolved endpoint through that value path

### Requirement: Cross-runtime exposure is explicit and validated
The system SHALL validate exposure strategy compatibility before starting a consumer.

#### Scenario: Kubernetes consumer reaches host Compose endpoint
- **WHEN** a Kubernetes consumer binds a Docker or Podman Compose endpoint exposed through a configured host gateway strategy
- **THEN** the system SHALL validate provider gateway support and published host port before starting the consumer

#### Scenario: Direct Docker-to-Podman network is rejected
- **WHEN** a Docker consumer binds a Podman endpoint without an explicit host-published exposure strategy
- **THEN** validation SHALL fail before either target starts
