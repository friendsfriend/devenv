## Context

Three operational-history systems coexist: structured status log, text operation logs, and durable action runs. Producers often write two or three representations, while TUI exposes separate bottom panel, modal, and operation-log viewer. Action runs now retain commands, output, exit status, errors, nested steps, and 24-hour SQLite history, making older systems redundant.

## Goals / Non-Goals

**Goals:**
- Make action runs sole operational status/history model.
- Instrument all supported status/operation producers as actions before deleting old paths.
- Provide one-key action modal access independent of starting work.
- Preserve glanceable main-table feedback in one terminal row.
- Remove obsolete files, APIs, stores, keymaps, components, and guides.

**Non-Goals:**
- Replace application/container runtime logs or server diagnostic logs.
- Convert low-level debug chatter into user-visible actions.
- Preserve compatibility for internal status/operation-log APIs after migration.

## Decisions

- Introduce reusable server action lifecycle service usable outside build/start flows. Producers create action, step, and command records through this API instead of writing status/operation logs.
- Migrate producer categories in slices: build/operations already action-aware; then Kubernetes/infra, tasks/scripts, Git/worktrees, and supported utilities. Delete legacy consumers only after producer parity tests pass.
- Treat actions as user-meaningful operations. Startup utility discovery is diagnostic information, not an action, and moves to server/debug logging rather than action history.
- Uppercase `L` becomes discoverable `actions.toggle` command in table keymap layer. It pushes/pops `actions` modal through modal stack and never starts an operation.
- Replace four-line `StatusLogView` with reusable one-row `ActionStatusStrip`. Render newest relevant actions left-to-right as plain compact segments: status glyph plus action label (`✓ Build api  ⟳ Start web  ✗ Test worker`). Use shared semantic highlights, no badges, timestamps, messages, details, or borders. Fit as many segments as width allows, truncate final segment, and prioritize active then failed then recent completed actions. Clicking strip opens action modal.
- Keep full command output, nested steps, errors, and history controls only in action modal.
- Remove `/api/logs/status`, `/api/logs/operation/*`, status.log, operation log files, polling, and related types after migration. Keep container logs, app logs, and server logs.

## Risks / Trade-offs

- [Producer coverage gaps] → Inventory every status/operation writer and add parity tests before deleting legacy paths.
- [Actions become noisy] → Only user-initiated or lifecycle-significant operations create actions; diagnostics remain normal logs.
- [One-row strip truncation] → Width-aware rendering and modal access provide details without consuming table height.
- [Migration temporarily duplicates events] → Land instrumentation first, validate, then remove legacy writes in same change before release.
- [Old status/operation files remain on disk] → Stop creating/reading them; document that existing files are inert and may be manually deleted. Do not destructively delete user files during migration.

## Migration Plan

1. Add generic action lifecycle producer API and compact strip.
2. Migrate and test each supported producer category.
3. Switch `L` and bottom panel to actions.
4. Remove status/operation APIs, files, state, components, and docs.
5. Run full tests and search repository for remaining legacy references.

## Open Questions

- Exact set of informational server events worth exposing as actions should remain conservative; default is user-triggered operations only.
