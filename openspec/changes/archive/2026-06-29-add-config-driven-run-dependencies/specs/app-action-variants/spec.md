## ADDED Requirements

### Requirement: Discover PowerShell and systemshell run targets
The system SHALL discover PowerShell run targets and `systemshell` run targets from app run script files.

#### Scenario: PowerShell run profile discovered
- **WHEN** `apps/run/my-app-dev.ps1` exists
- **THEN** the system SHALL expose a PowerShell run target with profile `dev`

#### Scenario: Systemshell run target on Unix
- **WHEN** `apps/run/my-app-dev.sh` exists and the host is macOS or Linux
- **THEN** the system SHALL expose a `systemshell` run target with profile `dev`
- **THEN** executing that target SHALL run the shell script

#### Scenario: Systemshell run target on Windows
- **WHEN** `apps/run/my-app-dev.ps1` exists and the host is Windows
- **THEN** the system SHALL expose a `systemshell` run target with profile `dev`
- **THEN** executing that target SHALL run the PowerShell script

#### Scenario: Systemshell missing Windows script fails
- **WHEN** the host is Windows and `apps/run/my-app-dev.ps1` does not exist
- **WHEN** the user or dependency graph resolves `my-app` runtime `systemshell` profile `dev`
- **THEN** the system SHALL fail with a clear missing PowerShell script error

#### Scenario: Systemshell missing Unix script fails
- **WHEN** the host is macOS or Linux and `apps/run/my-app-dev.sh` does not exist
- **WHEN** the user or dependency graph resolves `my-app` runtime `systemshell` profile `dev`
- **THEN** the system SHALL fail with a clear missing shell script error

### Requirement: Target ids distinguish runtime and profile
The system SHALL expose stable distinct target ids for app action targets using app ident, action, runtime, and profile.

#### Scenario: Docker and systemshell targets share profile
- **WHEN** `apps/compose/my-app-dev-compose.yml` and `apps/run/my-app-dev.sh` exist
- **THEN** the system SHALL expose separate target ids for Docker profile `dev` and `systemshell` profile `dev`

#### Scenario: Shell and PowerShell targets share profile
- **WHEN** `apps/run/my-app-dev.sh` and `apps/run/my-app-dev.ps1` exist
- **THEN** the system SHALL expose separate target ids for shell profile `dev` and PowerShell profile `dev`

#### Scenario: Canonical run target id includes runtime
- **WHEN** the system exposes a Docker run target and a systemshell run target for app `backend` profile `dev`
- **THEN** the target ids SHALL identify `app/backend/run/docker/dev` and `app/backend/run/systemshell/dev` or equivalent stable runtime-specific ids

### Requirement: Run target metadata includes dependencies
The system SHALL include parsed run dependencies in normalized action target data for clients.

#### Scenario: Client requests target with dependencies
- **WHEN** the TUI requests run targets for `frontend`
- **THEN** each returned run target SHALL include parsed dependency references when configured

#### Scenario: Target picker distinguishes same-profile runtimes
- **WHEN** the TUI shows a run target picker for an app with Docker and systemshell targets using profile `dev`
- **THEN** the picker SHALL show both targets with labels that distinguish runtime

### Requirement: Execute PowerShell run targets
The system SHALL execute PowerShell run targets by running their configured `.ps1` file with the app checkout directory as the working directory and app-scoped logging/status enabled.

#### Scenario: PowerShell run target selected
- **WHEN** the user selects PowerShell run profile `dev` for `my-app`
- **THEN** the system SHALL run `apps/run/my-app-dev.ps1` using PowerShell
- **THEN** the working directory SHALL be `my-app`'s local checkout

#### Scenario: PowerShell runtime unavailable
- **WHEN** the user selects a PowerShell run target and PowerShell is not available
- **THEN** the operation SHALL fail with a clear user-visible error
