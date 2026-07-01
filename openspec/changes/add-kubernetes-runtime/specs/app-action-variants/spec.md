## ADDED Requirements

### Requirement: Discover Kubernetes run targets
The system SHALL discover Kubernetes app run targets from Helm chart configuration and include them in normalized action target responses alongside Docker, shell, PowerShell, and systemshell targets.

#### Scenario: Kubernetes target appears in run targets
- **WHEN** an app has a discoverable Helm target in its checkout or config directory
- **THEN** the system SHALL expose a run target with runtime `kubernetes`
- **THEN** the target id SHALL be stable and distinct from Docker, shell, PowerShell, and systemshell targets for the same app and profile

#### Scenario: Kubernetes target picker entry is distinguishable
- **WHEN** the TUI shows a run target picker for an app with Kubernetes and Docker targets using profile `local`
- **THEN** the picker SHALL show both targets with labels that distinguish their runtimes

#### Scenario: Multiple Kubernetes profiles are exposed
- **WHEN** an app has multiple discovered or configured Kubernetes Helm targets
- **THEN** the system SHALL expose each target as a separate normalized run target with a distinct profile

### Requirement: Execute Kubernetes run targets through Kubernetes runtime
The system SHALL route selected Kubernetes run targets to the Kubernetes runtime executor instead of Docker Compose or shell execution paths.

#### Scenario: Kubernetes run target selected
- **WHEN** the user selects a Kubernetes run target for `my-app`
- **THEN** the backend SHALL execute the target using the managed kind and Helm lifecycle
- **THEN** the operation SHALL report progress through normal app operation status and logs

#### Scenario: Stop Kubernetes run target
- **WHEN** the user stops an app whose active run target is Kubernetes
- **THEN** the backend SHALL uninstall that app's Helm release and stop tracked port forwards for that app
- **THEN** the backend SHALL NOT invoke Docker Compose down or shell tmux termination for that target
