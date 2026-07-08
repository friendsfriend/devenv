## ADDED Requirements

### Requirement: Registry includes panel focus navigation keybinds
The keybind registry SHALL include entries for panel focus cycling with Shift+J/K for each panel-based view context.

#### Scenario: Panel focus entries exist for changeRequestDetail
- **WHEN** the registry is built
- **THEN** it SHALL include a entry for Shift+J/K with context "changeRequestDetail"
- **THEN** the description SHALL mention cycling focus through CR detail panels
- **THEN** the footer description SHALL be short enough to fit in the status bar

#### Scenario: Panel focus entries exist for issueDetail
- **WHEN** the registry is built
- **THEN** it SHALL include a entry for Shift+J/K with context "issueDetail"
- **THEN** the description SHALL mention cycling focus through issue detail panels

#### Scenario: Panel focus entries exist for appDetail
- **WHEN** the registry is built
- **THEN** it SHALL include a entry for Shift+J/K with context "appDetail"
- **THEN** the description SHALL mention cycling focus through app detail panels

#### Scenario: Panel focus entries exist for kubernetes (table context)
- **WHEN** the registry is built
- **THEN** it SHALL include a entry for Shift+J/K with context "table"
- **THEN** the entry SHALL be gated or scoped such that it only applies when the Kubernetes tab is active
- **THEN** the description SHALL mention cycling focus through Kubernetes panels

### Requirement: Registry includes reverse tab cycling keybinds
The keybind registry SHALL include Shift+Tab entries for each tab-based view context that supports reverse cycling.

#### Scenario: Shift+Tab entries exist for table, jobs, and help contexts
- **WHEN** the registry is built
- **THEN** it SHALL include Shift+Tab entries for contexts "table", "jobs", and "help"
- **THEN** each entry SHALL describe cycling tabs/stages in the reverse direction
