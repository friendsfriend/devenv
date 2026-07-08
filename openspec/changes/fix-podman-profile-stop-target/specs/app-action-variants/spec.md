## ADDED Requirements

### Requirement: Stop Docker-compatible run targets through selected target
The system SHALL stop Docker-compatible app run targets using the selected or active run target's configured compose file when that target is known.

#### Scenario: Stop selected Docker profile target
- **WHEN** the user starts app `my-app` from Docker run profile `redis`
- **AND** the user stops `my-app`
- **THEN** the backend SHALL stop the Docker run target for profile `redis`
- **THEN** the compose stop command SHALL include the configured compose file for `redis`

#### Scenario: Stop selected Podman profile target
- **WHEN** `DEVENV_CONTAINER_RUNTIME` resolves to Podman
- **AND** the user starts app `my-app` from a profile picker target whose compose file is in the DevEnv config directory
- **AND** the user stops `my-app`
- **THEN** the backend SHALL run the Podman compose stop using the configured compose file path
- **THEN** the backend SHALL NOT run an unqualified `podman-compose down` that relies on a compose file in the app repository

#### Scenario: Stop preserves dependency semantics
- **WHEN** the user stops an app whose Docker-compatible run target has app or infrastructure dependencies
- **THEN** the system SHALL stop only the requested app run target
- **THEN** the system SHALL leave dependencies running
