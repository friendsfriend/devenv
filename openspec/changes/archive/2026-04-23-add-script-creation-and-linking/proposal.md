## Why

Users can browse and run scripts from the Scripts tab, but cannot add new entries from the TUI. This slows onboarding and reuse because users must leave DevEnv to create files or wire aliases manually.

## What Changes

- Add a `+`-driven add-script flow in the Scripts tab with two options:
  - **Use existing script**: create a new script entry in the config `scripts/` tree that points to an existing script path via symlink.
  - **Create new script**: create a new script file directly in the config `scripts/` tree.
- Support new-script naming with either:
  - `folder/subfolder/script` (create missing folders in tree), or
  - `script` (flat root script).
- Add required input fields for the existing-script option:
  - new script name/path (target location in scripts tree), and
  - source script path (existing file to link to).
- Add starter comment block with example parameter definitions in newly created scripts.
- Prefill the target name/path input with the currently selected folder in the Scripts tree.
- Refresh the Scripts tab tree so newly created links/files appear at the expected folder location.

## Capabilities

### New Capabilities
- `script-creation-and-linking`: Add scripts from the Scripts tab by creating new files or symlinks, including path-based tree placement and starter parameter comments.

### Modified Capabilities
- `script-collections`: Extend script collection behavior to include user-created script entries and symlink-backed entries created from the Scripts tab.

## Impact

- Affected areas: TUI Scripts tab actions/modals, script collection creation logic, filesystem write/symlink operations, and script tree refresh behavior.
- APIs/dependencies: no external API changes expected; uses local filesystem operations in config directory.
- UX: introduces add-script interaction flow, default target-path prefilling from current folder selection, and validation for name/path fields.