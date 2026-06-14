## REMOVED Requirements

The following requirements are being removed because their corresponding features are being eliminated from the codebase. These were implicit requirements (never formalized as separate capability specs) whose behavior is being deleted.

### Requirement: Dockerfile falls back to repository root

The system SHALL resolve build and test Dockerfiles by first checking the config directory, then falling back to the repository root.

**Reason**: Replaced by config-directory-only resolution. All Dockerfiles must now live in `{configDir}/apps/build/{appIdent}-{action}.Dockerfile`.

**Migration**: Copy `devenv-build.Dockerfile` and `devenv-test.Dockerfile` from repository roots to `~/.config/devenv/apps/build/{appIdent}-build.Dockerfile` (and `-test.Dockerfile`).

#### Scenario: Dockerfile found in repository root
- **WHEN** no Dockerfile exists in the config directory
- **THEN** the system falls back to `{repoRoot}/devenv-build.Dockerfile`

#### Scenario: Dockerfile in repository root takes priority
- **WHEN** no Dockerfile exists in the config directory
- **THEN** the system uses `{repoRoot}/devenv-test.Dockerfile` for test actions

### Requirement: Compose file falls back to repository root

The system SHALL resolve Compose files by first checking the config directory, then falling back to the repository root (for both default and profile-specific compose files).

**Reason**: Replaced by config-directory-only resolution. All Compose files must now live in `{configDir}/apps/compose/`.

**Migration**: Copy `devenv-compose.yml` and `devenv-*-compose.yml` from repository roots to `~/.config/devenv/apps/compose/`.

#### Scenario: Default compose file in repository root
- **WHEN** no compose file exists in the config directory and no profile is specified
- **THEN** the system falls back to `{repoRoot}/devenv-compose.yml`

#### Scenario: Profile-specific compose file in repository root
- **WHEN** no profile-specific compose file exists in the config directory
- **THEN** the system falls back to `{repoRoot}/devenv-{profile}-compose.yml`

#### Scenario: Profile not found falls back to default repo-root compose
- **WHEN** no profile-specific compose file exists in either location
- **THEN** the system falls back to the default `{repoRoot}/devenv-compose.yml`

### Requirement: Profile discovery includes repository root

The system SHALL discover profile-specific compose files by scanning both the config directory and the repository root.

**Reason**: Profile discovery is now limited to the config directory only.

**Migration**: Move profile compose files from repository roots to `~/.config/devenv/apps/compose/{appIdent}-{profile}-compose.yml`.

#### Scenario: Profile discovered from repository root
- **WHEN** a file `devenv-{profile}-compose.yml` exists in the repository root
- **THEN** the system includes `{profile}` in the discovered profiles list

#### Scenario: Duplicate profile from both sources is deduplicated
- **WHEN** the same profile exists in both the config directory and the repository root
- **THEN** the system returns the profile name only once

### Requirement: Legacy apps.json provides application definitions

The system SHALL read application definitions from `~/.config/devenv/apps.json` when no split definition files exist, supporting both the object format (`{"apps":[...]}`) and the legacy plain-array format (`[...]`).

**Reason**: Eliminating backward compatibility with the monolithic configuration format. All app, library, and infrastructure service definitions must now be individual files under their respective `definitions/` directories.

**Migration**: Split a single `apps.json` into individual files:
- Each app → `~/.config/devenv/apps/definitions/{ident}.json`
- Each library → `~/.config/devenv/libraries/definitions/{ident}.json`  
- Each infra service → `~/.config/devenv/infrastructure/definitions/{ident}.json`

#### Scenario: New format apps.json loads correctly
- **WHEN** `apps.json` exists with `{"apps":[...], "infraServices":[...]}` format
- **THEN** the system loads apps and infra services from it

#### Scenario: Legacy plain-array format loads correctly
- **WHEN** `apps.json` exists as a plain array `[...]`
- **THEN** the system parses it as a list of apps

#### Scenario: Split files take priority over apps.json
- **WHEN** both split definition files and `apps.json` exist
- **THEN** the system loads from split files and ignores `apps.json`

### Requirement: Legacy infra-services.json provides infrastructure services

The system SHALL read infrastructure service definitions from `~/.config/devenv/infra-services.json` as a fallback when no split infrastructure definition files exist.

**Reason**: All infrastructure services must now be defined as individual files in `~/.config/devenv/infrastructure/definitions/`.

**Migration**: Move infra service definitions from `infra-services.json` to individual files.

#### Scenario: Infra-services.json loads correctly
- **WHEN** `infra-services.json` exists and no split infra definition files exist
- **THEN** the system loads infra services from it

### Requirement: Legacy runtime fields are migrated from config JSON to SQLite

The system SHALL detect legacy runtime fields (`branch`, `activeWorktree`, `mainWorktreeBranch`) in per-app JSON config files and perform a one-time migration into the SQLite state database.

**Reason**: Runtime state has been stored in SQLite for long enough that this migration path is no longer needed. These fields were never formally part of the config schema.

**Migration**: No user action required. This was a code-level migration that has already served its purpose.

#### Scenario: Legacy runtime fields are seeded into SQLite
- **WHEN** a per-app JSON config file contains `branch`, `activeWorktree`, or `mainWorktreeBranch` fields
- **AND** no existing SQLite state exists for that app
- **THEN** the system seeds the SQLite state with the legacy values

#### Scenario: SQLite state is not overwritten by stale JSON values
- **WHEN** SQLite already has runtime state for an app
- **AND** the JSON config file also contains older runtime fields
- **THEN** the SQLite values are preserved (not overwritten)
