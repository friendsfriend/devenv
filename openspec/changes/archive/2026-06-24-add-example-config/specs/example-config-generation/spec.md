## ADDED Requirements

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
