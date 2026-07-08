## 1. Server-Side Log Multiplexing

- [ ] 1.1 Add `StreamAllContainers(ctx, filter)` to `server/pkg/docker/` that opens log streams for all running containers
- [ ] 1.2 Merge streams into a single output channel, tagging each line with container/app name
- [ ] 1.3 Handle container start/stop events to add/remove streams dynamically
- [ ] 1.4 Add `GET /api/logs/stream` SSE endpoint to `server/pkg/server/handlers.go`
- [ ] 1.5 Support `?apps=` query parameter for filtering

## 2. TUI Client Layer

- [ ] 2.1 Add `streamAllLogs(filter?: string[])` method to `tui/packages/core/src/logs-client.ts`
- [ ] 2.2 Parse SSE events `{ app, line }` and emit to store

## 3. Log Store Updates

- [ ] 3.1 Add `aggregatedLogs` signal (array of `{ app: string, line: string }`) to `log-store.ts`
- [ ] 3.2 Add `aggregatedLogFilter` signal (selected app names) to `log-store.ts`
- [ ] 3.3 Add `aggregatedLogSearchMode` and `aggregatedLogSearchQuery` signals
- [ ] 3.4 Cap buffer at 1000 lines, rotate old entries

## 4. AggregatedLogView Component

- [ ] 4.1 Create `tui/packages/ui/src/components/AggregatedLogView.tsx`
- [ ] 4.2 Render log lines with colored `[app]` prefix per source
- [ ] 4.3 Cycle app colors through theme palette (primary, secondary, accent, success, etc.)
- [ ] 4.4 Implement follow mode (auto-scroll to bottom)
- [ ] 4.5 Show "No running containers" empty state
- [ ] 4.6 Use `SearchHeader` for search display
- [ ] 4.7 Use `FilterStatusBar` for filter summary

## 5. Search Integration

- [ ] 5.1 Implement `/` to activate search mode
- [ ] 5.2 Filter lines by search query
- [ ] 5.3 Use `MatchedText` component for highlighting matches
- [ ] 5.4 `Escape` clears search

## 6. App Filter Integration

- [ ] 6.1 Implement `F` to open app filter modal
- [ ] 6.2 List all apps with running containers in the filter
- [ ] 6.3 Toggle app inclusion/exclusion
- [ ] 6.4 Update stream filter (reconnect with `?apps=` param)

## 7. Keyboard Navigation

- [ ] 7.1 Add `L` keybinding in table key handler to open aggregated log view
- [ ] 7.2 `Escape`/`q` closes the view
- [ ] 7.3 `j`/`k` scrolls through log lines
- [ ] 7.4 `G`/`g` jumps to bottom/top

## 8. Export & Polish

- [ ] 8.1 Export `AggregatedLogView` from `tui/packages/ui/src/index.ts`
- [ ] 8.2 Style with theme colors
- [ ] 8.3 Test with 3+ running containers
- [ ] 8.4 Test container start/stop during active stream
- [ ] 8.5 Test search and filter interactions
