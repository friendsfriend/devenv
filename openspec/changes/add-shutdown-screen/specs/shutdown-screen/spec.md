## ADDED Requirements

### Requirement: Shutdown screen appears during graceful exit
The system SHALL show a shutdown screen after user-confirmed graceful exit begins and before the OpenTUI renderer is destroyed.

#### Scenario: User confirms quit with q
- **WHEN** the user presses `q` twice within the existing quit confirmation window
- **THEN** the TUI shows the shutdown screen before destroying the renderer

#### Scenario: User confirms quit with Ctrl+C
- **WHEN** the user presses `Ctrl+C` twice within the existing quit confirmation window and no text selection is active
- **THEN** the TUI shows the shutdown screen before destroying the renderer

#### Scenario: Shutdown already running
- **WHEN** a second quit request arrives while graceful shutdown is already in progress
- **THEN** the system MUST keep the existing shutdown screen and MUST NOT start a duplicate shutdown sequence

### Requirement: Shutdown screen matches startup splash styling
The shutdown screen SHALL use the same modal styling, spacing, spinner rendering, status-row treatment, highlight components, and semantic colors as the startup splash.

#### Scenario: Shutdown screen renders
- **WHEN** shutdown is active
- **THEN** the screen is displayed in the same modal shell and visual style as the startup splash with shutdown-specific title and text

#### Scenario: Shutdown current step renders
- **WHEN** a shutdown step is current
- **THEN** the row uses the same spinner and primary highlight treatment used by the startup splash current step

#### Scenario: Shutdown completed step renders
- **WHEN** a shutdown step is complete
- **THEN** the row uses the same checkmark and positive highlight treatment used by the startup splash completed step

### Requirement: Shutdown steps show ordered status
The system SHALL display each configured shutdown step in a stable order with pending, current, done, or failed status derived from shutdown state.

#### Scenario: Shutdown begins
- **WHEN** graceful shutdown starts
- **THEN** the first shutdown step is current and later steps are pending

#### Scenario: Shutdown advances
- **WHEN** a shutdown step completes successfully
- **THEN** that step is shown as done and the next step is shown as current

#### Scenario: Shutdown completes
- **WHEN** all shutdown steps complete successfully
- **THEN** the shutdown screen shows completion before renderer teardown when rendering is still possible

### Requirement: Shutdown cleanup remains bounded and safe
The system SHALL preserve existing abort and renderer cleanup behavior while bounding graceful shutdown so exit cannot hang indefinitely.

#### Scenario: Background work cancellation runs
- **WHEN** graceful shutdown reaches the background cleanup step
- **THEN** the shared exit abort signal is aborted so subscriptions and background work can stop

#### Scenario: Cleanup step fails
- **WHEN** a shutdown cleanup step throws or exceeds its timeout
- **THEN** the shutdown screen shows a failed state with an explanatory message and the system falls back to renderer destruction

#### Scenario: No graceful handler is registered
- **WHEN** exit is requested before the TUI has registered a graceful shutdown handler
- **THEN** the system uses the existing fallback behavior of aborting background work and destroying the renderer

### Requirement: Termination signals use graceful shutdown when possible
The system SHALL route normal termination signals through the graceful shutdown screen when the renderer and app state can still render safely.

#### Scenario: SIGINT during normal operation
- **WHEN** the process receives `SIGINT` during normal TUI operation
- **THEN** the system starts the same graceful shutdown sequence used by confirmed quit

#### Scenario: Fatal cleanup path
- **WHEN** fatal cleanup runs after an unrecoverable error
- **THEN** the system MUST NOT wait for shutdown screen rendering and MUST destroy the renderer using the safe immediate cleanup path
