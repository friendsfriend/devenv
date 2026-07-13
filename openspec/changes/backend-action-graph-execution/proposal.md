## Why

Action discovery, dependency planning, execution, command correlation, and UI projection currently span resource discovery, build/operations services, HTTP handlers, callback bridges, and TUI-specific target construction. This creates unstable parent/child relationships and runtime-only action structure; backend-compiled action and step graphs will make one explicit contract drive discovery, execution, history, and frontend rendering.

## What Changes

- Compile every configured application and infrastructure operation into a versioned backend action registry during startup and atomic config reload.
- Expose stable action IDs, metadata, input schemas, availability, and complete semantic step trees to clients.
- Replace frontend-generated action targets with backend registry queries and action-start requests by stable action ID.
- Execute actions through a shared step engine with sequential composite steps, typed named values, explicit cleanup/failure policies, cancellation, and lifecycle events.
- Represent dependencies as composite steps; allow duplicate semantic dependency nodes to reference one deduplicated execution without duplicating command steps or output.
- Represent already-running dependencies as an explicit successful `already-running` outcome with no synthetic command.
- Require every process-backed leaf step to own exactly one executed command/process and its output/result metadata.
- Define process startup success as readiness passed, using runtime-specific readiness and a compatibility default for existing script/tmux configuration.
- Persist an immutable definition snapshot with each run so history remains readable after registry reloads.
- Migrate Git, Docker build, script/process, Docker run/dependency, and Kubernetes execution incrementally, then remove legacy action callback bridges and operation-specific start endpoints.
- **BREAKING**: Client action execution moves from operation-specific endpoints and frontend target synthesis to registry action IDs and validated action inputs after compatibility adapters are removed.

## Capabilities

### New Capabilities
- `backend-action-registry`: Backend compilation, validation, versioning, querying, and stable identity of configuration-derived application and infrastructure actions.
- `step-graph-execution`: Composite/leaf step execution, typed value flow, shared dependency executions, readiness, cleanup, cancellation, and lifecycle projection.

### Modified Capabilities
- `app-action-variants`: Action variants are backend registry definitions rather than frontend-discovered targets.
- `config-driven-run-dependencies`: Dependencies compile into semantic composite step graphs with shared execution identity and explicit already-running outcomes.
- `multi-runtime-execution`: Runtime-specific behavior is implemented by registered step handlers under one execution contract.
- `script-infrastructure-services`: Script/tmux starts become process steps whose success requires readiness and whose command/output is attached to the dependency subtree.
- `kubernetes-runtime`: Kubernetes cluster, image, secret, Helm, readiness, and forwarding operations compile into explicit action steps.

## Impact

- New backend definition/compiler, registry, execution engine, value store, step-handler, and execution-coordination packages.
- Significant refactoring of `server/pkg/resources`, `server/pkg/build`, `server/pkg/operations`, `server/pkg/server`, and `server/pkg/actionrun`.
- New action registry/query/start APIs and temporary compatibility adapters for existing endpoints.
- TUI action/target pickers switch to backend-provided definitions; existing action run event/history rendering remains the migration-compatible projection.
- Action history persistence stores definition snapshots and semantic/execution identity metadata.
- Existing configuration conventions remain supported; no user-authored action graph format is introduced in this change.
