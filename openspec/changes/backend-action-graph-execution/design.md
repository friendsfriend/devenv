## Context

DevEnv currently discovers `resources.ActionTarget` values, resolves run dependencies with `TargetRegistry`, executes procedural branches in build/operations services, and converts mutable callbacks into action history events in `server.runAction`. The frontend also synthesizes infrastructure targets and chooses operation-specific endpoints. This split makes action structure unavailable until execution, allows mutable current-step state to mis-parent commands, and requires repeated runtime-specific fixes.

The new architecture compiles existing configuration conventions into immutable backend action definitions. A shared engine executes their semantic step graphs and projects the existing action-run event/history model. Existing configuration remains authoritative and no user-authored workflow format is introduced.

## Goals / Non-Goals

**Goals:**
- Build a versioned action registry at startup and atomic config reload.
- Give every app and infrastructure resource stable backend-defined actions, inputs, availability, and semantic step graphs.
- Execute composite, command, process, operation, readiness, cleanup, and dependency steps through one engine.
- Pass typed named values between steps without positional coupling.
- Execute shared dependencies once while projecting duplicate semantic dependency nodes.
- Preserve one executed backend command/process per leaf step.
- Treat already-running dependencies as an explicit successful outcome without synthetic commands.
- Treat process startup as successful only after readiness passes.
- Preserve current action event/history compatibility during incremental migration.

**Non-Goals:**
- A user-authored generic action/workflow DSL.
- Arbitrary parallel DAG scheduling in the first engine version.
- Distributed execution or remote workers.
- Automatic retries without an explicit later policy.
- Changing existing configuration filename and metadata conventions.

## Decisions

### Definitions are immutable descriptors; handlers execute capabilities

`ActionDefinition` and `StepDefinition` expose minimum declarative capabilities and remain serializable. Execution is delegated to `StepHandler` implementations selected by `StepKind`; definitions do not capture live services.

```go
type ActionDefinition interface {
    ID() ActionID
    Owner() ResourceRef
    Type() ActionType
    Runtime() Runtime
    Label() string
    Inputs() []InputDefinition
    Root() StepDefinition
}

type StepDefinition interface {
    ID() StepDefinitionID
    ExecutionKey() ExecutionKey
    Kind() StepKind
    Label() string
    Children() []StepDefinition
    Condition() StepCondition
    FailurePolicy() FailurePolicy
}

type StepHandler interface {
    Supports(StepKind) bool
    Execute(StepContext, StepDefinition) StepResult
}
```

Alternative considered: `StepDefinition.Execute`. Rejected because it couples registry snapshots and API descriptors to live runtime dependencies and makes serialization/testing harder.

### Existing conventions compile through providers

An `ActionProvider` compiles actions for Docker/Compose, shell/PowerShell/systemshell, Kubernetes, Git, infrastructure, and tasks. Stable IDs use resource/action/runtime/profile identity and never local absolute paths or array positions. Checkout-derived actions use stable convention IDs and availability metadata; registry snapshots rebuild when relevant worktree/config state changes. Existing runs retain their original definition snapshot.

### Sequential composite engine first

The initial scheduler supports nested sequential composites plus explicit `always-run` cleanup. Dependencies compile as child composites. This covers current behavior and avoids introducing unsafe parallel scheduling while resource claims and value flow are new. Interfaces retain room for later parallel/DAG policies.

### Named typed values replace previous-step coupling

Steps consume and produce named ports. Values have type, scope, and visibility. A step requests `artifact.image.ref`, not “previous output”. Compiler validation rejects missing producers, type mismatches, duplicate keys in scope, invalid cycles, and secret/public projection errors.

```go
type StepContext interface {
    Context() context.Context
    RunID() RunID
    StepID() StepDefinitionID
    Require(ValueKey) (Value, error)
    Set(ValueKey, Value) error
    Executor() CommandExecutor
    Events() EventSink
    Secrets() SecretResolver
}
```

Visibility is `public`, `internal`, `secret`, or `ephemeral`; only public display-safe values enter persisted history.

### Semantic identity differs from execution identity

`StepDefinitionID` identifies one tree position. `ExecutionKey` identifies deduplicated work. Duplicate semantic dependency nodes share an execution key. The deterministic first claimant is canonical and owns command children/output; other nodes mirror status/outcome and reference the canonical node. This preserves requested duplicate semantic nodes without fabricating duplicate command execution.

