## 1. Docker Health Check Polling

- [ ] 1.1 Add `WaitForHealthy(ctx, containerName, timeout) error` to `server/pkg/docker/`
- [ ] 1.2 Poll `docker inspect` for `State.Health.Status` every 2 seconds
- [ ] 1.3 For containers without healthcheck, check `State.Running` instead
- [ ] 1.4 Return error on timeout (60s default) or unhealthy status
- [ ] 1.5 Return nil when healthy

## 2. Executor Integration

- [ ] 2.1 In `server/pkg/operations/executor.go`, after starting each dependency in the plan, call `WaitForHealthy`
- [ ] 2.2 If health check fails, abort the entire start operation with clear error
- [ ] 2.3 Skip health check for already-running dependencies

## 3. SSE Progress Events

- [ ] 3.1 Emit `{ type: "dependency.starting", app: string, status: "starting" }` when starting a dependency
- [ ] 3.2 Emit `{ type: "dependency.starting", app: string, status: "healthy" }` when healthy
- [ ] 3.3 Emit `{ type: "dependency.starting", app: string, status: "failed" }` on failure/timeout
- [ ] 3.4 Include dependency name in the event payload

## 4. TUI Event Handling

- [ ] 4.1 Handle `dependency.starting` SSE events in `app-store.ts`
- [ ] 4.2 Update app status signal with dependency progress info
- [ ] 4.3 Show notification on dependency failure via `uiStore.setNotification`

## 5. Table Status Rendering

- [ ] 5.1 In `RepositoryTable.tsx`, render dependency startup state in status column
- [ ] 5.2 Show "⏳ Starting dependency: {name}" during startup
- [ ] 5.3 Show normal status after dependency is healthy
- [ ] 5.4 Show error status on failure

## 6. Configuration

- [ ] 6.1 Make health check timeout configurable (default 60s)
- [ ] 6.2 Add timeout to `docker.WaitForHealthy` parameters
- [ ] 6.3 Consider adding to `.env` or app definition (optional)

## 7. Testing

- [ ] 7.1 Test simple dependency chain: A→B, wait for B healthy before A
- [ ] 7.2 Test shared dependency: A→C, B→C, C started once
- [ ] 7.3 Test already-running dependency is skipped
- [ ] 7.4 Test timeout: dependency never becomes healthy, operation fails
- [ ] 7.5 Test SSE events emitted during startup sequence
