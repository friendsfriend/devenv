## 1. Characterization and Foundations

- [x] 1.1 Add golden tests for current Git pull action definition and event sequence
- [x] 1.2 Add golden tests for Docker build, artifact extraction, cleanup, and failure event sequences
- [x] 1.3 Add golden tests for Docker run with recursive, shared, and already-running dependencies
- [x] 1.4 Add golden tests for script/tmux launch, output, readiness, stop, and failure behavior
- [x] 1.5 Add golden tests for Kubernetes app and infrastructure lifecycle event sequences
- [x] 1.6 Inventory legacy action endpoints, callback bridges, mutable current-step fields, and frontend target synthesis for later removal

## 2. Definition and Value Contracts

- [x] 2.1 Create backend action definition package with typed action, step, resource, execution, and value IDs
- [x] 2.2 Define minimum `ActionDefinition`, `StepDefinition`, `StepHandler`, `StepContext`, and execution coordinator interfaces
- [x] 2.3 Implement concrete serializable immutable action and step descriptors
- [x] 2.4 Implement typed input/output port definitions, scoped value keys, and public/internal/secret/ephemeral visibility
- [x] 2.5 Define composite, command, process, readiness, operation, and cleanup step kinds and policies
- [x] 2.6 Implement action graph validation for stable IDs, missing handlers, missing producers, type mismatches, duplicate scoped outputs, cycles, and secret projection
- [x] 2.7 Add definition and validation unit tests, including invalid graph diagnostics

## 3. Backend Action Compiler and Registry

- [x] 3.1 Implement versioned immutable registry snapshots and atomic publish/reject behavior
- [x] 3.2 Define `ActionProvider` contract and provider registration
- [x] 3.3 Compile existing `resources.ActionTarget` values into stable app action definitions
- [x] 3.4 Compile Docker, script, and Kubernetes infrastructure lifecycle actions from existing definitions
- [x] 3.5 Compile Git, task, and container lifecycle operations into registry definitions
- [x] 3.6 Represent checkout-derived action availability separately from stable action identity
- [x] 3.7 Rebuild registry on startup, config reload, and app/worktree lifecycle changes
- [x] 3.8 Add registry snapshot, reload failure, stable ID, and availability tests

## 4. Registry API and TUI Discovery

- [x] 4.1 Add APIs to list actions for a resource and inspect one action definition
- [x] 4.2 Add action-run start API accepting stable action ID and validated inputs
- [x] 4.3 Add compatibility adapters translating existing build/test/run/start requests to registry action IDs
- [x] 4.4 Add shared TypeScript action definition, step descriptor, input schema, availability, and outcome types
- [x] 4.5 Replace app action target discovery in TUI with backend action registry queries
- [x] 4.6 Replace frontend-synthesized infrastructure targets with backend definitions
- [x] 4.7 Update action picker labels, disabled reasons, and direct-single-action behavior
- [x] 4.8 Add API, client, picker, and compatibility tests

## 5. Sequential Step Execution Engine

- [x] 5.1 Implement action instantiation from an immutable registry snapshot
- [x] 5.2 Implement sequential composite execution with condition and stop-on-failure semantics
- [x] 5.3 Implement always-run cleanup scheduling after success, failure, and cancellation
- [x] 5.4 Implement scoped typed value storage and validated step input/output access
- [x] 5.5 Implement shared command executor with separate stdout/stderr, exit code, error, redacted display args, and cancellation
- [x] 5.6 Implement commandless operation step execution
- [x] 5.7 Implement action/step/command event projection compatible with current TUI store
- [x] 5.8 Add engine tests for success, failure, conditional omission, cleanup, cancellation, and value flow

## 6. Shared Dependency Execution

- [x] 6.1 Implement execution-key leases with owner, shared-running, already-running, and completed acquisition outcomes
- [x] 6.2 Add deterministic resource claim ordering and reentrant nested dependency behavior
- [x] 6.3 Project duplicate semantic dependency nodes with canonical/reference metadata
- [x] 6.4 Mirror shared execution status and outcome across all semantic references without duplicating command children
- [x] 6.5 Add explicit `already-running` successful outcome with no synthetic command
- [x] 6.6 Update TUI tree, detail, copy, and history rendering for canonical, shared-reference, and already-running nodes
- [x] 6.7 Add concurrent/shared dependency, failure fanout, copy output, and resource-claim tests

## 7. Git Vertical Slice

