## ADDED Requirements

### Requirement: Preserve dependency graph across execution variants
The system SHALL compile dependencies once from the resolved target graph and SHALL apply them to shell, PowerShell, system shell, tmux, Docker, Podman, and Kubernetes execution variants.

#### Scenario: Tmux run has dependencies
- **WHEN** a tmux app run target declares dependencies
- **THEN** the system SHALL start and validate those dependencies before creating the tmux window

#### Scenario: PowerShell run depends on Compose target
- **WHEN** a PowerShell app run target depends on a provider-qualified Compose target
- **THEN** the system SHALL invoke the selected Compose provider command before launching PowerShell
