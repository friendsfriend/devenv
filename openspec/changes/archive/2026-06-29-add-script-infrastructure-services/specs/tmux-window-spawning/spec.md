## ADDED Requirements

### Requirement: Spawn infrastructure scripts in tmux windows
When tmux environment is detected, the system SHALL open script infrastructure services in tmux windows while keeping the DevEnv TUI active.

#### Scenario: Infrastructure script launched in tmux window
- **WHEN** the user manually starts a script infrastructure service and tmux window execution is available
- **THEN** a tmux window SHALL be created with the selected infrastructure script running in it
- **THEN** the window title or command context SHALL identify DevEnv and the infrastructure service name

#### Scenario: Infrastructure script working directory
- **WHEN** a tmux window is created for a script infrastructure service
- **THEN** the window working directory SHALL be the configured service working directory

#### Scenario: TUI remains active after infrastructure window spawn
- **WHEN** a script infrastructure service is spawned in a tmux window
- **THEN** the DevEnv TUI SHALL remain running and interactive

### Requirement: Capture tmux window identity for infrastructure scripts
The system SHALL capture tmux window identity when spawning a script infrastructure service so lifecycle operations can target the correct window.

#### Scenario: Pane id captured after spawn
- **WHEN** a script infrastructure service is spawned in tmux
- **THEN** the system SHALL capture the tmux window id for the created window
- **THEN** the system SHALL associate that window id with the active infrastructure service

#### Scenario: Stop targets captured infrastructure window
- **WHEN** the user stops an active tmux-backed script infrastructure service
- **THEN** the system SHALL kill the captured tmux window id rather than searching by service name

#### Scenario: Missing window updates status
- **WHEN** the captured window for a script infrastructure service no longer exists
- **THEN** the system SHALL mark the service as stopped or failed according to available exit information
