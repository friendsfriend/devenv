## Context

Action runs are reduced from SSE events into a volatile TUI store. Server registry also remains memory-only and retains only initial run shape plus final status. Existing SQLite state store already owns schema migration, locking, and lifecycle.

## Goals / Non-Goals

**Goals:**
- Persist complete action snapshots, including nested steps, commands, output, errors, timestamps, and status.
- Restore history after TUI and server restart.
- Keep live SSE behavior while making history hydration idempotent.
- Bound retained history.

**Non-Goals:**
- Durable replay of every raw SSE event.
- Cross-machine synchronization.
- Indefinite audit retention.

## Decisions

- Store each complete run as a JSON snapshot in a new SQLite table keyed by UUID run ID. JSON avoids duplicating nested action schema across relational tables and supports atomic replacement after each lifecycle mutation.
- Add action-history methods to existing state Store interface and schema migration v5.
- Make action registry own snapshot mutation for every lifecycle event, then persist updated snapshot through injected repository callback. This prevents TUI-only state from being authoritative.
- Add paged recent-history HTTP endpoint. TUI fetches history before subscription and merges by run ID; live `action.started` replaces matching hydrated data.
- Retain action history for 24 hours. Expire old persisted events during writes and reads, and use same retention for completed in-memory runs. Active rows are never pruned.

## Risks / Trade-offs

- [Frequent output writes] → Coalesce output persistence on server similarly to TUI buffering or persist per command event/chunk with bounded write frequency.
- [Crash between event and snapshot write] → Persist mutation before broadcasting lifecycle event where practical; SQLite snapshot replacement is atomic.
- [Schema evolution inside JSON] → Keep additive JSON fields and tolerate missing fields on decode.
- [Large output history] → Enforce 24-hour time retention plus event-count safety cap.
