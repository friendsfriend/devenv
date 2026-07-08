## ADDED Requirements

### Requirement: Panel focus cycling via Shift+J/K
Panel-based detail views SHALL support cycling focus between content panels using Shift+J (next panel) and Shift+K (previous panel).

#### Scenario: Shift+J advances focus to next panel
- **WHEN** a panel-based view is displayed with N panels
- **WHEN** panel index P is currently focused (0 ≤ P < N)
- **WHEN** user presses Shift+J
- **THEN** focus SHALL move to panel P+1
- **THEN** IF P+1 >= N, focus SHALL wrap to panel 0

#### Scenario: Shift+K moves focus to previous panel
- **WHEN** a panel-based view is displayed with N panels
- **WHEN** panel index P is currently focused (0 ≤ P < N)
- **WHEN** user presses Shift+K
- **THEN** focus SHALL move to panel P-1
- **THEN** IF P-1 < 0, focus SHALL wrap to panel N-1

#### Scenario: No panels
- **WHEN** a view has exactly 1 panel (or zero)
- **WHEN** user presses Shift+J or Shift+K
- **THEN** no focus change SHALL occur

### Requirement: Visual focus indicator for active panel
The active panel SHALL be visually distinguishable from inactive panels.

#### Scenario: Active panel has distinct header
- **WHEN** a panel becomes focused
- **THEN** its header bar color SHALL change to indicate focus (e.g., brightened or themed accent color)
- **THEN** inactive panels SHALL use the standard muted header appearance

#### Scenario: Initial focus on first panel
- **WHEN** a panel-based view is first displayed
- **THEN** focus SHALL default to the first panel (index 0)
- **THEN** the first panel SHALL show the focus indicator

### Requirement: Scroll delegation to focused panel
When a panel with scrollable content is focused, standard navigation keys (j/k, u/d, g/G) SHALL scroll that panel's content rather than any other panel.

#### Scenario: j/k scrolls focused panel
- **WHEN** panel P is focused
- **WHEN** panel P has scrollable content
- **WHEN** user presses j or down arrow
- **THEN** panel P's content SHALL scroll down by one line
- **THEN** no other panel SHALL scroll

#### Scenario: Focus panel without scrollable content
- **WHEN** panel P is focused
- **WHEN** panel P has no scrollable content (fixed-height summary)
- **WHEN** user presses j/k
- **THEN** the key press SHALL be ignored or fall through

### Requirement: Panel cycle order in ChangeRequestDetailView
The ChangeRequestDetailView SHALL support focus cycling in the following panel order.

#### Scenario: CR detail panel cycle order
- **WHEN** the ChangeRequestDetailView is displayed
- **THEN** focusable panels SHALL be: Metadata, Status, Changed Files, Pipeline Jobs, Linked Issues, Discussions, Test Results
- **THEN** Shift+J SHALL advance through this order
- **THEN** Shift+K SHALL reverse through this order

### Requirement: Panel cycle order in IssueDetailView
The IssueDetailView SHALL support focus cycling in the following panel order.

#### Scenario: Issue detail panel cycle order
- **WHEN** the IssueDetailView is displayed
- **THEN** focusable panels SHALL be: Metadata/Description, Comments (if any)
- **THEN** Shift+J/K SHALL cycle through these panels

### Requirement: Panel cycle order in AppDetailView
The AppDetailView SHALL support focus cycling in the following panel order.

#### Scenario: App detail panel cycle order
- **WHEN** the AppDetailView is displayed
- **THEN** focusable panels SHALL be: Overview/Properties, Dependency Tree, Recent Logs, Change Requests
- **THEN** Shift+J/K SHALL cycle through these panels

### Requirement: Panel cycle order in Kubernetes cluster view
The Kubernetes cluster view (inside the table's Kubernetes tab) SHALL support focus cycling in the following panel order.

#### Scenario: Kubernetes panel cycle order
- **WHEN** the Kubernetes tab is active in the table view
- **THEN** focusable panels SHALL be: Cluster Info, Resources, Nodes, Workloads
- **THEN** Shift+J/K SHALL cycle through these panels
- **THEN** Tab SHALL continue to switch outer tabs (unchanged behavior)
