## Why

Stopping an app started from the profile picker can fall back to a generic compose stop command that omits the configured compose file. With Podman this fails because `podman-compose` cannot find a local compose file in the app repository, leaving the app running and reporting a stop error.

## What Changes

- Reuse the recorded active run target when stopping an app that was started from a selected profile or target.
- Ensure Docker-compatible compose stops include the resolved compose file path when a target or persisted run target is known.
- Add a backend safety fallback so stop works after TUI refresh or server restart when persisted run target info is available.
- Keep dependency stop semantics unchanged: stopping an app stops only the requested app target, not dependencies.
- No breaking changes.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-action-variants`: Stop behavior for Docker-compatible app run targets must use the selected/active target instead of an unqualified compose stop.
- `app-run-target-info`: Persisted run target metadata must be usable by stop operations to route to the correct target after profile picker starts and server/TUI refreshes.

## Impact

- Backend app stop lifecycle in `server/pkg/build/stop_lifecycle.go`.
- Run target metadata use in `server/pkg/build/service.go` and state-backed lookup paths.
- TUI stop action routing in `tui/packages/cli/src/tui/actions/docker-actions.ts`.
- Client API already accepts `targetId`; no wire-format change expected.
- Tests for Docker/Podman compose stop command construction, profile picker stop routing, and persisted run target fallback.
