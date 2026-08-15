## Why

When starting an app, port conflicts with already-running containers cause cryptic Docker errors. Users don't know which port is in use or by which container until they manually inspect Docker. Pre-start port conflict detection would catch this early and show a clear error.

## What Changes

- Server checks port conflicts before `docker compose up`
- If conflicts found, returns them in the start response
- TUI shows error/warning notification identifying conflicting ports and the containers using them

## Capabilities

### New Capabilities
- `port-conflict-detection`: Pre-start check detects port conflicts with running containers and reports them to the user

### Modified Capabilities

## Impact

- `server/pkg/docker/` — add `CheckPortConflicts` function
- `server/pkg/build/` or `server/pkg/operations/` — call port check before compose up
- `server/pkg/server/handlers.go` — include conflicts in start response
- `tui/packages/types/src/index.ts` — add `portConflicts` to response type
- `tui/packages/cli/src/tui/actions/docker-actions.ts` — handle conflicts in notification
