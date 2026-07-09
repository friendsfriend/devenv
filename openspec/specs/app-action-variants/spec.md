# app-action-variants Specification

## Purpose
TBD - created by archiving change add-shell-action-variants. Update Purpose after archive.
## Requirements
### Requirement: Discover configured action targets
The system SHALL discover configured build, test, and run targets for each app from config repository files. The system SHALL NOT expose an implicit default target when no corresponding Docker or shell resource exists.

#### Scenario: Build targets include Docker and shell files
- **WHEN** `apps/build/my-app-build.Dockerfile` and `apps/build/my-app-build.sh` exist
- **THEN** the system SHALL expose two build targets for `my-app`: one Docker target and one shell target

#### Scenario: Test target is absent when no files exist
- **WHEN** neither `apps/build/my-app-test.Dockerfile` nor `apps/build/my-app-test.sh` exists
- **THEN** the system SHALL expose no test targets for `my-app`

#### Scenario: Run targets include Docker compose and shell profiles
- **WHEN** `apps/compose/my-app-compose.yml`, `apps/compose/my-app-redis-compose.yml`, and `apps/run/my-app-dev.sh` exist
- **THEN** the system SHALL expose Docker run targets for `default` and `redis`
- **THEN** the system SHALL expose a shell run target for `dev`

### Requirement: Normalize action targets for clients
The system SHALL provide normalized action target data for app operations so clients do not parse config filenames directly.

#### Scenario: Client requests run targets
- **WHEN** the TUI requests run targets for `my-app`
- **THEN** the response SHALL include each target's id, action, runtime, label, profile when applicable, launch mode when applicable, and source path

#### Scenario: Target ids distinguish runtime and profile
- **WHEN** Docker and shell run targets both use profile name `dev`
- **THEN** the system SHALL expose stable distinct ids for the Docker `dev` target and shell `dev` target

### Requirement: Select action target before execution
The TUI SHALL execute a single configured target directly and SHALL show an action target picker when multiple targets exist for the selected action.

#### Scenario: Single build target runs directly
- **WHEN** the user triggers Build for an app with exactly one build target
- **THEN** the TUI SHALL start that target without showing a picker

#### Scenario: Multiple build targets show picker
- **WHEN** the user triggers Build for an app with both Docker and shell build targets
- **THEN** the TUI SHALL show a target picker before starting the build

#### Scenario: Run picker shows Docker and shell targets
- **WHEN** the user triggers Run for an app with Docker compose profiles and shell run profiles
- **THEN** the TUI SHALL show one picker containing both Docker and shell run targets

#### Scenario: No configured targets shows error
- **WHEN** the user triggers Test for an app with no test targets
- **THEN** the TUI SHALL show a clear message that no test target is configured

### Requirement: Execute Docker action targets
The system SHALL execute Docker action targets using existing Dockerfile and compose behavior for the selected target.

#### Scenario: Docker build target selected
- **WHEN** the user selects the Docker build target for `my-app`
- **THEN** the system SHALL build using `apps/build/my-app-build.Dockerfile`

#### Scenario: Docker run profile selected
- **WHEN** the user selects Docker run profile `redis` for `my-app`
- **THEN** the system SHALL run using `apps/compose/my-app-redis-compose.yml`

### Requirement: Stop Docker-compatible run targets through selected target
The system SHALL stop Docker-compatible app run targets using the selected or active run target's configured compose file when that target is known.

#### Scenario: Stop selected Docker profile target
- **WHEN** the user starts app `my-app` from Docker run profile `redis`
- **AND** the user stops `my-app`
- **THEN** the backend SHALL stop the Docker run target for profile `redis`
- **THEN** the compose stop command SHALL include the configured compose file for `redis`

#### Scenario: Stop selected Podman profile target
- **WHEN** `DEVENV_CONTAINER_RUNTIME` resolves to Podman
- **AND** the user starts app `my-app` from a profile picker target whose compose file is in the DevEnv config directory
- **AND** the user stops `my-app`
- **THEN** the backend SHALL run the Podman compose stop using the configured compose file path
- **THEN** the backend SHALL NOT run an unqualified `podman-compose down` that relies on a compose file in the app repository

#### Scenario: Stop preserves dependency semantics
- **WHEN** the user stops an app whose Docker-compatible run target has app or infrastructure dependencies
- **THEN** the system SHALL stop only the requested app run target
- **THEN** the system SHALL leave dependencies running

### Requirement: Execute shell build and test targets
The system SHALL execute shell build and test targets by running their configured `.sh` file with the app checkout directory as the working directory and app-scoped logging enabled.

#### Scenario: Shell build target selected
- **WHEN** the user selects the shell build target for `my-app`
- **THEN** the system SHALL run `apps/build/my-app-build.sh` with `my-app`'s local checkout as the working directory
- **THEN** the system SHALL write command output to the app operation logs

