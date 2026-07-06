## ADDED Requirements

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
