# example-config-generation Specification

## Purpose
TBD - created by archiving change add-example-config. Update Purpose after archive.
## Requirements
### Requirement: Example config command
The system SHALL provide a `create-example-config` CLI command that creates a first-time runnable example DevEnv setup.

#### Scenario: Command is available
- **WHEN** a user runs `devenv create-example-config`
- **THEN** the system creates the example configuration and scripts if guarded locations are empty

### Requirement: Existing user data is protected
The command MUST fail before writing any files when the resolved config directory contains any existing entry or when the resolved scripts directory contains any existing entry.

#### Scenario: Existing config blocks generation
- **WHEN** the resolved config directory exists and contains at least one file or directory
- **THEN** the command fails and writes no example files

#### Scenario: Existing scripts block generation
- **WHEN** the resolved scripts directory exists and contains at least one file or directory
- **THEN** the command fails and writes no example files

#### Scenario: Missing or empty guarded directories are accepted
- **WHEN** the resolved config directory and scripts directory are missing or empty
- **THEN** the command creates the example files

### Requirement: Generated applications
The generated config SHALL define two runnable public-demo applications with different technology stacks and Docker build/test support.

#### Scenario: Go application is generated
- **WHEN** example config generation succeeds
- **THEN** the config contains a Go REST API application definition, compose file, build Dockerfile, and test Dockerfile

#### Scenario: Bun TypeScript application is generated
- **WHEN** example config generation succeeds
- **THEN** the config contains a Bun/TypeScript application definition, default compose file, profile compose files, build Dockerfile, and test Dockerfile

### Requirement: Application startup profiles
At least one generated application SHALL provide multiple startup profiles using existing DevEnv compose filename conventions.

#### Scenario: Profiles are discoverable
- **WHEN** the TUI scans profiles for the generated Bun/TypeScript application
- **THEN** it discovers profile-specific compose files in addition to the default compose file

### Requirement: Generated infrastructure services
The generated config SHALL define three infrastructure services with matching compose files.

#### Scenario: Infrastructure services are generated
- **WHEN** example config generation succeeds
- **THEN** the config contains infrastructure definitions and compose files for Postgres, Redis, and Mailpit

### Requirement: Generated library
The generated config SHALL define one public clone/build/test-ready library.

#### Scenario: Library is generated
- **WHEN** example config generation succeeds
- **THEN** the config contains a library definition plus build and test Dockerfiles for the public library repository

### Requirement: Generated scripts
The command SHALL create executable example scripts in shell, Python, and TypeScript/Bun under the resolved scripts directory.

#### Scenario: Script examples are generated
- **WHEN** example config generation succeeds
- **THEN** the scripts directory contains executable shell, Python, and TypeScript/Bun examples

### Requirement: No new runtime dependencies
The implementation MUST NOT add new external dependencies for generating example files.

#### Scenario: Generation uses standard library
- **WHEN** the command runs
- **THEN** it performs path resolution, directory checks, and file writes using existing project code or the Go standard library

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

