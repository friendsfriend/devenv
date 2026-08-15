## MODIFIED Requirements

### Requirement: Execute shell build and test targets
The system SHALL execute shell build and test targets by running configured script with app checkout directory as working directory and action command/output capture enabled.

#### Scenario: Shell build target selected
- **WHEN** user selects shell build target for `my-app`
- **THEN** system runs `apps/build/my-app-build.sh` in app checkout
- **AND** action retains command, stdout, stderr, and exit status

#### Scenario: Shell test target fails
- **WHEN** `apps/build/my-app-test.sh` exits non-zero
- **THEN** test action is failed
- **AND** action modal surfaces command output and failure

### Requirement: Execute PowerShell run targets
The system SHALL execute PowerShell run targets with app checkout as working directory and action command/output capture enabled.

#### Scenario: PowerShell run target selected
- **WHEN** user selects PowerShell run profile `dev`
- **THEN** action retains PowerShell command, output, and exit status

#### Scenario: PowerShell runtime unavailable
- **WHEN** PowerShell is unavailable
- **THEN** action fails with clear error

### Requirement: Execute Kubernetes run targets through Kubernetes runtime
The system SHALL route Kubernetes targets through managed Kubernetes lifecycle and report all user-facing execution through actions.

#### Scenario: Kubernetes run target selected
- **WHEN** user selects Kubernetes run target
- **THEN** backend executes managed kind/Helm lifecycle
- **AND** commands, output, and status are retained in action

#### Scenario: Stop Kubernetes run target
- **WHEN** user stops active Kubernetes target
- **THEN** backend uninstalls release and stops port forwards
- **AND** stop action retains command/output details
