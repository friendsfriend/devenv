## Why

A dependency can be marked ready after a fixed delay while its process, Compose service, or Kubernetes workload is unavailable. Failure cleanup can uninstall an existing Helm release even when the current run never installed it. Start and stop behavior also lacks an explicit ownership policy for shared infrastructure.

## What Changes

- Define runtime-specific readiness contracts for process, Compose, and Kubernetes dependencies.
- Require Kubernetes workload readiness to use real cluster state and configured timeouts.
- Gate destructive Helm cleanup on resources created or upgraded by the current action run.
- Add explicit dependency lifecycle modes: `shared`, `owned`, and `external`.
- Make stop/restart honor lifecycle mode and prevent accidental teardown of shared dependencies.
- Preserve script infrastructure runner and environment configuration in action execution.

## Capabilities

### New Capabilities
- `runtime-readiness-contracts`: Runtime-specific readiness evidence and timeout behavior.
- `dependency-lifecycle-policy`: Explicit dependency ownership, start, stop, and external-resource semantics.

### Modified Capabilities
- `config-driven-run-dependencies`: Dependency execution waits for real readiness and applies lifecycle policy.
- `kubernetes-runtime`: Helm cleanup and workload readiness become run-scoped and non-destructive.
- `script-infrastructure-services`: Script runner, environment, and process readiness are retained by action definitions.

## Impact

- `server/pkg/actionexec/readiness.go`, `server/pkg/actionexec/process.go`
- `server/pkg/actionregistry/targets.go`, `server/pkg/actionregistry/infrastructure.go`
- `server/pkg/server/handlers_action_definitions.go`
- Kubernetes/script operations, lifecycle actions, configuration schemas, and readiness/cleanup tests.
