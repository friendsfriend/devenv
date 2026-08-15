## MODIFIED Requirements

### Requirement: Resolve dependency graph before starting app run target
The system SHALL compile and validate the complete dependency graph as semantic composite steps before starting any action. Semantic references to the same dependency SHALL share one execution identity while remaining visible at each configured tree position.

#### Scenario: Dependencies started before requested target
- **WHEN** the user starts `frontend` runtime `systemshell` profile `dev` and it requires `backend` runtime `systemshell` profile `dev` and `postgres`
- **THEN** the compiled action graph SHALL place postgres and backend dependency composites before the frontend startup steps
- **THEN** the execution engine SHALL make them ready before starting frontend

#### Scenario: Already-running dependency is represented
- **WHEN** a required dependency is already running and ready
- **THEN** the system SHALL NOT start a duplicate instance of that dependency
- **THEN** its semantic dependency step SHALL complete successfully with outcome `already-running`
- **THEN** no synthetic command step SHALL be created

#### Scenario: Shared dependency has duplicate semantic nodes and one execution
- **WHEN** a dependency is referenced directly and through another dependency
- **THEN** the compiled graph SHALL retain both semantic dependency nodes
- **THEN** both nodes SHALL share one execution key
- **THEN** only one backend dependency execution SHALL occur

#### Scenario: Missing dependency prevents start
- **WHEN** a dependency reference targets an unknown app run action or infrastructure action
- **THEN** registry compilation or action validation SHALL fail before starting any step
- **THEN** the user-visible diagnostic SHALL identify the missing dependency

#### Scenario: Dependency cycle prevents start
- **WHEN** dependencies form a cycle between app run actions
- **THEN** graph validation SHALL fail before starting any step
- **THEN** the user-visible diagnostic SHALL include the cycle chain

## ADDED Requirements

### Requirement: Compile dependencies as action step subgraphs
Each configured dependency SHALL compile as a composite step whose runtime-specific launch and readiness operations are child steps.

#### Scenario: Script infrastructure dependency
- **WHEN** an app run action requires script infrastructure `clock`
- **THEN** its action graph SHALL contain a `Start dependency: clock` composite
- **THEN** the script process command and readiness step SHALL be descendants of that composite

#### Scenario: Docker infrastructure dependency
- **WHEN** an app run action requires Docker infrastructure `redis`
- **THEN** its action graph SHALL contain a dependency composite with container start and readiness children
