## ADDED Requirements

### Requirement: Detect missing env variables during substitution
The system SHALL track which `${VAR}` placeholders could not be resolved during substitution and return them alongside the substituted result.

#### Scenario: All variables resolved
- **WHEN** `SubstituteVarsWithWarnings("db=${DB_HOST}", {"DB_HOST": "localhost"})` is called
- **THEN** the returned string SHALL be `db=localhost`
- **THEN** the warnings list SHALL be empty

#### Scenario: Missing variable detected
- **WHEN** `SubstituteVarsWithWarnings("db=${DB_HOST}:${DB_PORT}", {"DB_HOST": "localhost"})` is called
- **THEN** the returned string SHALL be `db=localhost:${DB_PORT}`
- **THEN** the warnings list SHALL contain `["DB_PORT"]`

#### Scenario: Multiple missing variables
- **WHEN** `SubstituteVarsWithWarnings("${A}-${B}-${C}", {"B": "val"})` is called
- **THEN** the warnings list SHALL contain `["A", "C"]`

#### Scenario: Empty placeholder name is ignored
- **WHEN** `SubstituteVarsWithWarnings("test-${}-end", {})` is called
- **THEN** the warnings list SHALL be empty (malformed placeholder not treated as missing var)

### Requirement: Surface missing vars in provider loading
The system SHALL check for missing env variables when loading provider JSON files and report them.

#### Scenario: Provider with missing credentials
- **WHEN** a provider JSON file uses `${DEVENV_PROVIDER_TOKEN}` and the variable is not in `.env`
- **THEN** the provider SHALL still load (not blocked)
- **THEN** the missing variable name SHALL be included in the provider status response

#### Scenario: Provider with all vars resolved
- **WHEN** a provider JSON file uses `${DEVENV_PROVIDER_TOKEN}` and the variable exists in `.env`
- **THEN** the provider SHALL load normally with no warnings

### Requirement: Surface missing vars on app start
The system SHALL check for missing env variables when starting an app and include them in the response.

#### Scenario: Start app with missing compose env vars
- **WHEN** the user starts an app whose compose file references `${MISSING_VAR}` and the variable is not in `.env`
- **THEN** the start response SHALL include `missingEnvVars: ["MISSING_VAR"]`
- **THEN** the app start SHALL NOT be blocked

#### Scenario: Start app with all vars resolved
- **WHEN** the user starts an app and all env vars are resolved
- **THEN** the start response SHALL NOT include `missingEnvVars`

### Requirement: TUI warning notification for missing vars
The TUI SHALL display a warning notification when missing env variables are detected.

#### Scenario: Warning on app start
- **WHEN** the app start response includes `missingEnvVars: ["FOO", "BAR"]`
- **THEN** the TUI SHALL show a warning notification: "Missing env vars: FOO, BAR"
- **THEN** the notification SHALL use the `warning` type and auto-dismiss after 3 seconds

#### Scenario: Warning on provider load
- **WHEN** a provider loads with missing env variables
- **THEN** the TUI SHALL show a warning notification listing the missing vars for that provider
- **THEN** the notification SHALL use the `warning` type

#### Scenario: No notification when all vars present
- **WHEN** all env vars are resolved
- **THEN** NO notification SHALL be shown
