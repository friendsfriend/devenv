## ADDED Requirements

### Requirement: First-run view appears for empty workspace
The system SHALL display a first-steps view after startup when no applications, infrastructure services, libraries, or scripts are loaded.

#### Scenario: Empty workspace shows first steps
- **WHEN** startup completes successfully
- **AND** the loaded applications list is empty
- **AND** the loaded infrastructure list is empty
- **AND** the loaded scripts tree is empty
- **THEN** the main content area SHALL display the first-steps view instead of an empty table

#### Scenario: Existing resources skip first steps
- **WHEN** startup completes successfully
- **AND** at least one application, infrastructure service, library, or script is loaded
- **THEN** the main content area SHALL display the normal table experience

### Requirement: First-steps view offers setup actions
The first-steps view SHALL offer actions to connect a Git provider, add a first app or library, create the example config, and open help or continue to the normal empty table.

#### Scenario: User opens provider setup
- **WHEN** the first-steps view is visible
- **AND** the user triggers the connect-provider action
- **THEN** the existing Add Provider modal SHALL open

#### Scenario: User opens add-app flow
- **WHEN** the first-steps view is visible
- **AND** the user triggers the add-app action
- **THEN** the existing Add App modal SHALL open

#### Scenario: Add-app flow without providers shows existing guidance
- **WHEN** the first-steps view is visible
- **AND** the user triggers the add-app action with no configured providers
- **THEN** the add-app flow SHALL show the existing no-providers error or guidance without crashing

#### Scenario: User opens help
- **WHEN** the first-steps view is visible
- **AND** the user triggers the help action
- **THEN** the system SHALL open the existing help view

#### Scenario: User continues to empty table
- **WHEN** the first-steps view is visible
- **AND** the user triggers the continue action
- **THEN** the system SHALL show the normal table experience for the current session

### Requirement: First-steps view reflects provider state
The first-steps view SHALL show whether at least one provider is already configured so users know whether adding an app is immediately possible.

#### Scenario: No provider configured
- **WHEN** the first-steps view is visible
- **AND** no provider is configured
- **THEN** the provider step SHALL indicate that connecting a provider is the recommended first action

#### Scenario: Provider configured
- **WHEN** the first-steps view is visible
- **AND** at least one provider is configured
- **THEN** the provider step SHALL indicate completion
- **AND** the add-app step SHALL be presented as the recommended next action

### Requirement: Successful onboarding actions refresh visible state
The system SHALL refresh relevant TUI data after successful first-steps actions so the view exits once resources exist.

#### Scenario: Provider creation refreshes provider state
- **WHEN** a provider is created from the first-steps flow
- **THEN** the first-steps view SHALL reflect the new provider state

#### Scenario: App creation exits first-run view
- **WHEN** an app or library is created from the first-steps flow
- **THEN** the application data SHALL refresh
- **AND** the normal table experience SHALL be shown

#### Scenario: Example config creation exits first-run view
- **WHEN** example config generation succeeds from the first-steps flow
- **THEN** applications, infrastructure services, and scripts SHALL refresh
- **AND** the normal table experience SHALL be shown
