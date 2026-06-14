# multi-runtime-execution Specification

## Purpose

Defines how DevEnv discovers and executes any executable script regardless of language. On Unix, scripts are executed directly via their shebang line (the OS handles interpreter selection). On Windows, a lightweight shebang reader resolves the interpreter, falling back to an extension-based mapping. This eliminates the need for per-language code changes when adding new script types.

## Requirements

### Requirement: Discover any executable script in the scripts directory
The system SHALL discover executable scripts in the `$DEVENV_HOME/scripts/` directory tree regardless of file extension, using the executable bit (Unix) or shebang + extension detection (Windows).

#### Scenario: Unix — executable script with any extension is discovered
- **WHEN** the scripts directory contains an executable file `./deploy.sh` with shebang `#!/usr/bin/env bash`
- **THEN** the system SHALL include `deploy.sh` in the script collection listing

#### Scenario: Unix — executable Python script is discovered
- **WHEN** the scripts directory contains an executable file `./migrate.py` with shebang `#!/usr/bin/env python3`
- **THEN** the system SHALL include `migrate.py` in the script collection listing

#### Scenario: Unix — executable TypeScript script is discovered
- **WHEN** the scripts directory contains an executable file `./serve.ts` with shebang `#!/usr/bin/env bun`
- **THEN** the system SHALL include `serve.ts` in the script collection listing

#### Scenario: Unix — non-executable file is ignored
- **WHEN** the scripts directory contains a non-executable file `./notes.md`
- **THEN** the system SHALL exclude `notes.md` from the script collection listing

#### Scenario: Windows — file with recognized extension is discovered
- **WHEN** the scripts directory contains `./setup.py`, `./deploy.sh`, and `./serve.ts`
- **THEN** the system SHALL include all three files in the script collection listing (using the extension-to-interpreter mapping)

#### Scenario: Windows — file with shebang but no recognized extension is discovered
- **WHEN** the scripts directory contains `./custom-tool` (no extension) with shebang `#!/usr/bin/env node`
- **THEN** the system SHALL include `custom-tool` in the script collection listing if `node` is recognized

---

### Requirement: Execute any discovered script via its shebang
The system SHALL execute scripts by relying on the shebang line (Unix) or by resolving the interpreter from the shebang (Windows). Custom interpreter resolution is NOT needed on Unix — the OS handles it.

#### Scenario: Unix — execute a bash script via shebang
- **WHEN** the user triggers execution for `./deploy.sh`
- **THEN** the system SHALL run `exec.Command("./deploy.sh", args...)` (shebang invokes bash)
- **THEN** the script SHALL run with its parent directory as the working directory

#### Scenario: Unix — execute a bun script via shebang
- **WHEN** the user triggers execution for `./serve.ts`
- **THEN** the system SHALL run `exec.Command("./serve.ts", args...)` (shebang invokes bun)
- **THEN** the script SHALL run with its parent directory as the working directory

#### Scenario: Windows — execute a script with resolved interpreter
- **WHEN** the user triggers execution for `./migrate.py` with shebang `#!/usr/bin/env python3`
- **THEN** the system SHALL resolve the interpreter to `python` and run `exec.Command("python", scriptPath, args...)`

#### Scenario: Missing interpreter prevents execution
- **WHEN** the user triggers execution for a script whose shebang references an interpreter that is not installed
- **THEN** the system SHALL fail the run with a clear user-visible error

#### Scenario: Binary executable is discovered and executed
- **WHEN** the scripts directory contains a compiled binary `./tool` that is executable
- **THEN** the system SHALL include `tool` in the script collection listing
- **THEN** the system SHALL execute it directly via the shebang mechanism (binary has none, but OS treats it as an executable)
