## Context

Action graphs currently treat readiness inconsistently: Kubernetes readiness is a no-op, inline Compose and script dependencies receive a timer, and script dependency runner/environment metadata may be lost. Failure cleanup can uninstall a Helm release when the current action failed before Helm changed it. Dependencies are started for a parent but have no declared ownership or stop policy.

## Goals / Non-Goals

**Goals:**
- Require observable readiness evidence for each runtime.
- Make failure cleanup run-scoped and non-destructive.
- Define explicit shared, owned, and external dependency lifecycle behavior.
- Preserve script runner, environment, and process handles through dependency execution.

**Non-Goals:**
- Define provider selection or target identity; handled by `enforce-multi-runtime-dependency-identity`.
- Define cross-runtime endpoint routing; handled by `add-cross-runtime-endpoint-contracts`.
- Automatically stop dependencies by default.

## Decisions

### Runtime-specific readiness adapters

Each compiled dependency emits a typed readiness descriptor:

| Runtime | Evidence |
|---|---|
| Kubernetes | `kubectl rollout status` or pod readiness for release selector, using configured timeout/context/namespace |
| Compose | configured health check when available; otherwise explicit stabilization policy with container state inspection |
| Script/process | captured process/tmux handle remains alive through stabilization period |
| External | configured endpoint probe only; no start command |

Generic timer readiness is allowed only for a target explicitly configured with a stabilization policy and is shown as such in action history.

### Run-scoped resource markers

Steps producing a Helm release, process handle, or Compose project publish a run-scoped output. Cleanup steps require that output. A failed image check or dependency start cannot cause Helm uninstall because no release output exists.

Alternative: condition cleanup by step order. Rejected because step order cannot prove an earlier install changed the resource.

### Lifecycle mode on dependency references

Dependency references gain `lifecycle`:

- `shared` (default): start if missing; never stop automatically.
- `owned`: parent action owns a lease; stop only after final owner exits/stops.
- `external`: verify readiness only; never start or stop.

The registry records leases by canonical target identity. Manual stop may warn or require confirmation if active dependents exist.

### Stop and restart

Stop continues to target only the selected app by default. Owned dependencies are released after target stop; shared dependencies remain. Restart stops selected target, revalidates dependency readiness, then starts it.

### Script execution metadata

Dependency compilation forwards runner, command, arguments, working directory, environment, and handle key. Process readiness consumes the same handle key.

## Risks / Trade-offs

- [Health checks unavailable for Compose services] → require explicit stabilization declaration and label reduced confidence.
- [Owned leases survive process crash] → reconcile leases against live status and clear them at server restart.
- [Helm rollout semantics vary by chart] → support selector/pod probe fallback and surface diagnostics.
- [More configuration] → retain `shared` default compatible with current stop behavior.

## Migration Plan

1. Add typed readiness descriptors and run-scoped outputs.
2. Replace Kubernetes no-op probe; add tests with fake kubectl outputs.
3. Gate cleanup on created-resource outputs.
4. Add lifecycle parsing with default `shared`.
5. Migrate script dependency execution metadata.
6. Add reconciliation for leases and process handles.

## Open Questions

- Whether manual stop with owned dependents blocks, warns, or offers cascade confirmation.
- Required Compose health-check convention for projects without Docker health checks.
