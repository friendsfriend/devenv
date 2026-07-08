## ADDED Requirements

### Requirement: Display dependency tree in app detail view
The system SHALL render a dependency tree section in `AppDetailView` showing all dependencies for the current app's active run target.

#### Scenario: App with infrastructure dependencies
- **WHEN** the user opens app detail for `frontend` which has `requires: [{"infra": "postgres"}, {"infra": "redis"}]`
- **THEN** the dependency tree SHALL display two infrastructure nodes: `postgres` and `redis`
- **THEN** each node SHALL show an infra icon (🗄️), the service name, and its current status

#### Scenario: App with app dependencies
- **WHEN** the user opens app detail for `frontend` which has `requires: [{"app": "backend", "runtime": "docker", "profile": "dev"}]`
- **THEN** the dependency tree SHALL display an app node: `backend (docker/dev)`
- **THEN** the node SHALL show an app icon (📦), the app name, runtime, and profile

#### Scenario: App with mixed dependencies
- **WHEN** the user opens app detail for `frontend` which has both app and infra dependencies
- **THEN** the dependency tree SHALL display all dependencies, grouped with app deps first, then infra deps

#### Scenario: App with no dependencies
- **WHEN** the user opens app detail for an app with no `requires` on its active run target
- **THEN** the dependency tree section SHALL show "No dependencies" in muted text

### Requirement: Recursive dependency expansion
The system SHALL recursively resolve and display dependencies of dependent apps.

#### Scenario: Nested app dependencies
- **WHEN** `frontend` depends on `backend` and `backend` depends on `postgres`
- **THEN** the tree SHALL show: `frontend` → `backend` → `postgres`
- **THEN** `backend` SHALL be expandable/collapsible to show/hide `postgres`

#### Scenario: Shared dependencies are deduplicated
- **WHEN** both `frontend` and `backend` depend on `postgres`
- **THEN** `postgres` SHALL appear only once in the tree under the first app that references it

#### Scenario: Circular dependency handling
- **WHEN** a dependency chain forms a cycle (server rejects this at start time)
- **THEN** the tree SHALL display the cycle chain without infinite recursion
- **THEN** the cyclic node SHALL show a cycle indicator

### Requirement: Show dependency health status
The system SHALL reflect the current running/stopped status of each dependency node.

#### Scenario: Running dependency
- **WHEN** a dependency app or infrastructure service is currently running
- **THEN** its status badge SHALL show green "running"

#### Scenario: Stopped dependency
- **WHEN** a dependency app or infrastructure service is not running
- **THEN** its status badge SHALL show red "stopped"

#### Scenario: Unknown status
- **WHEN** a dependency's status cannot be determined (e.g., app not cloned yet)
- **THEN** its status badge SHALL show yellow "unknown"

### Requirement: Keyboard navigation for dependency tree
The system SHALL support keyboard navigation within the dependency tree.

#### Scenario: Focus dependency tree
- **WHEN** the user presses `d` while viewing app detail
- **THEN** focus SHALL move to the dependency tree section
- **THEN** the first tree node SHALL be selected

#### Scenario: Navigate tree nodes
- **WHEN** the dependency tree is focused
- **THEN** `j`/`k` SHALL move selection between visible tree nodes
- **THEN** `Enter` SHALL expand/collapsible the selected node
- **THEN** `Escape` SHALL return focus to the main detail view

#### Scenario: Lazy load on expand
- **WHEN** the user expands an app dependency node
- **THEN** the system SHALL fetch action targets for that app if not already loaded
- **THEN** the node's children SHALL render after the fetch completes
- **THEN** a loading indicator SHALL show during fetch

### Requirement: Dependency tree visual design
The system SHALL render the dependency tree with clear visual hierarchy.

#### Scenario: Tree indentation
- **WHEN** the dependency tree renders nested nodes
- **THEN** each depth level SHALL be indented by 2 characters
- **THEN** connecting lines (├─, └─) SHALL show parent-child relationships

#### Scenario: Node content format
- **WHEN** a dependency node renders
- **THEN** it SHALL show: `[icon] [name] [runtime/profile if app] [status badge]`
- **THEN** app nodes SHALL use 📦 icon and infra nodes SHALL use 🗄️ icon
