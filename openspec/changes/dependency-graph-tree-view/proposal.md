## Why

Apps declare dependencies on infrastructure services and other apps via `x-devenv.requires` in compose files and `# devenv:requires` in run scripts. The server resolves these into `ActionTarget.requires` (`DependencyRef[]`). However, the TUI has no visibility into these relationships — users can't see what an app depends on without reading config files manually.

## What Changes

- Add a dependency tree view to `AppDetailView` showing the recursive dependency graph for the selected app
- Each node displays: icon (app/infra), name, runtime, profile, and health status (running/stopped)
- Tree expands recursively for app→app dependencies
- New keyboard shortcut `d` from app detail view focuses the dependency tree

## Capabilities

### New Capabilities
- `dependency-tree-view`: Renders the dependency graph for an app as an interactive tree in the detail view, showing apps and infrastructure services with their runtime status

### Modified Capabilities

## Impact

- `tui/packages/ui/src/components/AppDetailView.tsx` — add dependency tree section
- `tui/packages/ui/src/components/DependencyTreeView.tsx` — new component
- `tui/packages/core/src/apps-client.ts` — expose action targets with requires data
- `tui/packages/cli/src/tui/stores/app-detail-store.ts` — store action targets for selected app
- `tui/packages/cli/src/tui/keyboard/` — add `d` keybinding for dependency focus
