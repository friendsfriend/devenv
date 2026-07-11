## Why

Status logs, operation logs, and action runs overlap while exposing different detail and retention behavior. Consolidating operational history into durable actions gives users one consistent status surface and one detailed command/output view.

## What Changes

- Migrate operation-log producers and supported status-log producers to action lifecycle events.
- Represent app, infrastructure, task/script, Git, Kubernetes, and supported utility operations as durable actions with commands, output, exit status, and errors where applicable.
- Remove status-log storage, API, state, modal, and rendering.
- Remove operation-log files, API, polling, and dedicated viewer paths after producer migration.
- Reassign uppercase `L` to toggle action modal without starting an action.
- Replace bottom status-log panel with compact action-status strip showing action label and status only.
- Keep full details exclusively in action modal.

## Capabilities

### New Capabilities
- `unified-action-history`: One action-based lifecycle and history surface for operational work, including compact table summary and detailed modal access.

### Modified Capabilities
- `task-status-log-entries`: Replace task status-log entries with action runs.
- `app-action-variants`: Replace operation-log requirements with action command/output retention.

## Impact

Touches server logging and action instrumentation, build/operations/Git/Kubernetes/task producers, SQLite history, log APIs, TUI stores/actions/keymaps/modals/main-table layout, shared UI components, types, tests, and guides. Status and operation log APIs/files become removed internal interfaces.
