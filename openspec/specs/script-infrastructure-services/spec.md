# script-infrastructure-services

## Purpose

Configure, run, stop, and observe script-backed infrastructure services alongside Docker Compose infrastructure.
## Requirements
### Requirement: Configure script infrastructure services
The system SHALL allow infrastructure services to be defined with script runners in addition to Docker Compose services.

#### Scenario: Shell-only service is loaded
- **WHEN** infrastructure configuration defines a service with a shell script runner
- **THEN** the system SHALL list the service as a script infrastructure service
- **THEN** the service SHALL be available for manual lifecycle actions

#### Scenario: PowerShell-only service is loaded
- **WHEN** infrastructure configuration defines a service with a PowerShell script runner
- **THEN** the system SHALL list the service as a script infrastructure service
- **THEN** the service SHALL be available for manual lifecycle actions

#### Scenario: Service with both runners is loaded
- **WHEN** infrastructure configuration defines both shell and PowerShell runners for one service
- **THEN** the system SHALL preserve both runner choices
- **THEN** the system SHALL NOT silently discard either runner

### Requirement: Select runner when multiple scripts are available
The system SHALL require an explicit runner selection when a script infrastructure service has both shell and PowerShell runners and no configured default.

#### Scenario: Both runners without default
- **WHEN** the user starts a script infrastructure service that has both shell and PowerShell runners and no default runner
- **THEN** the TUI SHALL ask the user to select shell or PowerShell before starting the service

#### Scenario: Configured default runner
- **WHEN** the user starts a script infrastructure service that has both runners and a configured default runner
- **THEN** the system SHALL start the configured default runner without prompting

#### Scenario: Selected runtime is unavailable
- **WHEN** the selected runner requires shell or PowerShell support that is not available on the host
- **THEN** the service SHALL fail to start
- **THEN** the TUI SHALL show a clear missing-runtime error

### Requirement: Manually run script infrastructure services
The system SHALL provide manual start and stop actions for script infrastructure services.

#### Scenario: User starts stopped script service
- **WHEN** the user invokes start for a stopped script infrastructure service
- **THEN** the system SHALL launch the selected script runner using the service working directory, arguments, and environment
- **THEN** the service status SHALL become running when the launch succeeds

#### Scenario: User stops running script service
- **WHEN** the user invokes stop for a running script infrastructure service
- **THEN** the system SHALL terminate the captured tmux window or fallback process for that service
- **THEN** the service status SHALL become stopped after termination succeeds

#### Scenario: Start already running service
- **WHEN** the user invokes start for a script infrastructure service that is already running
- **THEN** the system SHALL NOT launch a duplicate service process
- **THEN** the TUI SHALL keep the service status as running

### Requirement: Execute script infrastructure in tmux or log-only fallback
The system SHALL run script infrastructure in a tmux window when tmux is available, and SHALL fall back to log-only execution when tmux window execution is unavailable.

#### Scenario: Tmux window execution
- **WHEN** the user starts a script infrastructure service and tmux window execution is available
- **THEN** the system SHALL create a tmux window for the script
- **THEN** the system SHALL capture the window identity for status and stop operations

#### Scenario: Log-only fallback execution
- **WHEN** the user starts a script infrastructure service and tmux window execution is unavailable
- **THEN** the system SHALL run the script as a managed background process
- **THEN** the system SHALL write stdout and stderr to the service log

#### Scenario: Service exits with failure
- **WHEN** a script infrastructure service process exits with a non-zero status
- **THEN** the service status SHALL become failed
- **THEN** the service log SHALL retain output for troubleshooting

### Requirement: Show script infrastructure status in TUI
The system SHALL show script infrastructure service status in the TUI alongside existing infrastructure status.

#### Scenario: Script service running
- **WHEN** a script infrastructure service is running in tmux or fallback mode
- **THEN** the TUI SHALL display the service as running

#### Scenario: Script service stopped
- **WHEN** a script infrastructure service is not running
- **THEN** the TUI SHALL display the service as stopped

#### Scenario: Script service failed
- **WHEN** a script infrastructure service exits with failure
- **THEN** the TUI SHALL display the service as failed
- **THEN** the user SHALL be able to inspect its log output

### Requirement: Show running app status in TUI
The system SHALL show status for running app targets in the TUI using the same lifecycle state model used for script infrastructure services.

#### Scenario: App run target is active
- **WHEN** an app run target has an active captured tmux window or managed process
- **THEN** the TUI SHALL display the app run target as running

#### Scenario: App run target exits
- **WHEN** an app run target process exits or its captured tmux target disappears
- **THEN** the TUI SHALL stop displaying that app run target as running

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

