# provider-health-validation Specification

## Purpose
TBD - created by archiving change provider-health-check. Update Purpose after archive.
## Requirements
### Requirement: Validate provider credentials via API
The system SHALL validate provider credentials by making an authenticated API call to the git platform.

#### Scenario: Valid GitHub token
- **WHEN** the system validates a GitHub provider with a valid token
- **THEN** it SHALL call `GET /user` with `Authorization: Bearer <token>`
- **THEN** the result SHALL be `valid: true`

#### Scenario: Invalid GitHub token
- **WHEN** the system validates a GitHub provider with an expired or revoked token
- **THEN** the API call SHALL return 401
- **THEN** the result SHALL be `valid: false` with error message

#### Scenario: Valid GitLab token
- **WHEN** the system validates a GitLab provider with a valid token
- **THEN** it SHALL call `GET /api/v4/user` with `PRIVATE-TOKEN: <token>`
- **THEN** the result SHALL be `valid: true`

#### Scenario: Invalid GitLab token
- **WHEN** the system validates a GitLab provider with an invalid token
- **THEN** the result SHALL be `valid: false`

#### Scenario: Provider without credentials
- **WHEN** the system validates a public provider (no token configured)
- **THEN** the validation SHALL return `valid: true` (public access is always valid)

### Requirement: Expose validation endpoint
The server SHALL provide an endpoint to validate a specific provider.

#### Scenario: POST /api/providers/{name}/validate
- **WHEN** the client calls `POST /api/providers/my-github/validate`
- **THEN** the server SHALL validate the provider's credentials
- **THEN** the response SHALL be `{ valid: boolean, error?: string }`

#### Scenario: Unknown provider
- **WHEN** the client calls validate for a non-existent provider
- **THEN** the server SHALL return 404

### Requirement: Display validation status in providers view
The TUI providers view SHALL show the health status of each provider.

#### Scenario: Valid provider indicator
- **WHEN** a provider has been validated and is valid
- **THEN** its row SHALL show a ✅ indicator

#### Scenario: Invalid provider indicator
- **WHEN** a provider has been validated and is invalid
- **THEN** its row SHALL show a ❌ indicator
- **THEN** the error message SHALL be visible

#### Scenario: Unchecked provider indicator
- **WHEN** a provider has not been validated yet
- **THEN** its row SHALL show a ⏳ or neutral indicator

### Requirement: Manual validation via keybind
The user SHALL be able to trigger validation for the selected provider.

#### Scenario: Validate selected provider
- **WHEN** the user presses `v` in the providers view
- **THEN** the selected provider's status SHALL change to "checking" (⏳)
- **THEN** after validation completes, the status SHALL update to valid/invalid

#### Scenario: Validation in progress indicator
- **WHEN** validation is in progress for a provider
- **THEN** the provider row SHALL show a spinner or ⏳ indicator
- **THEN** the `v` keybind SHALL be disabled during validation

### Requirement: Startup validation of all providers
The system SHALL validate all providers at TUI startup and warn on failures.

#### Scenario: Startup validation succeeds
- **WHEN** all providers have valid credentials
- **THEN** NO notification SHALL be shown

#### Scenario: Startup validation finds invalid provider
- **WHEN** a provider has invalid credentials at startup
- **THEN** a warning notification SHALL list the invalid provider(s)
- **THEN** the TUI SHALL NOT be blocked from loading

#### Scenario: Startup validation for public provider
- **WHEN** a provider has no credentials (public)
- **THEN** it SHALL be marked as valid without an API call

