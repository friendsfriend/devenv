## MODIFIED Requirements

### Requirement: Discover home-directory-backed script collections
The system SHALL load script collections from the DevEnv home directory under `$DEVENV_HOME/scripts/` and preserve the filesystem hierarchy for any folder depth, including symlink-backed script entries located within that tree. Discovery SHALL use the executable bit (Unix) or shebang + extension detection (Windows) to determine which files are valid scripts, rather than filtering by a hardcoded set of extensions.

#### Scenario: Nested script folders are discovered
- **WHEN** the home directory contains script files under nested folders such as `scripts/database/installer/initialize.sh`
- **THEN** the system SHALL return a script tree that includes the `database` and `installer` folders and the `initialize.sh` script in the correct hierarchy

#### Scenario: Flat script folders are supported
- **WHEN** the home directory contains script files directly under `scripts/`
- **THEN** the system SHALL expose those scripts without requiring any nested folders

#### Scenario: Symlink-backed scripts are included by tree location
- **WHEN** a script entry under `scripts/` is a symlink to an existing script file outside or inside the home tree
- **THEN** the system SHALL list the entry at its symlink location in the script hierarchy and treat it as an executable script row

#### Scenario: Unix — executable files with any extension are discovered
- **WHEN** the `scripts/` directory contains an executable file `deploy.py`, `serve.ts`, or `tool` (no extension, executable)
- **THEN** the system SHALL include those files in the script collection listing regardless of file extension

#### Scenario: Unix — non-executable files are ignored
- **WHEN** the `scripts/` directory contains a non-executable file `README.md` or `notes.txt`
- **THEN** the system SHALL exclude those files from the script collection listing

#### Scenario: Windows — files with known executable extensions or shebangs are discovered
- **WHEN** the `scripts/` directory contains `deploy.sh`, `migrate.py`, `serve.ts`, and `README.md`
- **THEN** the system SHALL include `deploy.sh`, `migrate.py`, and `serve.ts` in the listing
- **THEN** the system SHALL exclude `README.md` from the listing

---

### Requirement: Execute supported scripts from the TUI
The system SHALL allow users to execute scripts directly from the Scripts tab. On Unix, the system SHALL run the script directly via its shebang line (the OS handles interpreter selection). On Windows, the system SHALL resolve the interpreter from the shebang or a fallback extension mapping.

#### Scenario: Execute a script via its shebang (Unix)
- **WHEN** the user triggers execution for any executable script file
- **THEN** the system SHALL invoke the script directly (shebang determines interpreter)
- **THEN** the script SHALL run with its parent directory as the working directory

#### Scenario: Execute a script via resolved interpreter (Windows)
- **WHEN** the user triggers execution for a script with shebang `#!/usr/bin/env python3`
- **THEN** the system SHALL resolve the interpreter to `python` and run the script with that interpreter
- **THEN** the script SHALL run with its parent directory as the working directory

#### Scenario: Missing interpreter prevents execution
- **WHEN** the user triggers execution for a script whose shebang references an interpreter that is not available
- **THEN** the system SHALL fail the run with a clear user-visible error and SHALL NOT mark the script as successfully executed

#### Scenario: Script runs relative to its own folder
- **WHEN** a script is executed and it references relative files in its collection folder
- **THEN** the system SHALL run the command with the script's parent directory as the working directory

---

### Requirement: Surface script parameter definitions via `--devenv-metadata`
The system SHALL support the `--devenv-metadata` convention for scripts to declare their input parameters. When the user triggers execution of a script that has defined parameters, the system SHALL display a parameter input modal before running the script.

#### Scenario: Script with `--devenv-metadata` support shows parameter modal
- **WHEN** the user triggers execution for a script that responds to `--devenv-metadata` with a valid schema
- **THEN** the system SHALL display the parameter input modal with fields matching the schema
- **THEN** the system SHALL pass the user-provided values as CLI flags when executing the script

#### Scenario: Script without `--devenv-metadata` support runs directly
- **WHEN** the user triggers execution for a script that does not respond to `--devenv-metadata`
- **THEN** the system SHALL run the script directly without showing the parameter input modal