#### Scenario: Shell test target fails
- **WHEN** `apps/build/my-app-test.sh` exits with a non-zero status
- **THEN** the system SHALL mark the test operation as failed
- **THEN** the system SHALL surface the failure in operation status and logs

### Requirement: Discover shell run profiles from script files
The system SHALL discover shell run profiles from files named `apps/run/<app-ident>-<profile>.sh`.

#### Scenario: Shell run profile discovered
- **WHEN** `apps/run/my-app-dev.sh` exists
- **THEN** the system SHALL expose a shell run target with profile `dev`

#### Scenario: Non-matching shell run file ignored
- **WHEN** `apps/run/other-app-dev.sh` exists while listing targets for `my-app`
- **THEN** the system SHALL NOT expose that file as a target for `my-app`

### Requirement: Shell script metadata controls label and launch mode
The system SHALL read optional `devenv` metadata comments from shell action scripts. Shell run scripts SHALL default to launch mode `tmux` when no launch mode is specified. Shell build and test scripts SHALL default to logged execution when no launch mode is specified.

#### Scenario: Metadata label is used
- **WHEN** `apps/run/my-app-dev.sh` contains `# devenv:name=Dev TUI`
- **THEN** the target label SHALL be `Dev TUI`

#### Scenario: Run script defaults to tmux
- **WHEN** `apps/run/my-app-dev.sh` does not declare a `devenv:mode`
- **THEN** the target launch mode SHALL be `tmux`

#### Scenario: Build script defaults to logged execution
- **WHEN** `apps/build/my-app-build.sh` does not declare a `devenv:mode`
- **THEN** the target launch mode SHALL be `logged`

### Requirement: Execute shell run targets in tmux
The system SHALL execute shell run targets with launch mode `tmux` by opening the script in a new tmux window with the app checkout directory as the working directory.

#### Scenario: Tmux run target selected inside tmux
- **WHEN** the user selects shell run profile `dev` for `my-app` and the DevEnv server process is running inside tmux
- **THEN** the system SHALL open a new tmux window for `apps/run/my-app-dev.sh`
- **THEN** the tmux window working directory SHALL be `my-app`'s local checkout

#### Scenario: Tmux unavailable
- **WHEN** the user selects a shell run target with launch mode `tmux` and the DevEnv server process cannot access tmux
- **THEN** the system SHALL fail the operation with a clear user-visible error
- **THEN** the system SHALL NOT run the script in a hidden background process

### Requirement: Track and control shell tmux runs
The system SHALL track active shell tmux run targets so stop and restart can control the launched tmux window.

#### Scenario: Shell tmux run stores window id
- **WHEN** a shell run target launches successfully in tmux
- **THEN** the system SHALL store the tmux window id with the app ident and target id

#### Scenario: Stop shell tmux run
- **WHEN** the user triggers Stop for an app with an active shell tmux run
- **THEN** the system SHALL kill the tracked tmux window
- **THEN** the system SHALL clear the active shell run state for that app

#### Scenario: Restart shell tmux run
- **WHEN** the user triggers Restart for an app with an active shell tmux run
- **THEN** the system SHALL stop the tracked tmux window
- **THEN** the system SHALL launch the same shell run target again

### Requirement: Configure shell action scripts from the TUI
The TUI SHALL allow users to create and edit per-app shell build, test, and run scripts using the config repository layout.

#### Scenario: Create shell run profile
- **WHEN** the user adds shell run profile `dev` for `my-app` from the TUI
- **THEN** the system SHALL create `apps/run/my-app-dev.sh`
- **THEN** the created file SHALL contain a shell script template with `devenv` metadata comments

#### Scenario: Edit shell build command
- **WHEN** the user edits the shell build command for `my-app` from the TUI
- **THEN** the system SHALL update `apps/build/my-app-build.sh`
- **THEN** subsequent build target discovery SHALL include the updated shell build target

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

### Requirement: Provide picker-style target display metadata for executed run targets
The system SHALL provide enough metadata from executed app run targets to reproduce the same user-facing target text used by the target picker.

#### Scenario: Executed target display matches picker convention
- **WHEN** the user selects a run target that the picker renders as `[tmux] bun build (default)`
- **THEN** the executed run target metadata SHALL expose display text `[tmux] bun build (default)` for status and TUI presentation

#### Scenario: Target display uses runtime badge
- **WHEN** the user selects a non-tmux run target with runtime `docker`, `powershell`, `systemshell`, or `kubernetes`
- **THEN** the executed run target metadata SHALL use a runtime badge matching the picker convention, such as `[docker]`, `[powershell]`, `[systemshell]`, or `[kubernetes]`

#### Scenario: Target display includes profile when applicable
- **WHEN** the selected action target has a profile
- **THEN** the executed run target metadata SHALL include that profile in parentheses in the display text

#### Scenario: Profile-only start path resolves target metadata
- **WHEN** an app is started through the legacy start request containing an app ident and profile without a target id
- **THEN** the system SHALL resolve the matching Docker run action target and record picker-style target metadata for the launched target

