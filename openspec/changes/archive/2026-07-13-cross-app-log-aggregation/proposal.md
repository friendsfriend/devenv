## Why

When debugging issues across multiple services, users must open separate log views for each app (`l` key per app). There's no way to see correlated log output across all running containers. Searching for an error across apps requires manually checking each one.

## What Changes

- New aggregated log view showing logs from all running containers in a unified stream
- Each log line tagged with the app/container name (colored per app)
- Search (`/`) and filter by app (`F`) in the aggregated view
- Keyboard shortcut `L` (capital) opens the aggregated log view

## Capabilities

### New Capabilities
- `aggregated-log-view`: Unified log stream across all running containers with per-app tagging, search, and filtering

### Modified Capabilities

## Impact

- `server/pkg/docker/` — add multi-container log streaming
- `server/pkg/server/handlers.go` — new SSE endpoint for aggregated logs
- `tui/packages/core/src/logs-client.ts` — new `streamAllLogs` method
- `tui/packages/ui/src/components/AggregatedLogView.tsx` — new component
- `tui/packages/cli/src/tui/stores/log-store.ts` — new signals for aggregated state
- `tui/packages/cli/src/tui/keyboard/` — new keybinds for aggregated view
