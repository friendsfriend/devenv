## ADDED Requirements

### Requirement: Use recorded run target information for stop routing
The system SHALL use recorded app run target information to route stop operations to the active run target when a stop request does not explicitly provide a target id.

#### Scenario: Stop uses recorded target id
- **WHEN** an app has recorded run target information with a target id
- **AND** the user stops the app without an explicit target id
- **THEN** the backend SHALL resolve and stop the recorded target id

#### Scenario: Stop uses persisted target after restart
- **WHEN** an app has recorded Docker run target information
- **AND** the server restarts before the app is stopped through DevEnv
- **AND** the user stops the app
- **THEN** the backend SHALL use the persisted run target information to stop the same Docker run target

#### Scenario: Successful stop clears recorded target
- **WHEN** the backend stops an app using recorded run target information
- **THEN** the system SHALL clear recorded run target information for that app after stop succeeds
