## ADDED Requirements

### Requirement: Kubernetes profile has provider-scoped execution identity
The system SHALL resolve every Kubernetes profile to one container provider, kind cluster name, and Kubernetes context.

#### Scenario: Podman profile starts cluster
- **WHEN** a Kubernetes profile selects provider `podman`
- **THEN** all kind commands for that profile SHALL use `KIND_EXPERIMENTAL_PROVIDER=podman`
- **THEN** kubectl and Helm commands SHALL use that profile's resolved context

#### Scenario: Conflicting provider identity is rejected
- **WHEN** two configured profiles claim the same cluster or context identity with different providers
- **THEN** registry rebuild SHALL reject the configuration with both profile names

### Requirement: Kubernetes action artifacts are unique per run
The system SHALL allocate image archives and temporary Kubernetes artifacts using action-run and target identity.

#### Scenario: Concurrent image loads
- **WHEN** two Kubernetes actions load images concurrently
- **THEN** each action SHALL use a distinct archive path
- **THEN** cleanup of one archive SHALL not remove the other
