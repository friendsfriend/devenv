## ADDED Requirements

### Requirement: Example config generation API
The server SHALL expose an API endpoint that runs the existing example config generator for TUI clients.

#### Scenario: TUI requests example config generation
- **WHEN** the TUI sends a valid request to generate example config
- **THEN** the server SHALL invoke the existing example config generator
- **AND** the server SHALL return success only after the generator completes successfully

#### Scenario: Generation failure is returned to client
- **WHEN** the example config generator fails because guarded directories are not empty or another filesystem error occurs
- **THEN** the server SHALL return a non-success response containing the failure reason

#### Scenario: CLI command remains available
- **WHEN** a user runs `devenv create-example-config`
- **THEN** the existing CLI command behavior SHALL remain available

### Requirement: Example config API protects existing user data
The TUI-accessible example config generation path MUST preserve the existing no-overwrite safety behavior.

#### Scenario: Existing config blocks API generation
- **WHEN** the resolved config directory contains existing user content
- **AND** the TUI requests example config generation
- **THEN** the server SHALL reject generation before writing example files

#### Scenario: Existing scripts block API generation
- **WHEN** the resolved scripts directory contains existing user content
- **AND** the TUI requests example config generation
- **THEN** the server SHALL reject generation before writing example files

#### Scenario: Empty guarded directories are accepted by API generation
- **WHEN** the resolved config directory and scripts directory are missing or contain no user content
- **AND** the TUI requests example config generation
- **THEN** the server SHALL create the example files

### Requirement: Example config generation refreshes server state
After successful API-driven example config generation, the server SHALL refresh in-memory application and infrastructure state so clients can show the generated resources without restarting.

#### Scenario: Generated apps are returned after refresh
- **WHEN** example config generation succeeds through the API
- **AND** the TUI requests the applications list
- **THEN** the response SHALL include the generated example applications and library

#### Scenario: Generated infrastructure is returned after refresh
- **WHEN** example config generation succeeds through the API
- **AND** the TUI requests the infrastructure list
- **THEN** the response SHALL include the generated example infrastructure services

### Requirement: TUI displays example config generation outcome
The TUI SHALL show clear feedback while example config generation is running and after it succeeds or fails.

#### Scenario: Generation in progress is visible
- **WHEN** the user triggers example config generation from first steps
- **THEN** the TUI SHALL show that example config generation is in progress

#### Scenario: Generation success refreshes first-run resources
- **WHEN** example config generation succeeds
- **THEN** the TUI SHALL reload applications, infrastructure services, and scripts
- **AND** the first-run view SHALL no longer be shown once generated resources are loaded

#### Scenario: Generation error is visible
- **WHEN** example config generation fails
- **THEN** the TUI SHALL show the error message to the user
- **AND** the TUI SHALL remain interactive
