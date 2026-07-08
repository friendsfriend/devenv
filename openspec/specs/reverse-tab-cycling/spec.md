# reverse-tab-cycling Specification

## Purpose
TBD - created by archiving change add-panel-focus-navigation. Update Purpose after archive.
## Requirements
### Requirement: Shift+Tab cycles tabs in reverse in table view
The main table view SHALL support Shift+Tab to cycle through content tabs (Applications, Infrastructure, Libraries, Tasks, Kubernetes) in reverse order.

#### Scenario: Shift+Tab cycles outer tabs backward
- **WHEN** view mode is "table"
- **WHEN** no filter/sort/search modal is active
- **WHEN** user presses Shift+Tab
- **THEN** the active tab SHALL change to the previous tab in the tab order
- **THEN** IF on the first tab, wrap to the last tab

#### Scenario: Tab still cycles forward
- **WHEN** view mode is "table"
- **WHEN** user presses Tab
- **THEN** the active tab SHALL cycle forward (unchanged behavior)

### Requirement: Shift+Tab cycles stages in reverse in jobs view
The jobs detail view SHALL support Shift+Tab to cycle through pipeline stages in reverse order.

#### Scenario: Shift+Tab cycles stages backward in jobs view
- **WHEN** view mode is "jobs"
- **WHEN** user presses Shift+Tab
- **THEN** the selected stage index SHALL decrease by one
- **THEN** IF on the first stage, wrap to the last stage

### Requirement: Shift+Tab cycles tabs in reverse in help view
The help view SHALL support Shift+Tab to switch between keybindings and guides tabs in reverse order.

#### Scenario: Shift+Tab cycles help tabs backward
- **WHEN** view mode is "help"
- **WHEN** user presses Shift+Tab
- **THEN** the active help tab SHALL toggle to the other tab (keybindings ↔ guides)

### Requirement: Shift+Tab does not interfere with search/filter input
When a text input or search mode is active, Shift+Tab SHALL NOT trigger tab cycling.

#### Scenario: Search mode guards against Shift+Tab
- **WHEN** table search mode is active
- **WHEN** user presses Shift+Tab
- **THEN** Shift+Tab SHALL be ignored for tab cycling
- **THEN** Shift+Tab SHALL NOT be consumed by the tab handler

