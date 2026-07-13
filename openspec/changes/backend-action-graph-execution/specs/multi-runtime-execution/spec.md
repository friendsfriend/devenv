## ADDED Requirements

### Requirement: Execute runtime capabilities through registered step handlers
Docker, shell, PowerShell, systemshell, Kubernetes, Git, infrastructure, and task execution SHALL implement the shared step-handler contract rather than operation-specific action orchestration.

#### Scenario: Shell command step executes
- **WHEN** a compiled shell command step runs
- **THEN** the shell handler SHALL execute exactly its declared command with resolved inputs
- **THEN** the shared engine SHALL record its stdout, stderr, exit result, and error

#### Scenario: Runtime handler unavailable
- **WHEN** an action contains a step kind for which no handler is registered
- **THEN** registry validation SHALL mark the action unavailable or reject the snapshot before execution

### Requirement: Preserve runtime-specific behavior behind shared contracts
Runtime handlers SHALL preserve existing working-directory, environment, interpreter, container runtime, Kubernetes context, and launch-mode behavior while returning results through common step contracts.

#### Scenario: Systemshell resolves host script
- **WHEN** a systemshell action executes on Unix or Windows
- **THEN** its handler SHALL resolve the platform-specific configured script
- **THEN** the resulting process step SHALL use the shared lifecycle and readiness projection
