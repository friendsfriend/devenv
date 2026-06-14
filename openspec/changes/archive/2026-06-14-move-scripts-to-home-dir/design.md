## Context

Scripts currently live at `$CONFIG_DIR/scripts/` (default: `~/.config/devenv/scripts/`). The config directory is resolved from `$DEVENV_CONFIG_DIR` or defaults to `~/.config/devenv`. The scripts directory is computed by `resources.ScriptsDir(configDir)` which returns `filepath.Join(configDir, "scripts")`.

All six script API handlers (`handleListScripts`, `handleExecuteScript`, `handleCreateScript`, `handleLinkScript`, `handleDeleteScript`, `handleGetScriptArgsHistory`, `handleAddScriptArgsHistory`) construct the scripts directory via:
```go
scriptsDir := resources.ScriptsDir(s.services.ResourcesManager().ConfigDir())
```

The system already has `$DEVENV_HOME` as a separate concept — resolved by `resources.ResolveHomeDir(configDir)` with priority: `$DEVENV_HOME` env var → `.env` file → `~/devenv` fallback. It's already used for the state database (`$DEVENV_HOME/db/state.db`), logs (`$DEVENV_HOME/logs/`), and cloned app repositories (`$DEVENV_HOME/apps/`).

The `Container` interface already exposes both `HomeDir()` and `ResourcesManager().ConfigDir()` — the plumbing is in place.

## Goals / Non-Goals

**Goals:**
- Move the canonical scripts directory from `$CONFIG_DIR/scripts/` to `$DEVENV_HOME/scripts/`
- Update all API handlers to derive scripts path from home dir instead of config dir
- Update spec requirements to reflect the new location
- Ensure backward compatibility for the `ScriptsDir()` function signature (it still takes a base directory)

**Non-Goals:**
- No changes to the script discovery, execution, or management logic itself — only the root directory changes
- No migration logic (no users exist yet)
- No changes to how `$DEVENV_HOME` is resolved
- No changes to the script parameter annotation system (`@devenv:param`)
- No changes to the TUI's script browsing, execution, or management UI beyond updating any config-dir-specific text

## Decisions

### Decision: Change `ScriptsDir` to take home dir instead of config dir

**Option** | **Approach** | **Chosen?**
---|---|---
A | Change `ScriptsDir(configDir)` to `ScriptsDir(homeDir)` — same function, different parameter meaning | **✓ YES**
B | Add a new `ScriptsHomeDir()` function alongside the existing one | No — unnecessary duplication, no migration needed
C | Add `ScriptsDir()` as a method on `resources.Manager` that internally uses home dir | No — Manager is config-dir-oriented; scripts don't belong there
D | Put the scripts path directly in handlers (inline `filepath.Join(homeDir, "scripts")`) | No — `ScriptsDir` is a useful abstraction/well-known function

**Rationale**: Option A is the simplest change. The function's contract changes from "returns scripts dir under config root" to "returns scripts dir under devenv home directory." No callers depend on the config-dir semantics beyond passing it as a base path — they all just use the returned path for discovery and file operations.

### Decision: Update handler callsites to pass `s.services.HomeDir()`

Every handler that currently calls:
```go
resources.ScriptsDir(s.services.ResourcesManager().ConfigDir())
```
Changes to:
```go
resources.ScriptsDir(s.services.HomeDir())
```

This is a mechanical find-and-replace across `handlers_scripts.go`.

### Decision: Update spec requirements but not the spec's Purpose field

The `Purpose` field in both specs says "TBD - created by archiving change <name>. Update Purpose after archive." This is a pre-existing artifact of the archive process. We leave it as-is — the archive process will handle it.

## Risks / Trade-offs

- **[Low] Users who manually configured `$CONFIG_DIR/scripts/` expect scripts there**: No migration needed since there are no users yet. For future users, the path is documented in specs.
- **[Low] Shared config dir with scripts loses sharing**: If someone today keeps scripts in a version-controlled config dir to share across machines, this change breaks that pattern. Mitigation: `$DEVENV_HOME` can be pointed at a synced directory, or users can symlink. Not a concern at this stage.
- **[Low] TUI help text mentions "scripts/"**: The ScriptAddModal says "relative path under scripts/" — this is still correct since relative paths are relative to the scripts root regardless of where that root lives. No change needed.
