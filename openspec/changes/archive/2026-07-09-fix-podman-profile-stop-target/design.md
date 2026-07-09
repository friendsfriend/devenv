## Context

Docker-compatible app runs are selected through normalized run targets. Starting a Docker target uses the target source path and runs compose with `-f <configured compose file>`. The backend also records run target info, including target id and source path, and persists it to runtime state.

Stopping currently has two paths: a target-specific path when a target id is provided, and a generic fallback when no target id is provided. The TUI stop action does not pass the recorded active target id, so apps started from the profile picker can hit the generic fallback. That fallback invokes `docker-compose`/`podman-compose down` without `-f`, using the app repository as working directory. Podman-compose then fails when the compose file only exists in DevEnv's config directory.

## Goals / Non-Goals

**Goals:**
- Stop the same Docker-compatible run target that was started from the profile picker.
- Prefer active/persisted run target metadata over generic compose fallback when stopping an app.
- Ensure compose stop commands include the configured compose file path when the active target is known.
- Preserve current stop semantics for Kubernetes, shell tmux, script infrastructure, dependencies, and direct container stop actions.

**Non-Goals:**
- Redesign compose project naming.
- Change dependency shutdown behavior.
- Add new container runtime support beyond existing Docker/Podman selection.
- Replace podman-compose with `podman compose`.

## Decisions

### TUI passes recorded target id on app stop

When stopping an app row, the TUI should pass `app.runTargetInfo?.targetId` to the existing `stopApp(appIdent, targetId)` client method. This keeps stop routing aligned with profile picker start routing and uses the API shape that already exists.

Alternative considered: have the TUI rediscover targets before stop. Rejected because recorded run target info is already the source of truth for the active run, and rediscovery can fail or differ after config edits.

### Backend falls back to persisted run target info

`StopAppWithStatus` should, when no explicit target id is provided, check recorded run target info and route to the matching target before generic fallback. This covers TUI refreshes, stale client data, and server restarts where persisted run target info still exists.

Alternative considered: rely only on the TUI to pass target id. Rejected because backend should remain robust for older clients and direct API calls.

### Generic compose fallback should not assume local compose files

If stop reaches Docker-compatible generic fallback, it should resolve the configured default compose file when possible and include `-f`. A naked `compose down` should only be last resort when no configured compose file can be resolved.

Alternative considered: remove generic fallback entirely. Rejected because existing behavior may be useful for legacy/manual states where target metadata is absent.

## Risks / Trade-offs

- [Risk] Config changed after app start so recorded target id no longer resolves. → Fall back to source path from persisted run target info when safe, or report a clear target resolution error before generic fallback.
- [Risk] Generic fallback with `-f` may not stop containers created from a different profile. → Prefer explicit or persisted target id first; use default compose resolution only as last resort.
- [Risk] Older clients still omit target id. → Backend persisted run target lookup handles this.
- [Risk] Podman-compose and docker-compose argument order differences. → Preserve existing successful start/target stop argument order and cover with tests.
