## ADDED Requirements

### Requirement: Kubernetes targets consume endpoint bindings
The system SHALL bind resolved dependency endpoints into Kubernetes targets through configured Helm values, Kubernetes Service DNS, or managed port-forward exposure.

#### Scenario: Kubernetes-to-Kubernetes Service binding
- **WHEN** a Kubernetes target binds an endpoint exported by another Kubernetes target in the same cluster
- **THEN** the system SHALL provide the producer Service DNS endpoint without creating a host port-forward

#### Scenario: Host process consumes Kubernetes endpoint
- **WHEN** a host script target binds a Kubernetes Service endpoint configured for local exposure
- **THEN** the system SHALL start and verify a managed port-forward before launching the script
