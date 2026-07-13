## MODIFIED Requirements

### Requirement: Manually run script infrastructure services
The backend SHALL compile manual start and stop actions for script infrastructure services and SHALL execute their process and readiness steps through the shared action engine.

#### Scenario: User starts stopped script service
- **WHEN** the user invokes the registered start action for a stopped script infrastructure service
- **THEN** the process step SHALL launch the selected runner using the configured working directory, arguments, and environment
- **THEN** the readiness step SHALL confirm the process or tmux pane remains ready
- **THEN** the service status SHALL become running only after readiness passes

#### Scenario: User stops running script service
- **WHEN** the user invokes the registered stop action for a running script infrastructure service
- **THEN** the system SHALL terminate the captured tmux window or managed process through explicit action steps
- **THEN** the service status SHALL become stopped after termination succeeds

#### Scenario: Start already running service
- **WHEN** the user invokes start for a script infrastructure service that is already running and ready
- **THEN** the system SHALL NOT launch a duplicate process
- **THEN** the action SHALL complete with outcome `already-running`

### Requirement: Execute script infrastructure in tmux or log-only fallback
The system SHALL compile the selected script runner into a process launch step using tmux when available and managed log-only execution when tmux window execution is unavailable. The process command and output SHALL be children of the owning script infrastructure action or dependency composite.

#### Scenario: Tmux window execution
- **WHEN** a script infrastructure start action executes and tmux window execution is available
- **THEN** one process step SHALL create the tmux window
- **THEN** the system SHALL capture the window identity as an internal typed output for status, readiness, and stop actions

#### Scenario: Log-only fallback execution
- **WHEN** a script infrastructure start action executes and tmux window execution is unavailable
- **THEN** one process step SHALL run the script as a managed background process
- **THEN** stdout and stderr SHALL stream to its action command record and service log

#### Scenario: Service exits before readiness
- **WHEN** a script process exits before its readiness policy passes
- **THEN** the readiness composite SHALL fail
- **THEN** the service status SHALL become failed
- **THEN** retained action output SHALL identify the process failure

## ADDED Requirements

### Requirement: Apply compatibility readiness to existing script configuration
Existing script infrastructure without an explicit readiness probe SHALL use process or tmux-pane survival through a centralized stabilization interval.

#### Scenario: Existing tmux script remains alive
- **WHEN** a configured script launches in tmux and its pane remains alive through the compatibility stabilization interval
- **THEN** readiness SHALL pass

#### Scenario: Existing background script exits immediately
- **WHEN** a configured script launches as a managed process and exits during the stabilization interval
- **THEN** readiness SHALL fail
