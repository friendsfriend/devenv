## ADDED Requirements

### Requirement: Kind lifecycle actions are provider scoped
The system SHALL create, delete, recreate, export, and inspect a kind cluster using the selected profile provider and resolved cluster name.

#### Scenario: Delete Podman-backed cluster
- **WHEN** a user deletes a Kubernetes profile backed by Podman
- **THEN** the system SHALL invoke kind with `KIND_EXPERIMENTAL_PROVIDER=podman`
- **THEN** the system SHALL delete only that profile's cluster name

#### Scenario: Cluster view identifies provider
- **WHEN** a managed Kubernetes profile is displayed
- **THEN** the cluster view SHALL show its provider, cluster name, and context
