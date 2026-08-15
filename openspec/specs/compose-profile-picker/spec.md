# compose-profile-picker Specification

## Purpose
TBD - created by archiving change compose-file-editor-profile-picker. Update Purpose after archive.
## Requirements
### Requirement: Discover compose profiles for an app
The system SHALL scan the compose directory and return all discovered profiles for a given app.

#### Scenario: App with default and profile compose files
- **WHEN** `apps/compose/` contains `frontend-compose.yml` and `frontend-staging-compose.yml`
- **THEN** the API SHALL return profiles: `["default", "staging"]`
- **THEN** each profile SHALL include its file path

#### Scenario: App with only default compose file
- **WHEN** `apps/compose/` contains only `frontend-compose.yml`
- **THEN** the API SHALL return profiles: `["default"]`

#### Scenario: App with no compose files
- **WHEN** no compose files exist for the app
- **THEN** the API SHALL return an empty profiles list

### Requirement: Display compose profile picker modal
The TUI SHALL display a modal listing all discovered profiles for the selected app.

#### Scenario: Profile list rendering
- **WHEN** the user opens the compose profile picker for an app with 3 profiles
- **THEN** the modal SHALL list all profiles with `j`/`k` navigation
- **THEN** each profile SHALL show its name and file path

#### Scenario: Select profile opens editor
- **WHEN** the user selects a profile and presses `Enter`
- **THEN** the compose file for that profile SHALL open in the user's configured editor
- **THEN** the profile picker modal SHALL close

#### Scenario: Create new profile option
- **WHEN** the user presses `n` in the profile picker
- **THEN** a text input modal SHALL appear prompting for the new profile name

#### Scenario: New profile creation
- **WHEN** the user enters a valid profile name (alphanumeric + hyphens) and confirms
- **THEN** a new compose file SHALL be created at `{configDir}/apps/compose/{appIdent}-{name}-compose.yml`
- **THEN** the file SHALL contain a minimal template with services placeholder
- **THEN** the file SHALL open in the user's editor

#### Scenario: Invalid profile name rejected
- **WHEN** the user enters a name with spaces or special characters
- **THEN** the modal SHALL show an error: "Profile name must contain only letters, numbers, and hyphens"

### Requirement: Keyboard shortcut for compose profile picker
The system SHALL provide a keyboard shortcut to open the compose profile picker.

#### Scenario: Open from table view
- **WHEN** the user presses `E` while an app is selected in the table view
- **THEN** the compose profile picker SHALL open for that app

#### Scenario: Open from app detail view
- **WHEN** the user presses `E` while viewing app detail
- **THEN** the compose profile picker SHALL open for that app

#### Scenario: Escape closes picker
- **WHEN** the user presses `Escape` in the profile picker
- **THEN** the modal SHALL close without action

### Requirement: Server-side profile discovery API
The server SHALL expose an endpoint to discover compose profiles for an app.

#### Scenario: GET /api/apps/{ident}/compose-profiles
- **WHEN** the client requests compose profiles for app `frontend`
- **THEN** the server SHALL scan `{configDir}/apps/compose/` for files matching `frontend-*-compose.yml` and `frontend-compose.yml`
- **THEN** the response SHALL be `{ profiles: [{ name: "default", path: "...", fileName: "..." }, ...] }`

#### Scenario: Unknown app ident
- **WHEN** the client requests profiles for a non-existent app
- **THEN** the server SHALL return `{ profiles: [] }` (not an error)

