## 1. Backend script resource support

- [x] 1.1 Add script domain/types for folders, script files, and execution requests/responses in the Go server and shared TypeScript types
- [x] 1.2 Extend `server/pkg/resources` with helpers for resolving the config `scripts/` directory and recursively discovering supported `.sh` and `.ps1` files
- [x] 1.3 Build a normalized script tree payload that preserves nested folders and supports flat collections
- [x] 1.4 Add server endpoints for listing script collections and executing a selected script
- [x] 1.5 Implement interpreter selection (`bash`, `pwsh`, `powershell`) and working-directory handling based on the selected script file
- [x] 1.6 Integrate script execution with status/log output so success and failure are visible in DevEnv
- [x] 1.7 Add backend tests for discovery, unsupported-file filtering, missing interpreters, and execution working directory behavior

## 2. Client API and state wiring

- [x] 2.1 Add script collection and execution types to `tui/packages/types`
- [x] 2.2 Add core client methods for fetching the script tree and triggering script execution
- [x] 2.3 Extend the app/table store model with a `scripts` tab, script tree data, visible tree rows, and folder expansion state
- [x] 2.4 Add actions for loading scripts, toggling folder expansion, and executing the focused script row

## 3. TUI table and keyboard behavior

- [x] 3.1 Update the main table tabs and tab-switching logic to include the Scripts tab
- [x] 3.2 Add a script-specific column set/rendering path for folder and script rows with visible indentation/tree cues
- [x] 3.3 Update table navigation so folder rows can expand/collapse and script rows can be executed without breaking existing app behavior
- [x] 3.4 Reuse the existing `e` / `E` editor actions by passing selected script or folder paths when the Scripts tab is active
- [x] 3.5 Update help text and any selection/status labels so script actions are discoverable in the UI

## 4. Documentation and validation

- [x] 4.1 Document the new `~/.config/devenv/scripts/` directory layout and supported file types in `README.md`
- [x] 4.2 Add example script tree snippets showing nested and flat collections
- [x] 4.3 Run relevant backend and TUI tests/build checks for the new script workflow
