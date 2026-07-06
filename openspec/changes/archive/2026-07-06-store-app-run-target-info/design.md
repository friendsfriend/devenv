## Context

DevEnv already discovers normalized action targets for app build/test/run flows. The picker renders each run target as a user-facing string such as `[tmux] bun build (default)` from runtime, launch mode, label, and profile. Once execution starts, the server keeps partial runtime state (`lastRunRuntime`, tmux run state, Kubernetes metadata), but status responses and SSE updates do not expose the selected target/profile in a form the TUI can display.

The change crosses server runtime state, shared API types, client status merging, and reusable UI components. The run target display should match picker semantics, not expose only raw compose profile.

## Goals / Non-Goals

**Goals:**

- Store app-scoped run target metadata when an app run/start target is launched.
- Expose optional run target info in app status polling and `status.updated` events.
- Render the same target/profile style as the picker in app detail and the main app list.
- Support Docker, shell, PowerShell, systemshell, and Kubernetes run targets through the existing normalized `ActionTarget` fields.
- Keep backward compatibility for clients that ignore the new field.

**Non-Goals:**

- Persist historical launch records beyond the latest known run target.
- Change action target discovery or execution semantics.
- Add new keyboard shortcuts or list controls.
- Show historical launches; only the current/last known run target for an app is in scope.

## Decisions

1. **Store normalized run target info in the build service and runtime state DB.**
   - Add an app-scoped `RunTargetInfo`/`AppRunInfo` model backed by an in-memory cache and persisted to the SQLite `app_state` runtime state table.
   - Populate it from the resolved `resources.ActionTarget` at run start.
   - Rationale: target resolution already happens in `runAppInternal`, and SQLite already persists mutable local runtime state across server restarts.
   - Alternative considered: derive from Docker containers or tmux window names. That would be incomplete for Kubernetes and systemshell and would duplicate parsing rules.

2. **Store display parts, not only a preformatted string.**
   - Store runtime, launch mode, label, profile, target id, source path, and started timestamp.
   - Also expose a server-computed `display` string using the picker convention.
   - Rationale: the UI can render the exact requested string immediately while tests can assert structured fields.
   - Alternative considered: expose only `display`. That is simple but loses data needed for compact UI and future details.

3. **Mirror the picker display convention server-side.**
   - Badge rules: `shell` + `tmux` uses `[tmux]`; otherwise use `[<runtime>]`.
   - Text rule: `<badge> <label>` plus ` (<profile-or-default>)` when meaningful.
   - For targets with empty profile but default Docker profile, display `(default)` when the target label/profile indicates default.
   - Rationale: the server owns status payloads and can send display text without duplicating target lookup in TUI stores.
   - Alternative considered: share a TypeScript formatter only. Server is Go, so this would not cover status creation.

4. **Expose run target info as optional API/SSE data.**
   - Add `runTargetInfo` to app status responses and `status.updated` events.
   - Merge it into TUI app state when present; clear it only if server explicitly sends `null` or no active/known run target after stop.
   - Rationale: same live update path already carries docker info, branch, operation status, and run status.
   - Alternative considered: add a separate endpoint. That adds fetch complexity and risks stale list/detail displays.

5. **Display full detail and compact overview.**
   - `AppDetailView` shows a row such as `Run Target: [tmux] bun build (default)` plus optional started/source details where space permits.
   - Main `Table` app metadata/status suffix shows compact `display` when present.
   - Rationale: details solve ambiguity; overview gives quick recognition without crowding columns.

## Risks / Trade-offs

- **Persisted state can be stale after external stops** → Clear on DevEnv stop paths and inactive tracked tmux detection; status remains best-effort for externally stopped runs.
- **Display convention drift between picker and server** → Add shared tests or test fixtures for representative target displays.
- **Long target labels clutter overview** → Truncate or include only in metadata suffix; full value remains in detail view.
- **Stop/restart semantics may leave stale run info** → Clear run target info when stop succeeds or when runtime-specific status reports stopped for known shell/kubernetes runs.
- **Legacy profile-only start path lacks target id** → Resolve the Docker run target from profile before recording info; if resolution fails, fall back to profile-based display.
