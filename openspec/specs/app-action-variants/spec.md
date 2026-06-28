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

