## Why

Action history currently exists only in TUI memory and disappears when TUI or server restarts. Persisting complete runs in existing SQLite state database makes prior actions, step status, commands, output, and exit results available after restart.

## What Changes

- Persist complete action-run snapshots in SQLite as lifecycle events arrive.
- Restore persisted action history when server starts.
- Expose action history through server API.
- Hydrate TUI action tree from persisted history before processing live events.
- Retain bounded recent history without coupling retention to in-memory active-run cleanup.

## Capabilities

### New Capabilities
- `action-run-history`: Durable storage, retrieval, retention, and client hydration of action runs.

### Modified Capabilities

## Impact

Affects SQLite state schema/store, action-run registry and event handling, server routes, core HTTP client, and TUI action-run store startup. No new external dependency; existing SQLite database and action-run types are reused.
