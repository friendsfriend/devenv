## Why

Scripts are currently stored under the config directory (`~/.config/devenv/scripts/`). But scripts are not configuration — they are personal automation tools that users write, iterate on, and run daily. Mixing them with declarative configuration (Dockerfiles, compose files, agent definitions) creates an unintuitive mental model. Users should find their scripts in their personal devenv workspace (`$DEVENV_HOME`), not buried in the config folder alongside system setup files.

This change moves the canonical scripts directory from `$CONFIG_DIR/scripts/` to `$DEVENV_HOME/scripts/`, giving users a cleaner separation between "how the tooling is configured" and "what I do with the tool."

## What Changes

- **Move scripts root** — Change `resources.ScriptsDir()` to derive from `$DEVENV_HOME` instead of `$CONFIG_DIR`
- **Update all script handlers** — Every API handler that constructs the scripts directory switches to `s.services.HomeDir()` instead of `s.services.ResourcesManager().ConfigDir()`
- **Update the `script-collections` spec** — The requirement text that references "config directory under scripts/" changes to reference "$DEVENV_HOME/scripts/"
- **No user-facing configuration change** — `$DEVENV_HOME` defaults to `~/devenv` if unset, so the default path changes from `~/.config/devenv/scripts/` to `~/devenv/scripts/`

## Capabilities

### New Capabilities
*(none — no new capabilities are introduced)*

### Modified Capabilities
- `script-collections`: Requirement that scripts are loaded from config directory changes to loading from `$DEVENV_HOME/scripts/`
- `script-creation-and-linking`: Requirement that scripts are created/linked under config `scripts/` changes to `$DEVENV_HOME/scripts/`

## Impact

- **`server/pkg/resources/scripts.go`**: `ScriptsDir()` function — change parameter semantics from config dir to home dir
- **`server/pkg/server/handlers_scripts.go`**: All handlers that call `ScriptsDir()` — pass `s.services.HomeDir()` instead of `s.services.ResourcesManager().ConfigDir()`
- **`server/pkg/resources/scripts_test.go`**: Test assertions that reference config-dir-based paths
- **`server/pkg/server/scripts_test.go`**: Test assertions that reference config-dir-based paths
- **`openspec/specs/script-collections/spec.md`**: Update requirement text about scripts location
- **`openspec/specs/script-creation-and-linking/spec.md`**: Update requirement text about scripts location
- **`tui/packages/ui/src/components/ScriptAddModal.tsx`**: Update user-facing help text if it references `scripts/` in a config-dir context (text reads "relative path under scripts/" — this is ambiguous enough to stay correct, but worth reviewing)
