## ADDED Requirements

### Requirement: Execute immutable semantic step graphs
The execution engine SHALL execute an instantiated action's immutable semantic step graph and SHALL project lifecycle events from that graph.

#### Scenario: Sequential composite executes children
- **WHEN** a sequential composite step starts
- **THEN** the engine SHALL execute eligible children in defined order
- **THEN** the composite SHALL complete only after required children complete successfully

#### Scenario: Child fails
- **WHEN** a required child step fails
- **THEN** the parent SHALL fail
- **THEN** later normal children SHALL not execute
- **THEN** eligible always-run cleanup children SHALL execute

### Requirement: Enforce one backend command or process per leaf step
Every process-backed command or process launch SHALL have one leaf step that owns exactly one command/process, stdout, stderr, exit code or launch result, and error. Composite and commandless operation steps SHALL NOT fabricate commands.

#### Scenario: Two commands execute
- **WHEN** an action executes two backend commands
- **THEN** the run SHALL contain two distinct command leaf steps

#### Scenario: Conditional command does not execute
- **WHEN** a conditional branch does not execute a command
- **THEN** the engine SHALL NOT create a placeholder command step for it

#### Scenario: SDK operation executes
- **WHEN** a backend SDK/API operation executes without a process command
- **THEN** the engine SHALL represent it as a commandless operation step

### Requirement: Pass typed named values between steps
Steps SHALL consume and produce named typed values with action, composite, or step scope and visibility metadata. Consumers SHALL NOT depend on positional previous-step output.

#### Scenario: Build output feeds inspect step
- **WHEN** an image build step produces `image.ref`
- **THEN** a later inspect step SHALL consume `image.ref` by key and compatible type

#### Scenario: Required value missing
- **WHEN** a required step input has no action input or producer
- **THEN** graph validation SHALL fail before execution

#### Scenario: Secret value produced
- **WHEN** a step produces a secret value
- **THEN** events and persisted history SHALL not contain its plaintext value

### Requirement: Deduplicate execution while preserving semantic dependency nodes
Semantic dependency nodes with the same execution key SHALL appear at each configured tree position but SHALL share one canonical execution.

#### Scenario: Dependency reachable through two paths
- **WHEN** the same dependency is referenced directly and transitively
- **THEN** the run projection SHALL contain both semantic dependency nodes
- **THEN** the backend SHALL execute the dependency once
- **THEN** only the canonical semantic node SHALL own command child steps and command output
- **THEN** the reference node SHALL mirror status and outcome and identify the canonical node

#### Scenario: Shared execution fails
- **WHEN** a shared dependency execution fails
- **THEN** every semantic node referencing it SHALL report failed status
- **THEN** the failure SHALL propagate through each affected parent path

### Requirement: Represent already-running resources explicitly
The engine SHALL treat an already-running dependency as a successful `already-running` outcome and SHALL NOT execute or fabricate a start command.

#### Scenario: Dependency already running
- **WHEN** dependency readiness confirms the required resource is already running
- **THEN** its semantic dependency nodes SHALL complete with outcome `already-running`
- **THEN** no start command leaf SHALL be created

### Requirement: Complete process startup only after readiness
A process-backed startup composite SHALL complete successfully only after launch succeeds and its readiness policy passes.

#### Scenario: Script launches and remains alive
- **WHEN** an existing script/tmux configuration has no explicit readiness probe
- **THEN** the engine SHALL apply the compatibility process-survival stabilization policy
- **THEN** the startup SHALL complete only if the process or pane remains alive through that interval

#### Scenario: Process launches but readiness fails
- **WHEN** process launch succeeds and its readiness probe fails
- **THEN** the readiness step and startup composite SHALL fail
- **THEN** launch command metadata SHALL remain successful rather than being rewritten as failed

#### Scenario: Docker healthcheck succeeds
- **WHEN** a Docker startup waits on a healthy container and its healthcheck passes
- **THEN** the readiness step SHALL complete and the dependency SHALL be ready

### Requirement: Support cancellation and cleanup
The engine SHALL propagate cancellation through active step contexts and SHALL run eligible cleanup steps according to declared failure policy.

#### Scenario: User cancels command action
- **WHEN** the user cancels an active action
- **THEN** the engine SHALL cancel the active command context
- **THEN** pending normal steps SHALL not start
- **THEN** required cleanup steps SHALL run when safe

#### Scenario: Artifact copy fails
- **WHEN** artifact extraction creates a temporary container and copy fails
- **THEN** the remove-container cleanup step SHALL still execute

### Requirement: Project execution through action run events and history
The engine SHALL emit action, semantic step, command, output, completion, failure, outcome, canonical, and reference metadata through the action run projection.

#### Scenario: Existing TUI consumes migrated action
- **WHEN** a provider is migrated to the new engine
- **THEN** the TUI SHALL receive compatible action and command lifecycle events
- **THEN** the action tree and history SHALL derive from the definition snapshot rather than mutable current-step callbacks
