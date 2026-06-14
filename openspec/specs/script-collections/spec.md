# script-collections Specification

## Purpose

The script-collections capability defines how DevEnv discovers, executes, and provides parameter metadata for user-authored scripts in `$DEVENV_HOME/scripts/`. It supports any executable script regardless of language or extension (Unix) and uses shebang detection + extension mapping on Windows. Parameter metadata is declared via a `--devenv-metadata` convention rather than fragile comment parsing.

## Requirements

### Requirement: Discover home-directory-backed script collections
The system SHALL load script collections from the DevEnv home directory under `$DEVENV_HOME/scripts/` and preserve the filesystem hierarchy for any folder depth, including symlink-backed script entries located within that tree. Discovery SHALL use the executable bit (Unix) or shebang + extension detection (Windows) to determine which files are valid scripts.

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

### Requirement: Browse scripts in the main application list experience
The system SHALL provide a Scripts tab in the main table experience that displays folders and scripts as a navigable tree.

#### Scenario: Scripts tab shows hierarchical rows
- **WHEN** the user switches to the Scripts tab
- **THEN** the table SHALL display folder and script rows in tree order with enough hierarchy information to distinguish nesting levels

#### Scenario: Folder rows are not executable scripts
- **WHEN** the user focuses a folder row in the Scripts tab
- **THEN** the system SHALL treat it as a navigation row and SHALL NOT attempt to execute it as a script

#### Scenario: Script rows can be found by search
- **WHEN** the user uses table search while the Scripts tab is active
- **THEN** the system SHALL filter script and folder rows using the same search interaction pattern as the existing main table

---

### Requirement: Execute supported scripts from the TUI
The system SHALL allow users to execute supported scripts directly from the Scripts tab. On Unix, the system SHALL run the script directly via its shebang line (the OS handles interpreter selection). On Windows, the system SHALL resolve the interpreter from the shebang or a fallback extension mapping.

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

---

### Requirement: Open scripts in an external editor
The system SHALL allow script rows to be opened through the existing open-in-editor actions used from the main list.

#### Scenario: Open selected script in default editor
- **WHEN** the user focuses a script row and triggers the default open-in-editor action
- **THEN** the system SHALL open the selected script file in the configured editor

#### Scenario: Open selected script in a chosen editor
- **WHEN** the user focuses a script row and triggers the editor picker action
- **THEN** the system SHALL allow the user to choose an editor and open the selected script file in that editor

#### Scenario: Folder rows do not open an editor as a file
- **WHEN** the user triggers open-in-editor on a folder row
- **THEN** the system SHALL either open the folder path itself or ignore the action, but it SHALL NOT try to treat the folder as a script file

---

### Requirement: Surface script execution status and output
The system SHALL surface script execution progress and output through DevEnv's status and logging mechanisms.

#### Scenario: Successful script run reports completion
- **WHEN** a script execution finishes successfully
- **THEN** the system SHALL mark the run as completed and make its output available through DevEnv logging

#### Scenario: Failed script run reports failure
- **WHEN** a script execution exits with a non-zero status
- **THEN** the system SHALL mark the run as failed and make the failure output available through DevEnv logging
