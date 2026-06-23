## ADDED Requirements

### Requirement: Provider credentials are stored outside provider JSON
The system SHALL persist newly created provider credential values in the DevEnv config `.env` file and SHALL persist provider JSON files with variable references instead of raw username or token values.

#### Scenario: Creating a provider stores placeholders in JSON
- **WHEN** a user creates a provider with a username and token
- **THEN** the provider JSON file SHALL contain variable references for `username` and `token`
- **AND** the provider JSON file SHALL NOT contain the raw username or token values

#### Scenario: Creating a provider writes env entries
- **WHEN** a user creates a provider with a username and token
- **THEN** the DevEnv config `.env` file SHALL contain provider-specific entries for that username and token
- **AND** loading providers SHALL resolve those entries into usable credentials

### Requirement: Existing provider formats remain loadable
The system SHALL continue to load provider files that contain raw credential values and provider files that contain `${VAR}` credential references.

#### Scenario: Loading legacy clear-text provider file
- **WHEN** a provider JSON file contains raw `username` and `token` values
- **THEN** the provider SHALL load with those credentials available for git and API operations

#### Scenario: Loading placeholder provider file
- **WHEN** a provider JSON file contains `${VAR}` references for `username` and `token`
- **AND** the DevEnv config `.env` file defines those variables
- **THEN** the provider SHALL load with resolved credential values available for git and API operations

### Requirement: Provider updates preserve existing credentials unless replaced
The system SHALL preserve an existing provider token when an update request omits or sends an empty token, and SHALL replace the token only when a non-empty replacement token is supplied.

#### Scenario: Editing provider username without token replacement
- **WHEN** a user updates an existing provider and does not provide a replacement token
- **THEN** the existing token SHALL remain usable
- **AND** the provider username SHALL be updated

#### Scenario: Editing provider token
- **WHEN** a user updates an existing provider with a non-empty replacement token
- **THEN** the provider SHALL use the replacement token for future operations
- **AND** the raw replacement token SHALL NOT be written to the provider JSON file

### Requirement: Provider deletion removes provider-owned credentials
The system SHALL remove provider-owned credential entries from the DevEnv config `.env` file when deleting a provider.

#### Scenario: Deleting provider removes env credentials
- **WHEN** a user deletes a provider that was stored with DevEnv-managed credential variables
- **THEN** the provider JSON file SHALL be removed
- **AND** the matching provider credential entries SHALL be removed from the DevEnv config `.env` file

#### Scenario: Deleting provider preserves unrelated env entries
- **WHEN** a user deletes a provider
- **THEN** unrelated entries in the DevEnv config `.env` file SHALL remain unchanged
