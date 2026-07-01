## Why

Docker Compose `depends_on` cannot express DevEnv-native dependencies between app run targets, Docker app runs, script app runs, Docker infrastructure, and script infrastructure. DevEnv needs a config-driven dependency graph so each run profile can start its required apps and infrastructure consistently across Windows, macOS, and Linux.

## What Changes

- **BREAKING**: Run dependencies move from Docker Compose `depends_on` conventions to DevEnv metadata in run scripts and Compose extension fields; no automatic migration or backwards compatibility is provided.
- Add config-driven dependencies for app run targets and infrastructure services.
- Add `systemshell` runtime as a portable runtime selector: PowerShell on Windows, shell on macOS/Linux, strict with no fallback.
- Parse run dependencies directly from shell/PowerShell run script metadata and Docker Compose `x-devenv` metadata so dependencies can differ per run profile and per platform.
- Allow app run targets to require other app run targets and infrastructure services.
- Require dependency references to specify app, runtime, and profile for app dependencies; app dependencies always target run actions.
- Keep same-profile targets distinct by runtime, e.g. Docker `dev` and `systemshell` `dev` are separate run targets.
- Auto-start missing dependencies before starting the requested app run target.
- Stop only the requested app run target; dependencies remain running because they may be shared.
- Allow platform-specific dependency drift between `.sh` and `.ps1` `systemshell` run scripts.
- Remove need for migration logic; users manually update configs.

## Capabilities

### New Capabilities
- `config-driven-run-dependencies`: DevEnv dependency graph, dependency parsing, validation, start ordering, and stop semantics for app run targets and infrastructure services.

### Modified Capabilities
- `app-action-variants`: Add `systemshell` action runtime, PowerShell run target discovery, runtime-specific target identity, and metadata-based run dependencies.

## Impact

- Affects app action target discovery, Docker Compose metadata parsing, shell/PowerShell script metadata parsing, run target execution, infrastructure lifecycle orchestration, TUI target picker/start flow, status reporting, and documentation.
- Existing configs using Compose `depends_on` as DevEnv dependency source must be manually migrated to `devenv:requires` or `x-devenv.requires`.
- No migration path or compatibility shim is required.
