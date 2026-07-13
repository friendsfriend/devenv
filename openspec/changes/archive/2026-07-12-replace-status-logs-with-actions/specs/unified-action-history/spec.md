## ADDED Requirements

### Requirement: Actions are sole operational history
System SHALL represent supported user-facing operations as durable action runs and SHALL NOT maintain separate status-log or operation-log histories.

#### Scenario: Supported operation executes
- **WHEN** supported app, infrastructure, task, Git, worktree, or Kubernetes operation executes
- **THEN** system creates action with unique run ID, status, and relevant target label
- **AND** executed commands, stdout, stderr, exit status, and errors are attached when available

#### Scenario: Diagnostic-only event occurs
- **WHEN** system emits low-level diagnostic information not representing user-facing operation
- **THEN** information remains in diagnostic/server logging and does not create noisy action

### Requirement: Action modal toggles with uppercase L
Table keymap SHALL expose discoverable uppercase `L` command that toggles action modal without starting action.

#### Scenario: Modal closed
- **WHEN** user presses `L` from main table
- **THEN** action modal is pushed and persisted history is visible

#### Scenario: Modal open
- **WHEN** user presses `L` while action modal is top modal
- **THEN** action modal closes through modal stack

### Requirement: Compact action status strip
Main table SHALL render one-row compact action status strip replacing status log panel.

#### Scenario: Actions fit available width
- **WHEN** actions exist
- **THEN** strip shows status glyph and action label only for as many relevant actions as fit
- **AND** strip uses shared semantic status highlights without badges, timestamps, messages, or borders

#### Scenario: Width is constrained
- **WHEN** full action labels exceed available row width
- **THEN** final visible segment is truncated without increasing strip height

#### Scenario: Action priority
- **WHEN** active, failed, and completed actions coexist
- **THEN** strip prioritizes active actions, then failed actions, then most recent completed actions

#### Scenario: Strip activated
- **WHEN** user activates compact strip
- **THEN** full action modal opens for details

### Requirement: Unified action guidance
System SHALL update guides and help metadata to describe action history, uppercase `L`, compact action strip, remaining container/app/server logs, and SQLite retention without referencing removed status or operation logs.

#### Scenario: User opens logging guide
- **WHEN** user reads logging or log-location guidance
- **THEN** guide directs operational details to action modal and documents only remaining log files

#### Scenario: Utility detection runs
- **WHEN** optional utility detection runs at startup
- **THEN** it does not create status-log entry or user-facing action
- **AND** it may use diagnostic logging

### Requirement: Legacy log surfaces removed
System SHALL remove status-log and operation-log APIs, files, stores, viewers, polling, and keybindings after producer migration.

#### Scenario: Client requests removed endpoint
- **WHEN** client requests former status-log or operation-log endpoint
- **THEN** endpoint is unavailable

#### Scenario: Operation runs
- **WHEN** migrated operation executes
- **THEN** system does not create status.log or operation-log file
- **AND** action history contains equivalent supported information
