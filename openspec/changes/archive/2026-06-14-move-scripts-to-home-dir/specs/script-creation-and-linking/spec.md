## MODIFIED Requirements

### Requirement: Create new script in devenv scripts directory
The system SHALL create a new script file under the `$DEVENV_HOME/scripts/` directory using the entered target name/path.

#### Scenario: Create new script with nested path
- **WHEN** the user submits target name `folder/subfolder/script` in `Create new script` mode
- **THEN** the system SHALL create missing folders under `scripts/` and create the script file at `scripts/folder/subfolder/script`

#### Scenario: Create new script with flat name
- **WHEN** the user submits target name `script` in `Create new script` mode
- **THEN** the system SHALL create the script file directly under `scripts/script`

#### Scenario: New script contains parameter definition examples
- **WHEN** a new script file is created from the add-script flow
- **THEN** the file SHALL include a starter comment block with example parameter definitions

---

### Requirement: Link existing script into scripts tree
The system SHALL create a symlink in the `$DEVENV_HOME/scripts/` directory that maps the entered target name/path to the provided source script path.

#### Scenario: Create symlink using target name and source path
- **WHEN** the user submits target name `ops/db/init` and source path `/tools/shared/init.sh` in `Use existing script` mode
- **THEN** the system SHALL create a symlink at `scripts/ops/db/init` that points to `/tools/shared/init.sh`

#### Scenario: Reject invalid link inputs
- **WHEN** the target name/path is empty, escapes the scripts root, or already exists, or the source script path does not exist
- **THEN** the system SHALL reject creation and show a validation error without creating files or links
