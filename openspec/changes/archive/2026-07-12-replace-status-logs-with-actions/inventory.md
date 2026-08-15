# Legacy operational log inventory

| Area | Legacy producer/consumer | Action migration |
|---|---|---|
| App build/run/test | `server/pkg/build/service.go`, `stop_lifecycle.go`, `kubernetes_lifecycle.go` operation files | Existing server action lifecycle; retain each command, stream, exit, error |
| Infrastructure | `server/pkg/operations/service.go`, `kubernetes_infra.go` status callbacks and operation files | Infrastructure action with nested command steps |
| Docker lifecycle | `server/pkg/server/handlers_docker.go` status manager entries | Start/stop/restart action |
| Git/worktrees | `tui/packages/cli/src/tui/actions/git-actions.ts` status API writes | Git/worktree action with target metadata and command result |
| Tasks/scripts | `docker-actions.ts`, `util-actions.ts` status entries | Task action with full args, output, exit status, timestamps |
| Kubernetes controls | `docker-actions.ts` status API writes | Kubernetes lifecycle action |
| Utility discovery | `startup-utility-detection.ts` status API write | Diagnostic logging only; no user-facing action |
| Status server | `server/pkg/logging/logger.go`, broadcaster/cleanup in `server.go`, `/api/logs/status` | Remove after producers migrate |
| Operation server | Build/operations temp files, active paths, `/api/logs/operation/*` | Remove after action parity |
| Status TUI | app-store signals, SSE/fetch, `StatusLogView`, `StatusLogModal`, modal keymap | Replace compact surface with `ActionStatusStrip`; details in action modal |
| Operation TUI | core client, polling, log actions, `o` binding | Remove; action modal owns operational output |

## Command-step invariant

Every executed process command creates one dynamic action step containing exactly one command and its stdout, stderr, exit code, and error. Generic build/run/test and infrastructure execution use the shared action bridge; action-scoped silent commands use `RunCommandSilentForAction`; Git and Kubernetes cluster controls use command observers. Conditional commands create steps only when executed. Docker SDK lifecycle calls remain commandless actions because no process command runs. Diagnostic polling remains outside action history.

## Label registry

Step and action-type labels resolve through a single shared registry instead of per-producer formatting or ID-suffix parsing:
- Server: `server/pkg/actionrun/labels.go` (`StepKind`, `StepLabel`, `GitCommandStepKind`, `KubernetesClusterCommandStepKind`, `ActionKind`). Dynamic steps thread an explicit `kind` through `ConfigureActionStepEvent`/`emitActionStep`; the generic bridge (`action_events.go`) resolves the label via this registry and is idempotent (`Registry.HasStep`/`AddStep`) so pre-declared steps (e.g. dependency/target steps) are never duplicated or relabeled by a later dynamic-step event.
- TUI: `tui/packages/types/src/action-labels.ts` (`actionTypeLabel`, `actionRunDisplayLabel`). `action-run-modal.tsx` and `ActionStatusStrip.tsx` both use `actionRunDisplayLabel` instead of local ad hoc formatting.

Retained logs: container/application runtime logs and diagnostic/server logs. Existing legacy files stay inert; migration never deletes user files.
