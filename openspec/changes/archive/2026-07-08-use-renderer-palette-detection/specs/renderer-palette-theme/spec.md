## ADDED Requirements

### Requirement: System theme uses renderer palette detection
The system SHALL initialize the generated system theme from OpenTUI renderer-managed palette/theme detection instead of issuing raw OSC color queries before renderer creation.

#### Scenario: Renderer palette is available
- **WHEN** the TUI starts and OpenTUI returns terminal palette/default foreground/default background colors
- **THEN** DevEnv SHALL use those colors to initialize the system theme before rendering normal app content

#### Scenario: Renderer palette is unavailable
- **WHEN** OpenTUI palette detection returns no usable palette or times out
- **THEN** DevEnv SHALL initialize the system theme using existing fallback colors without blocking startup indefinitely

#### Scenario: TUI exits after theme detection
- **WHEN** the TUI exits after system theme initialization
- **THEN** no raw OSC palette responses from DevEnv's theme detection SHALL be printed to the shell after renderer destruction

### Requirement: Console capture respects DevEnv console setting
The system SHALL align DevEnv console/debug configuration with OpenTUI console capture behavior.

#### Scenario: DevEnv console disabled
- **WHEN** `DEVENV_TUI_CONSOLE` is not enabled
- **THEN** OpenTUI console overlay SHALL be disabled and global `console.*` capture SHALL NOT be unexpectedly enabled by DevEnv startup

#### Scenario: DevEnv console enabled
- **WHEN** `DEVENV_TUI_CONSOLE=1`
- **THEN** OpenTUI console overlay SHALL be enabled and existing console copy behavior SHALL remain available
