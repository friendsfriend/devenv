# script-creation-and-linking Specification

## Purpose
TBD - created by archiving change add-script-creation-and-linking. Update Purpose after archive.

## Requirements
### Requirement: Add script flow from Scripts tab
The system SHALL provide an add-script action in the Scripts tab that is triggered by `+` and offers mode selection between creating a new script and linking an existing script.

#### Scenario: User opens add-script flow
- **WHEN** the user is in the Scripts tab and presses `+`
- **THEN** the system SHALL open an add-script flow with options `Create new script` and `Use existing script`

#### Scenario: Mode-specific fields are displayed
- **WHEN** the user selects `Use existing script`
- **THEN** the system SHALL require both a target script name/path and a source script path input before submission

#### Scenario: Target name is prefilled from selected folder
- **WHEN** the user opens the add-script flow while a folder row is selected in the Scripts tab
- **THEN** the system SHALL prefill the target name/path input with that selected folder path

#### Scenario: Target name uses parent folder when script is selected
- **WHEN** the user opens the add-script flow while a script row is selected in the Scripts tab
- **THEN** the system SHALL prefill the target name/path input with the selected script row's parent folder path

---

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

---

### Requirement: Reflect newly added entries in script tree
The system SHALL refresh the Scripts tab after successful create or link operations so that the new entry appears in the correct folder hierarchy.

#### Scenario: Tree updates after successful create/link
- **WHEN** an add-script operation succeeds
- **THEN** the Scripts tab SHALL show the new entry at the path represented by the submitted target name
