## ADDED Requirements

### Requirement: Dependency execution preserves script infrastructure configuration
The system SHALL preserve selected script runner, command, arguments, working directory, environment, log path, and process handle when script infrastructure is started as a dependency.

#### Scenario: PowerShell infrastructure dependency
- **WHEN** a dependency selects a PowerShell script infrastructure target
- **THEN** the system SHALL launch its configured PowerShell runner and arguments
- **THEN** the configured environment SHALL be present in the process

#### Scenario: Script dependency readiness uses process handle
- **WHEN** a script infrastructure dependency starts as a managed process
- **THEN** readiness SHALL verify the captured process or tmux handle remains active
