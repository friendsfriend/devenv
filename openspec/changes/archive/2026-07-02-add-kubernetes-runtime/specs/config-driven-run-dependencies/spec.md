## ADDED Requirements

### Requirement: Resolve Kubernetes app run dependencies
The system SHALL allow dependency references to target app run targets with runtime `kubernetes` and a configured profile.

#### Scenario: App depends on Kubernetes app target
- **WHEN** a Kubernetes run target declares `{ "app": "backend", "runtime": "kubernetes", "profile": "local" }`
- **THEN** dependency resolution SHALL target the backend app's Kubernetes run target for profile `local`
- **THEN** the backend target SHALL be started before the requesting target when it is not already running

#### Scenario: Missing Kubernetes app dependency fails validation
- **WHEN** a dependency reference targets app `backend` runtime `kubernetes` profile `local` and no such target exists
- **THEN** dependency validation SHALL fail before starting any target
- **THEN** the user-visible error SHALL identify the missing Kubernetes app run target

### Requirement: Resolve Kubernetes infrastructure dependencies
The system SHALL allow dependency references to target infrastructure services with runtime `kubernetes` and a configured profile while preserving existing bare infrastructure references for non-Kubernetes services.

#### Scenario: App depends on Kubernetes infrastructure
- **WHEN** a Kubernetes run target declares `{ "infra": "postgres", "runtime": "kubernetes", "profile": "local" }`
- **THEN** dependency resolution SHALL target the `postgres` Kubernetes infrastructure target for profile `local`
- **THEN** the infrastructure target SHALL be started before the requesting app target when it is not already running

#### Scenario: Already-running Kubernetes infrastructure is not reset
- **WHEN** a Kubernetes app target requires Kubernetes infrastructure that is already running
- **THEN** dependency startup SHALL skip reinstalling that infrastructure release
- **THEN** the requesting app target SHALL continue starting

#### Scenario: Missing Kubernetes infrastructure dependency fails validation
- **WHEN** a dependency reference targets infrastructure `postgres` runtime `kubernetes` profile `local` and no such infrastructure target exists
- **THEN** dependency validation SHALL fail before starting any target
- **THEN** the user-visible error SHALL identify the missing Kubernetes infrastructure target

### Requirement: Preserve dependency stop semantics for Kubernetes targets
The system SHALL stop only the requested Kubernetes app target and SHALL leave app and infrastructure dependencies running.

#### Scenario: Stop Kubernetes app with dependencies
- **WHEN** frontend was started as a Kubernetes run target and its backend app and postgres infrastructure dependencies are running
- **WHEN** the user stops frontend
- **THEN** the system SHALL uninstall frontend's Helm release only
- **THEN** backend and postgres SHALL remain running

#### Scenario: Restart Kubernetes app with dependencies
- **WHEN** the user restarts a Kubernetes app target
- **THEN** the system SHALL stop only that app's Helm release
- **THEN** the system SHALL resolve and start any missing dependencies before reinstalling the app release
