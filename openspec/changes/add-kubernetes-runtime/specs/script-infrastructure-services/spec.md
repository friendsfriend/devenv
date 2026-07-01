## ADDED Requirements

### Requirement: Configure Kubernetes infrastructure services
The system SHALL allow infrastructure services to be defined with Kubernetes Helm targets in addition to Docker Compose and script-backed services.

#### Scenario: Kubernetes infrastructure service is loaded
- **WHEN** infrastructure configuration defines service `postgres` with a Kubernetes Helm target
- **THEN** the system SHALL list `postgres` as an infrastructure service
- **THEN** the service SHALL be available for manual start and stop actions from the infrastructure view

#### Scenario: Kubernetes infrastructure exposes runtime target
- **WHEN** a Kubernetes infrastructure service has profile `local`
- **THEN** dependency resolution SHALL be able to address it with infrastructure `postgres`, runtime `kubernetes`, and profile `local`

### Requirement: Manually run Kubernetes infrastructure services
The system SHALL provide manual start and stop actions for Kubernetes infrastructure services using Helm release lifecycle in the managed kind cluster.

#### Scenario: User starts stopped Kubernetes infrastructure
- **WHEN** the user invokes start for a stopped Kubernetes infrastructure service
- **THEN** the system SHALL ensure the managed kind cluster and namespace exist
- **THEN** the system SHALL install the configured Helm release
- **THEN** the service status SHALL become running when the release is deployed

#### Scenario: User stops running Kubernetes infrastructure
- **WHEN** the user invokes stop for a running Kubernetes infrastructure service
- **THEN** the system SHALL uninstall that service's Helm release
- **THEN** the service status SHALL become stopped after uninstall succeeds

#### Scenario: Start already running Kubernetes infrastructure
- **WHEN** the user invokes start for a Kubernetes infrastructure service whose Helm release is already deployed
- **THEN** the system SHALL NOT uninstall or reinstall the release
- **THEN** the TUI SHALL keep the service status as running

### Requirement: Show Kubernetes infrastructure status in TUI
The system SHALL show status for Kubernetes infrastructure services alongside Docker and script infrastructure services.

#### Scenario: Kubernetes infrastructure running
- **WHEN** a Kubernetes infrastructure service's Helm release is deployed in the managed kind cluster
- **THEN** the TUI SHALL display the service as running

#### Scenario: Kubernetes infrastructure stopped
- **WHEN** a Kubernetes infrastructure service's Helm release is not present in the managed kind cluster
- **THEN** the TUI SHALL display the service as stopped

#### Scenario: Kubernetes infrastructure failed
- **WHEN** Helm install fails or workloads for the infrastructure release fail
- **THEN** the TUI SHALL display the service as failed
- **THEN** the user SHALL be able to inspect relevant logs or diagnostics when available
