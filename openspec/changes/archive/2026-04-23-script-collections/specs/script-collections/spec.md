## ADDED Requirements

### Requirement: Discover config-backed script collections
The system SHALL load script collections from the DevEnv config directory under `scripts/` and preserve the filesystem hierarchy for any folder depth.

#### Scenario: Nested script folders are discovered
- **WHEN** the config directory contains script files under nested folders such as `scripts/database/installer/initialize.sh`
- **THEN** the system SHALL return a script tree that includes the `database` and `installer` folders and the `initialize.sh` script in the correct hierarchy

#### Scenario: Flat script folders are supported
- **WHEN** the config directory contains script files directly under `scripts/`
- **THEN** the system SHALL expose those scripts without requiring any nested folders

#### Scenario: Unsupported files are ignored
- **WHEN** the `scripts/` directory contains files that are not supported script types
- **THEN** the system SHALL exclude those files from the script collection listing

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
The system SHALL allow users to execute supported scripts directly from the Scripts tab.

#### Scenario: Execute a bash script
- **WHEN** the user triggers execution for a `.sh` script row
- **THEN** the system SHALL run the script with a bash-compatible interpreter and report the run as an execution started by DevEnv

#### Scenario: Execute a PowerShell script
- **WHEN** the user triggers execution for a `.ps1` script row
- **THEN** the system SHALL run the script with a PowerShell interpreter appropriate for the current platform

#### Scenario: Missing interpreter prevents execution
- **WHEN** the user triggers execution for a supported script type whose interpreter is not available
- **THEN** the system SHALL fail the run with a clear user-visible error and SHALL NOT mark the script as successfully executed

#### Scenario: Script runs relative to its own folder
- **WHEN** a script is executed and it references relative files in its collection folder
- **THEN** the system SHALL run the command with the script's parent directory as the working directory

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
