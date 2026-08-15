## Context

Docker API supports streaming logs from individual containers via `ContainerLogs`. For multi-container aggregation, we need to multiplex multiple Docker log streams into a single output. Each stream is tagged with the container name.

The existing `LogView` component renders single-source logs with search and scroll. The aggregated view will be a new component that merges multiple streams.

## Goals / Non-Goals

**Goals:**
- Stream logs from all running containers into a single view
- Tag each line with the source app/container name
- Support search across all streams
- Support filtering by app name
- Follow mode (auto-scroll to bottom)

**Non-Goals:**
- Log persistence (logs are ephemeral, same as existing)
- Log level filtering (keep it simple — search handles this)
- Timestamp normalization across containers

## Decisions

### 1. Server-side multiplexing

The server opens Docker log streams for all running containers and merges them into a single SSE stream. Each event includes `{ app: string, line: string }`.

**Alternative considered:** Client opens multiple SSE connections. Rejected because it complicates the TUI client and doesn't scale well.

### 2. New AggregatedLogView component

Create a dedicated `AggregatedLogView` rather than extending `LogView`. The merged source model is fundamentally different from single-source.

**Alternative considered:** Parameterize `LogView` with multiple sources. Rejected because it would add significant complexity to an already complex component.

### 3. App name filtering via dropdown

Press `F` to open a filter modal listing all apps with running containers. Select/deselect apps to include/exclude from the stream.

## Risks / Trade-offs

- **[Risk] High log volume from many containers** → Cap buffer at N lines, rotate old entries
- **[Risk] Container restart mid-stream** → Reconnect to new container's log stream automatically
- **[Trade-off] Server-side multiplexing adds latency** → Acceptable; logs are already best-effort
