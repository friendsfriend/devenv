## ADDED Requirements

### Requirement: Canonical runnable target identity
The system SHALL assign every app run and infrastructure target a canonical identity containing resource kind, ident, logical runtime, profile, and container provider when applicable.

#### Scenario: Docker and Podman Compose variants are distinct
- **WHEN** one Compose target is available through Docker and Podman
- **THEN** the catalog SHALL expose distinct canonical targets for provider `docker` and provider `podman`
- **THEN** neither provider target SHALL be selected implicitly by a parent action

### Requirement: Strict dependency reference resolution
The system SHALL resolve every dependency reference to exactly one canonical target before publishing executable action definitions.

#### Scenario: Provider-qualified Compose dependency
- **WHEN** a run target requires infrastructure `redis` with logical runtime `docker`, profile `local`, and provider `podman`
- **THEN** the resolver SHALL select only the Podman Compose target for `redis`

#### Scenario: Ambiguous dependency is rejected
- **WHEN** a dependency can resolve to more than one provider or profile and configuration omits the required selector
- **THEN** registry rebuild SHALL fail with a diagnostic naming the ambiguous dependency and required selector

### Requirement: Dependency execution identity matches resolved target
The system SHALL use canonical target identity for recursion detection, shared execution claims, and dependency leases.

#### Scenario: Different providers do not share execution
- **WHEN** concurrent action runs require the same logical infrastructure ident through Docker and Podman providers
- **THEN** the system SHALL execute and track them as distinct dependencies

#### Scenario: Exact same target is shared
- **WHEN** concurrent action runs require the same canonical dependency target
- **THEN** the system SHALL execute it once and expose a shared-reference outcome to other consumers
