## ADDED Requirements

### Requirement: System utilities guide document
The system SHALL provide a guide document listing all system utilities used or optionally used by DevEnv.

#### Scenario: Required utilities listed
- **WHEN** the user opens the System Utilities guide
- **THEN** it SHALL list required utilities: git, docker/podman, bun
- **THEN** each SHALL include: purpose, installation command, how DevEnv uses it

#### Scenario: Optional enhanced utilities listed
- **WHEN** the user opens the guide
- **THEN** it SHALL list optional enhanced utilities: lazygit, lazydocker, pi
- **THEN** each SHALL include: what it improves, installation command, how DevEnv integrates

#### Scenario: Optional advanced utilities listed
- **WHEN** the user opens the guide
- **THEN** it SHALL list optional advanced utilities: kubectl, helm, kind, k9s, worktrunk, ssh
- **THEN** each SHALL include: when needed, installation command, which DevEnv feature uses it

### Requirement: Guide registered in help view
The system utilities guide SHALL be accessible from the Help view's Guides tab.

#### Scenario: Guide appears in guide list
- **WHEN** the user opens Help (`?`) and switches to Guides tab
- **THEN** "System Utilities" SHALL appear in the guide list
- **THEN** selecting it SHALL open the guide content in the markdown modal

#### Scenario: Guide category
- **WHEN** the guide is registered
- **THEN** its category SHALL be "Setup" or "Getting Started"

### Requirement: README system utilities section
The README SHALL include a section documenting system utilities.

#### Scenario: README section
- **WHEN** the user reads the README
- **THEN** there SHALL be a "System Utilities" section under Requirements
- **THEN** it SHALL list required and optional tools with brief descriptions

### Requirement: Utility detection at startup
The TUI SHALL detect which optional utilities are available at startup.

#### Scenario: Utility available
- **WHEN** `lazygit` is installed and in PATH
- **THEN** the TUI SHALL log "Found: lazygit" to the status log at startup

#### Scenario: Utility not available
- **WHEN** `lazydocker` is not installed
- **THEN** the TUI SHALL NOT log anything about lazydocker (only log what IS found)

#### Scenario: Detection does not block startup
- **WHEN** utility detection is running
- **THEN** the TUI SHALL NOT wait for detection to complete before loading
