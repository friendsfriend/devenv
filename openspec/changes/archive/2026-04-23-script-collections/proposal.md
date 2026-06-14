## Why

DevEnv currently manages applications, infrastructure, and libraries, but it has no first-class way to manage reusable local automation scripts. Users need to keep bash and PowerShell scripts inside the config directory, organize them in nested folders, run them from the TUI, and open them in an editor without leaving the application.

## What Changes

- Add support for script collections stored under the DevEnv config directory, following the same externalized configuration model as app-specific compose and build files.
- Discover bash and PowerShell scripts from a variable-depth folder hierarchy and expose them as a navigable tree in the TUI.
- Add a new Scripts view/tab in the main table so users can browse flat or deeply nested collections from within the application.
- Allow users to execute supported scripts from the UI and surface execution progress/output through the existing operation/logging patterns.
- Reuse the existing open-in-editor flow so script files can be opened and edited directly from the list.

## Capabilities

### New Capabilities
- `script-collections`: Manage config-backed bash and PowerShell script trees, including discovery, browsing, execution, and opening scripts in an external editor.

### Modified Capabilities
- None.

## Impact

- **Backend**: new script discovery/execution domain logic, config-directory resource resolution, and HTTP endpoints for listing and running scripts.
- **Frontend**: new Scripts tab, tree/list rendering for folders and scripts, keyboard handling for folder navigation and script execution, and reuse of editor actions for script files.
- **Shared types**: new script tree and script execution request/response types between server and TUI.
- **Config layout**: introduce a new `scripts/` subtree under `~/.config/devenv/` (or `DEVENV_CONFIG_DIR`) for user-managed script collections.
- **No breaking changes** to existing application, library, or infrastructure behavior.
