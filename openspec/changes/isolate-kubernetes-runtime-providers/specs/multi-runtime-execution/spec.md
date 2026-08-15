## ADDED Requirements

### Requirement: Runtime capability gating is complete
The system SHALL evaluate every executable action against all required commands and provider reachability before presenting it as available.

#### Scenario: Missing Podman socket
- **WHEN** Podman CLI exists but its service is unreachable
- **THEN** Podman Kubernetes and Compose actions SHALL be unavailable
- **THEN** availability feedback SHALL identify the unreachable provider

#### Scenario: Missing Compose command
- **WHEN** a target requires `podman-compose` or `docker-compose` and that command is unavailable
- **THEN** the target action SHALL be unavailable before execution
