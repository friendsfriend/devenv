## Why

First-time users need a runnable DevEnv configuration that demonstrates the tool's main concepts without hand-writing JSON, compose files, Dockerfiles, and scripts. A generated example config shortens onboarding and gives users copyable patterns for apps, libraries, infrastructure, build/test flows, scripts, and startup profiles.

## What Changes

- Add a `devenv create-example-config` command.
- Generate a complete example config under the resolved DevEnv config directory.
- Generate example scripts under the resolved DevEnv home scripts directory.
- Include three executable script examples: shell, Python, and TypeScript/Bun.
- Include two runnable public-demo applications with different tech stacks:
  - Go REST API app using shared infrastructure.
  - Bun/TypeScript app with separate per-app infrastructure and multiple startup profiles.
- Include Docker Compose files for both applications, including profile-specific compose files for one app.
- Include Docker build and test Dockerfiles for both applications.
- Include three infrastructure service definitions and compose files.
- Include one clone/build/test-ready public library definition.
- Fail without writing files if user config or user scripts already exist.

## Capabilities

### New Capabilities
- `example-config-generation`: Generate a runnable first-time example DevEnv configuration and scripts safely.

### Modified Capabilities

None.

## Impact

- Adds a new Cobra CLI command in the Go backend.
- Adds file-generation logic for config definitions, compose files, Dockerfiles, env file, and scripts.
- Uses existing config/home resolution conventions (`DEVENV_CONFIG_DIR`, `DEVENV_HOME`, and defaults).
- Does not add new external dependencies.
- Does not change existing TUI behavior, server APIs, or existing config schemas.
