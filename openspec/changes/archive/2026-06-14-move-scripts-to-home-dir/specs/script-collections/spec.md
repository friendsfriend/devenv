## MODIFIED Requirements

### Requirement: Discover home-directory-backed script collections
The system SHALL load script collections from the DevEnv home directory under `$DEVENV_HOME/scripts/` and preserve the filesystem hierarchy for any folder depth, including symlink-backed script entries located within that tree.

#### Scenario: Nested script folders are discovered
- **WHEN** the home directory contains script files under nested folders such as `scripts/database/installer/initialize.sh`
- **THEN** the system SHALL return a script tree that includes the `database` and `installer` folders and the `initialize.sh` script in the correct hierarchy

#### Scenario: Flat script folders are supported
- **WHEN** the home directory contains script files directly under `scripts/`
- **THEN** the system SHALL expose those scripts without requiring any nested folders

#### Scenario: Symlink-backed scripts are included by tree location
- **WHEN** a script entry under `scripts/` is a symlink to an existing script file outside or inside the home tree
- **THEN** the system SHALL list the entry at its symlink location in the script hierarchy and treat it as an executable script row

#### Scenario: Unsupported files are ignored
- **WHEN** the `scripts/` directory contains files that are not supported script types
- **THEN** the system SHALL exclude those files from the script collection listing
