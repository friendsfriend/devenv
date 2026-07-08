## Why

Tasks/scripts are executed from the TUI but there's no record of what ran, with what arguments, or whether it succeeded. The status log at the bottom of the table view already shows operation status for apps, but task executions don't appear there. Users lose visibility into task history.

## What Changes

- Task executions append entries to the status log with: task name, arguments, success/failure, duration
- Status log entries carry a `source` field to distinguish task entries from app operation entries
- Task entries appear in the existing `StatusLogView` at the bottom of the table

## Capabilities

### New Capabilities
- `task-status-log-entries`: Task/script executions produce status log entries showing name, args, result, and duration

### Modified Capabilities

## Impact

- `tui/packages/cli/src/tui/actions/docker-actions.ts` — emit status log entry after task completion
- `tui/packages/types/src/index.ts` — add `source` field to `StatusLogEntry`
- `tui/packages/cli/src/tui/stores/app-store.ts` — handle task source in status log
- `tui/packages/ui/src/components/StatusLogView.tsx` — render source prefix for task entries
