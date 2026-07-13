## ADDED Requirements

### Requirement: Compile Kubernetes lifecycle into explicit action steps
The backend SHALL compile Kubernetes app and infrastructure actions into explicit cluster, image, secret, Helm, readiness, port-forward, and cleanup steps handled by the shared execution engine.

#### Scenario: Kubernetes app action is compiled
- **WHEN** configuration defines a Kubernetes app run target
- **THEN** its registered action SHALL expose semantic steps required by its cluster, image, secret, Helm, readiness, and port-forward configuration

#### Scenario: Kubernetes infrastructure action is compiled
- **WHEN** configuration defines Helm-backed Kubernetes infrastructure
- **THEN** the backend SHALL register start and stop actions with explicit Helm and readiness steps

### Requirement: Pass Kubernetes values through typed step outputs
Kubernetes step handlers SHALL exchange cluster context, image reference, release identity, secret handles, and forwarding handles through named typed values rather than mutable service fields or previous-step position.

#### Scenario: Image build feeds load and Helm steps
- **WHEN** a Kubernetes action builds a local image
- **THEN** the image step SHALL produce a typed image reference
- **THEN** image-load and Helm steps SHALL consume that reference by key

#### Scenario: Secret step uses protected values
- **WHEN** a secret creation step resolves configured environment keys
- **THEN** plaintext values SHALL remain secret-scoped
- **THEN** command display, events, and history SHALL contain redacted arguments

### Requirement: Determine Kubernetes startup success through readiness
Kubernetes app and infrastructure start composites SHALL complete only after configured Helm and workload readiness passes.

#### Scenario: Helm command succeeds but workloads fail
- **WHEN** Helm install exits successfully and configured workloads do not become ready
- **THEN** the readiness step and startup composite SHALL fail
- **THEN** Helm command metadata SHALL remain successful

#### Scenario: Release already running
- **WHEN** the required Helm release is already deployed and ready
- **THEN** its dependency composite SHALL complete with outcome `already-running`
- **THEN** no uninstall or reinstall command SHALL execute
