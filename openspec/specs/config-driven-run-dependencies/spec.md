# config-driven-run-dependencies Specification

## Purpose
DevEnv owns app run dependency orchestration across app run targets and infrastructure services using metadata in run scripts and app Docker Compose files.

## Requirements

### Requirement: Define run dependencies in DevEnv metadata
The system SHALL read DevEnv run dependencies from run target metadata instead of using Docker Compose `depends_on` as the DevEnv dependency source.

#### Scenario: Shell run script declares dependencies
- **WHEN** `apps/run/frontend-dev.sh` contains `# devenv:requires=[{"app":"backend","runtime":"systemshell","profile":"dev"},{"infra":"postgres"}]`
- **THEN** the system SHALL parse dependencies for the `frontend` `dev` shell or `systemshell` run target
- **THEN** the app dependency SHALL target the backend run target with runtime `systemshell` and profile `dev`
- **THEN** the infra dependency SHALL target infrastructure service `postgres`

#### Scenario: PowerShell run script declares dependencies
- **WHEN** `apps/run/frontend-dev.ps1` contains `# devenv:requires=[{"infra":"postgres"}]`
- **THEN** the system SHALL parse dependencies for the `frontend` `dev` PowerShell or `systemshell` run target

#### Scenario: Docker Compose run target declares dependencies
- **WHEN** `apps/compose/frontend-dev-compose.yml` contains top-level `x-devenv.requires`
- **THEN** the system SHALL parse those entries as dependencies for the `frontend` Docker run target with profile `dev`

#### Scenario: Compose depends_on is ignored for DevEnv dependency graph
- **WHEN** an app Compose file contains Docker `depends_on`
- **THEN** the system SHALL NOT use `depends_on` to create DevEnv app or infrastructure dependencies

### Requirement: Use object dependency references
The system SHALL support object-based dependency references for app run targets and infrastructure services.

#### Scenario: App dependency reference
- **WHEN** metadata contains `{ "app": "backend", "runtime": "docker", "profile": "dev" }`
- **THEN** the system SHALL resolve it to the backend app run target with runtime `docker` and profile `dev`

#### Scenario: Infra dependency reference
- **WHEN** metadata contains `{ "infra": "redis" }`
- **THEN** the system SHALL resolve it to infrastructure service `redis`

#### Scenario: App dependency without runtime is invalid
- **WHEN** metadata contains `{ "app": "backend", "profile": "dev" }`
- **THEN** dependency validation SHALL fail with an error requiring `runtime`

#### Scenario: App dependency without profile is invalid
- **WHEN** metadata contains `{ "app": "backend", "runtime": "systemshell" }`
- **THEN** dependency validation SHALL fail with an error requiring `profile`

#### Scenario: App dependencies always target run actions
- **WHEN** metadata contains an app dependency reference
- **THEN** the system SHALL resolve it as an app run target
- **THEN** the metadata SHALL NOT require or accept an action field for build or test

### Requirement: Resolve dependency graph before starting app run target
The system SHALL resolve and validate the complete dependency graph before starting any target.

#### Scenario: Dependencies started before requested target
- **WHEN** the user starts `frontend` runtime `systemshell` profile `dev` and it requires `backend` runtime `systemshell` profile `dev` and `postgres`
- **THEN** the system SHALL start `postgres` and backend before starting frontend

#### Scenario: Already-running dependency is skipped
- **WHEN** a required dependency is already running
- **THEN** the system SHALL NOT start a duplicate instance of that dependency
- **THEN** the system SHALL continue with remaining dependencies

#### Scenario: Missing dependency prevents start
- **WHEN** a dependency reference targets an unknown app run target or infrastructure service
- **THEN** the system SHALL fail validation before starting any target
- **THEN** the user-visible error SHALL identify the missing dependency

#### Scenario: Dependency cycle prevents start
- **WHEN** dependencies form a cycle between app run targets
- **THEN** the system SHALL fail validation before starting any target
- **THEN** the user-visible error SHALL include the cycle chain

### Requirement: Stop requested app run target only
The system SHALL stop only the requested app run target and SHALL leave dependencies running.

#### Scenario: Stop app with dependencies
- **WHEN** frontend was started and its dependencies backend and postgres are running
- **WHEN** the user stops frontend
- **THEN** the system SHALL stop frontend only
- **THEN** backend and postgres SHALL remain running

#### Scenario: Restart app with dependencies
- **WHEN** the user restarts frontend
- **THEN** the system SHALL stop frontend only
- **THEN** the system SHALL resolve and start any missing dependencies before starting frontend again

### Requirement: Allow platform-specific dependency drift for systemshell
The system SHALL allow `.sh` and `.ps1` files for the same `systemshell` app/profile target to declare different dependencies.

#### Scenario: Unix systemshell dependencies come from shell script
- **WHEN** `frontend-dev.sh` and `frontend-dev.ps1` declare different `devenv:requires` metadata
- **WHEN** the host is macOS or Linux
- **THEN** the system SHALL use dependencies from `frontend-dev.sh`

#### Scenario: Windows systemshell dependencies come from PowerShell script
- **WHEN** `frontend-dev.sh` and `frontend-dev.ps1` declare different `devenv:requires` metadata
- **WHEN** the host is Windows
- **THEN** the system SHALL use dependencies from `frontend-dev.ps1`

#### Scenario: Different platform dependencies are valid
- **WHEN** `.sh` and `.ps1` dependencies differ for the same `systemshell` profile
- **THEN** validation SHALL NOT fail because of the difference
