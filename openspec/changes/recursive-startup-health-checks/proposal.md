## Why

The server already resolves dependency graphs via `TargetRegistry.ResolveStartPlan` and starts dependencies before the requested app. However, it doesn't wait for dependencies to be healthy before starting dependent apps. If `backend` starts but `postgres` isn't ready yet, `backend` may fail. The startup should be recursive and health-aware: start deps, wait for healthy, then start the main app.

## What Changes

- Server waits for each dependency to be healthy (container running + health check passes) before starting dependent apps
- Recursive: if A depends on B which depends on C, start C, wait healthy, start B, wait healthy, start A
- Health check polling with configurable timeout
- TUI shows dependency startup progress (which dep is starting, waiting, ready)

## Capabilities

### New Capabilities
- `recursive-health-checks`: Server waits for each dependency to be healthy before starting dependent apps, with recursive resolution and progress feedback

### Modified Capabilities

## Impact

- `server/pkg/docker/` — add `WaitForHealthy(ctx, container, timeout)` polling
- `server/pkg/operations/executor.go` — add health check step between dependency starts
- `server/pkg/server/handlers.go` — SSE events for dependency progress
- `tui/packages/cli/src/tui/stores/app-store.ts` — handle dependency progress events
- `tui/packages/ui/src/components/RepositoryTable.tsx` — render dependency startup state
