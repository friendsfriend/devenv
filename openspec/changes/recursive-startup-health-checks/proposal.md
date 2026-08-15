## Why

Actions currently expose scattered status and logs. Users need one live screen showing action progress, executed commands, and command output while action runs.

## What Changes

- Resolve action dependencies into ordered execution steps.
- Wait for each started dependency to become healthy before starting dependents.
- Add action-run screen opened whenever an action starts.
- Show ordered steps with active loading state, completed state, and failure state.
- Show live command output for focused step.
- Allow per-step log inspection; normally one step maps to one command.
- Auto-focus failed step, otherwise most recently started step, until user manually moves focus.

## Impact

- Server resolves dependency plans, polls Docker health, and emits structured action-step lifecycle/output events.
- TUI stores action runs and renders full-screen action view.
- Existing status/log streams remain compatible.
