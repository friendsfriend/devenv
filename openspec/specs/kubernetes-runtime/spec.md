## MODIFIED Requirements

### Requirement: Manage a local kind cluster for Kubernetes runs
The system SHALL run Kubernetes app and infrastructure targets only against a DevEnv-managed kind cluster and SHALL NOT use the ambient current Kubernetes context. The system SHALL create the managed kind cluster lazily when a Kubernetes run requires it and the cluster does not exist.

#### Scenario: Missing kind cluster is created
- **WHEN** the user starts a Kubernetes run target and the managed kind cluster does not exist
- **THEN** the system SHALL create the kind cluster using the configured container runtime provider
- **THEN** subsequent Kubernetes and Helm commands SHALL target the managed kind context explicitly

#### Scenario: Existing managed cluster is reused
- **WHEN** the managed kind cluster already exists
- **THEN** the system SHALL reuse it instead of creating a duplicate cluster

#### Scenario: Current kube context is ignored
- **WHEN** the user's current kube context points to another cluster
- **THEN** the system SHALL still execute Kubernetes operations against the managed kind context

#### Scenario: Required tools are missing
- **WHEN** `kind`, `kubectl`, `helm`, or the selected container runtime is unavailable
- **THEN** the system SHALL fail before starting any Kubernetes target
- **THEN** the user-visible error SHALL identify the missing tool or unavailable runtime

#### Scenario: Cluster is explicitly created before run
- **WHEN** the user creates the managed kind cluster before starting a Kubernetes run target
- **THEN** the subsequent Kubernetes run SHALL reuse that cluster
- **THEN** the run SHALL NOT create a duplicate cluster

## ADDED Requirements

### Requirement: Clean Kubernetes runtime state after cluster deletion
The system SHALL clear local Kubernetes runtime state after the managed kind cluster is deleted successfully.

#### Scenario: Cluster deletion succeeds
- **WHEN** the managed kind cluster is deleted through DevEnv cluster management
- **THEN** the system SHALL stop all tracked Kubernetes port-forward processes
- **THEN** the system SHALL clear cached Kubernetes app run target status that depends on the deleted cluster
- **THEN** the system SHALL mark Kubernetes infrastructure service status as stopped or force a refresh that reports it as stopped
- **THEN** the system SHALL notify the TUI so displayed Kubernetes app and infrastructure statuses no longer appear running

#### Scenario: Cluster deletion fails
- **WHEN** managed kind cluster deletion fails
- **THEN** the system SHALL keep existing Kubernetes runtime state until a successful refresh proves otherwise
- **THEN** the system SHALL show the deletion failure to the user
