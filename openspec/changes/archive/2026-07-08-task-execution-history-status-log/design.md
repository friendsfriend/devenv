## Context

The status log system uses `StatusLogEntry` objects stored in `appStore.statusLogEntries()`. Currently entries come from Docker operations (start/stop/build) and are pushed via SSE events. The `StatusLogView` renders the last N entries at the bottom of the table view.

Task execution happens in `docker-actions.ts` via `spawnSync` (foreground) or server-side via `/api/scripts/run`. Neither path currently pushes status log entries.

## Goals / Non-Goals

**Goals:**
- Append a status log entry after every task execution
- Include task name, arguments summary, success/failure, and duration
- Distinguish task entries from app operation entries via a `source` field

**Non-Goals:**
- Persisting task history beyond the current session (status log is in-memory)
- Task execution history view/modal (status log strip is sufficient)
- Filtering status log by source type

## Decisions

### 1. Add `source` field to `StatusLogEntry`

Extend `StatusLogEntry` with `source?: "app" | "task" | "infra"` to differentiate entry origins. Default to `"app"` for backward compatibility.

**Alternative considered:** Separate `TaskStatusLogEntry` type. Rejected because it would require duplicating the log rendering logic.

### 2. Emit entry after task completion

After `spawnSync` or server-side script run completes, push a `StatusLogEntry` with:
- `message`: task name + truncated args
- `status`: "success" / "error" / "warning"
- `source`: "task"
- Duration calculated from start/end timestamps

### 3. Source prefix in StatusLogView

Render task entries with a `[task]` prefix in muted color to visually distinguish from `[app]` entries.

## Risks / Trade-offs

- **[Risk] High-frequency tasks could flood status log** → Status log already caps entries; old entries rotate out
- **[Trade-off] No persistence** → Acceptable for MVP; status log is ephemeral by design