- [x] 7.1 Implement Git action provider definitions with explicit semantic command steps
- [x] 7.2 Implement Git step handlers through shared command executor
- [x] 7.3 Route Git actions through registry and execution engine behind provider feature gate
- [x] 7.4 Verify Get ref, Fetch, Pull, branch, checkout, push, and worktree event parity
- [x] 7.5 Remove legacy Git action execution path after parity tests pass

## 8. Docker Build Vertical Slice

- [x] 8.1 Compile Docker build action with build, inspect, create extractor, copy artifacts, and cleanup steps
- [x] 8.2 Produce and consume typed image reference, artifact path, and temporary container ID values
- [x] 8.3 Implement Docker build and artifact handlers through shared command executor
- [x] 8.4 Ensure remove-extractor cleanup runs after copy or inspect failure when applicable
- [x] 8.5 Route Docker builds through engine and verify labels, one-command-per-step, output, and result parity
- [x] 8.6 Remove procedural Docker build action orchestration after parity tests pass

## 9. Process and Readiness Framework

- [x] 9.1 Implement process step result and persistent process handle types
- [x] 9.2 Implement process, command, TCP, HTTP, container-health, and Kubernetes readiness handler interfaces
- [x] 9.3 Implement compatibility process/tmux-pane survival readiness with centralized stabilization interval
- [x] 9.4 Compile script infrastructure start into launch and readiness child steps
- [x] 9.5 Stream managed process stdout/stderr through owning process step while preserving service logs
- [x] 9.6 Compile script infrastructure stop into explicit termination and verification steps
- [x] 9.7 Add launch-success/readiness-failure, immediate-exit, tmux, fallback-process, already-running, and stop tests

## 10. Docker Run and Dependency Migration

- [x] 10.1 Compile Docker run actions and recursive dependencies into semantic composite graphs
- [x] 10.2 Compile app dependencies as nested registered run action subgraphs
- [x] 10.3 Compile Docker, script, and Kubernetes infrastructure dependencies as runtime-specific subgraphs
- [x] 10.4 Implement Docker container readiness and diagnostic operation steps without attaching diagnostics to stale commands
- [x] 10.5 Preserve stop-only-requested-target semantics in compiled stop actions
- [x] 10.6 Route Docker run/restart/stop through engine and execution coordinator
- [x] 10.7 Verify shared dependency duplication, already-running outcome, readiness, failure propagation, and cancellation parity
- [x] 10.8 Remove `ResolveRunActionSteps`, procedural dependency startup, and related mutable binding paths after cutover

## 11. Kubernetes Migration

- [x] 11.1 Compile cluster check/create/delete/export steps with typed cluster context output
- [x] 11.2 Compile image build/load steps with typed image reference flow
- [x] 11.3 Compile secret delete/create steps with protected secret handles and redacted display args
- [x] 11.4 Compile Helm status/install/uninstall steps with typed release identity
- [x] 11.5 Compile workload readiness, diagnostics, port-forward start, and cleanup steps
- [x] 11.6 Compile Kubernetes infrastructure start/stop actions and already-running release outcome
- [x] 11.7 Route Kubernetes app, infrastructure, and cluster actions through engine
- [x] 11.8 Verify command/result parity, Helm-success/readiness-failure semantics, redaction, and cleanup
- [x] 11.9 Remove procedural Kubernetes action orchestration after parity tests pass

## 12. History and Persistence

- [x] 12.1 Extend action run persistence with registry version and compact definition snapshot
- [x] 12.2 Persist semantic step ID, execution key, canonical/reference metadata, and outcome
- [x] 12.3 Filter secret and ephemeral values from events and persisted snapshots
- [x] 12.4 Migrate history loading to render removed or changed action definitions from snapshots
- [x] 12.5 Add retention, reload, removed-definition, shared-reference, and secret persistence tests

## 13. Legacy Removal and Verification

- [x] 13.1 Remove `runAction` callback bridge and `ConfigureAction*` interfaces after all providers migrate
- [x] 13.2 Remove mutable global/per-app current-step correlation used only by legacy execution
- [x] 13.3 Remove frontend target/profile/runner synthesis and legacy operation-specific action start calls
- [x] 13.4 Remove compatibility endpoints after all clients use stable action IDs
- [x] 13.5 Update architecture documentation and `AGENTS.md` with registry, definition snapshot, execution-key, typed-value, and readiness invariants
- [x] 13.6 Run full TUI and Go test suites, type-check, vet, diff check, terminal smoke tests, and pi-lens issue review
