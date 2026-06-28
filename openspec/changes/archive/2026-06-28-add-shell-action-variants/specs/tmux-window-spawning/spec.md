## ADDED Requirements

### Requirement: Spawn app run scripts in named tmux windows
When a shell app run target uses launch mode `tmux`, the system SHALL open the script in a new tmux window named for DevEnv, the app, and the run profile.

#### Scenario: App run script launched in tmux
- **WHEN** the user launches shell run profile `dev` for app `my-app` and tmux is available to the DevEnv server process
- **THEN** a new tmux window SHALL be created with `apps/run/my-app-dev.sh` running in it
- **THEN** the window name SHALL identify the app and profile, such as `devenv - my-app - dev`

#### Scenario: App run script working directory
- **WHEN** the tmux window is created for shell run profile `dev`
- **THEN** the tmux window working directory SHALL be the selected app's local checkout directory

### Requirement: Capture tmux window identity for app runs
The system SHALL capture the tmux window id when spawning an app run script so lifecycle operations can target the correct window.

#### Scenario: Window id captured after spawn
- **WHEN** a shell app run script is spawned with `tmux new-window`
- **THEN** the system SHALL capture the tmux `window_id` for the created window
- **THEN** the system SHALL associate that `window_id` with the active app run target

#### Scenario: Stop targets captured window
- **WHEN** the user stops an active shell tmux app run
- **THEN** the system SHALL kill the captured tmux window id rather than searching by name
