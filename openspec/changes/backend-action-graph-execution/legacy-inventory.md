# Legacy action execution inventory

Removal checklist captured before registry migration.

## Backend discovery and planning

- `server/pkg/resources/action_targets.go`: `ActionTarget`, filename/convention discovery, stable-ish target IDs.
- `server/pkg/resources/dependency_graph.go`: `TargetRegistry` and dependency resolution.
- `server/pkg/build/service.go`: `selectActionTarget`, `ResolveRunActionSteps`, `startRunDependencies`, runtime dispatch, mutable `actionBindings` and `actionAppIdent`.
- `server/pkg/build/kubernetes_lifecycle.go`: procedural Kubernetes lifecycle and silent command bridge.
- `server/pkg/operations/service.go`: mutable action callbacks for infrastructure operations.
- `server/pkg/operations/executor.go`: `ConfigureAction`, `ConfigureActionForApp`, current bound step and command callbacks.

## Backend HTTP and event bridge

- `server/pkg/server/action_events.go`: `runAction`, `ConfigureAction*`, callback-to-event correlation.
- `server/pkg/server/docker_actions.go`, `git_actions.go`, `kubernetes_actions.go`, `script_actions.go`: operation-specific action wrappers.
- `server/pkg/server/routes.go`: `/api/action-targets`, `/api/actions/{build,test,run,start,stop}`, Docker lifecycle routes, infrastructure start/stop routes, Git and Kubernetes routes.
- `server/pkg/server/handlers_*.go`: request-specific target parsing and action plan creation.

## Frontend synthesis and routing

- `tui/packages/core/src/docker-client.ts`: operation-specific action endpoints and `getActionTargets`.
- `tui/packages/core/src/apps-client.ts`: infrastructure start/stop endpoints.
- `tui/packages/cli/src/tui/actions/docker-actions.ts`: infrastructure target synthesis, target selection, endpoint dispatch.
- `tui/packages/cli/src/tui/actions/app-actions.ts`: dependency-tree target queries and client-side projection.
- `tui/packages/cli/src/tui/stores/{ui-store,app-detail-store}.ts`: `ActionTarget` picker state.
- `tui/packages/cli/src/tui/views/modal-overlays.tsx`: target picker rendering.

## Removal gates

Each legacy path remains until matching provider has registry discovery, shared-engine execution, compatible action events/history, cancellation, and parity coverage. Remove one provider path at a time; never retain two execution authorities after cutover.