### Already-running is an explicit success outcome

`StepOutcome` includes `executed`, `already-running`, `skipped`, and `failed`. Already-running dependency nodes complete successfully with outcome metadata and no command child because no backend command ran.

### Leaf step taxonomy preserves command invariant

- Composite step: semantic grouping and child policy; owns no command.
- Command step: exactly one executed command, stdout, stderr, exit code, and error.
- Process step: exactly one started backend process and launch result.
- Readiness step: one explicit readiness operation/probe.
- Operation step: commandless SDK/API operation.

No step infers its label from command position or mutable current-command state.

### Process startup completes after readiness

Process composites contain launch and readiness children. Script/tmux defaults to process/pane survival for a one-second stabilization interval when existing config has no probe. Docker uses container running/health status. Kubernetes uses configured Helm/resource readiness. Future config may specify process, command, TCP, HTTP, container-health, or Kubernetes probes.

### Shared execution coordinator owns leases and resource claims

The coordinator acquires an `ExecutionKey` and returns owner, shared-running, already-running, or completed. Subscribers receive the canonical result. Resource claims use deterministic ordering to prevent nested action deadlocks. Nested dependency execution does not independently reserve the same app/action key through legacy registry rules.

### Existing history DTO is a projection, not execution state

The engine emits current `action.started`, `action.step.*`, and `action.command.*` events during migration. `actionrun.Run` remains the persisted view. Runs additionally persist definition snapshot/version, semantic step ID, execution key, canonical/reference metadata, and outcome. History remains readable after registry changes.

### Backend API becomes registry-oriented

- `GET /api/applications/{id}/actions`
- `GET /api/actions/{actionID}`
- `POST /api/actions/{actionID}/runs`

Start requests contain only validated definition inputs. The TUI no longer synthesizes targets or calls runtime-specific start routes. Compatibility endpoints translate old requests to action IDs until migration completes.

## Risks / Trade-offs

- **Shared dependency trees are DAGs projected as trees** → Store canonical/reference metadata; render commands only under canonical node and mirror outcome on references.
- **Startup registry can become stale after worktree changes** → Rebuild atomically on config/worktree/filesystem lifecycle events and version snapshots.
- **Typed value store can become stringly typed** → Use registered value types and compile-time producer/consumer validation.
- **Secrets can leak through values or definition snapshots** → Require visibility metadata, secret handles, redacted display args, and persistence filtering.
- **Nested actions can deadlock resource reservations** → Declare resource claims in definitions, acquire deterministically, and use shared/reentrant execution leases.
- **Readiness defaults may reject slow valid processes** → Make stabilization policy centralized and later configurable; emit diagnostic state while waiting.
- **Long migration can create two execution authorities** → Migrate vertical slices completely behind per-provider feature gates; parity-test event streams and remove each old path after cutover.
- **Definition snapshots increase history size** → Persist compact descriptors needed for rendering rather than executable provider state.

## Migration Plan

1. Add characterization tests and golden definition/event snapshots for Git, Docker build, Docker run dependencies, script/tmux, and Kubernetes.
2. Add definition/value/compiler packages and compile current `ActionTarget`/infrastructure conventions into a versioned registry without changing execution.
3. Add registry query APIs and switch TUI pickers to backend definitions; keep old execution adapters.
4. Add sequential execution engine, event projection, command/process executors, typed values, cancellation, and cleanup.
5. Add execution-key coordinator, duplicate semantic projections, already-running outcomes, and resource claims.
6. Migrate Git actions as first complete vertical slice.
7. Migrate Docker build and artifact extraction to validate values and cleanup.
8. Migrate script/process execution and readiness.
9. Migrate Docker run, recursive dependencies, shared executions, and container readiness.
10. Migrate Kubernetes cluster/image/secret/Helm/readiness/port-forward steps.
11. Switch history persistence to definition snapshots and reference metadata.
12. Remove callback bridges, procedural action planning, frontend target synthesis, and legacy endpoints after parity tests.

Rollback during migration is provider-scoped: disable the new provider executor and route its compatibility adapter to the old implementation. Registry query data remains additive until final endpoint removal.

## Open Questions

- Exact resource-claim granularity for container runtime, app checkout, cluster, Helm release, and tmux resources.
- Whether reference semantic nodes should expose canonical log content through navigation while copy output prints only a reference.
- Whether one-second script readiness stabilization is sufficient as the compatibility default or should vary by launch mode.
