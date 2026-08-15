## ADDED Requirements

### Requirement: Cross-provider endpoint strategy is explicit
The system SHALL not assume Docker and Podman containers share a network. A target binding across providers SHALL declare a supported exposure strategy.

#### Scenario: Same-provider Compose service binding
- **WHEN** Docker Compose consumer and dependency use the same provider and project network strategy
- **THEN** the system SHALL allow service-DNS endpoint binding

#### Scenario: Cross-provider host exposure binding
- **WHEN** a Docker consumer binds a Podman dependency through a declared host-published endpoint
- **THEN** the system SHALL use the configured host endpoint rather than provider network DNS
