## 1. Docker Port Query

- [ ] 1.1 Add `GetRunningContainerPorts(ctx) (map[string]string, error)` to `server/pkg/docker/`
- [ ] 1.2 Query all running containers for host port bindings via `docker inspect`
- [ ] 1.3 Return map of `hostPort → containerName`

## 2. Compose Port Parsing

- [ ] 2.1 Add `ParseComposePorts(composePath string) ([]string, error)` to extract host ports from compose files
- [ ] 2.2 Handle standard format `3000:3000` → extract `3000`
- [ ] 2.3 Handle range format `8080-8090:8080-8090` → extract full range
- [ ] 2.4 Handle missing ports section gracefully

## 3. Conflict Detection

- [ ] 3.1 Add `CheckPortConflicts(ctx, composePath string) ([]PortConflict, error)` to `server/pkg/docker/`
- [ ] 3.2 Compare compose ports against running container ports
- [ ] 3.3 Skip self-conflicts (same container being restarted)
- [ ] 3.4 Return list of `{ port, usedBy }` conflicts

## 4. Pre-Start Integration

- [ ] 4.1 Call `CheckPortConflicts` before `docker compose up` in the executor
- [ ] 4.2 Include `portConflicts` in the start response
- [ ] 4.3 Don't block start on conflicts (warning only)

## 5. Type Updates

- [ ] 5.1 Add `PortConflict` type `{ port: string, usedBy: string }` to `tui/packages/types/src/index.ts`
- [ ] 5.2 Add `portConflicts?: PortConflict[]` to start response type

## 6. TUI Notification

- [ ] 6.1 In `docker-actions.ts`, check `portConflicts` in start response
- [ ] 6.2 Format notification: "Port {port} in use by {container}" or "Ports {ports} in use by {containers}"
- [ ] 6.3 Show via `uiStore.setNotification(..., "warning")`

## 7. Testing

- [ ] 7.1 Test no conflicts: compose port not used by any container
- [ ] 7.2 Test single conflict: compose port used by one container
- [ ] 7.3 Test multiple conflicts: multiple ports used by different containers
- [ ] 7.4 Test self-conflict ignored during restart
- [ ] 7.5 Test compose file with no ports section
