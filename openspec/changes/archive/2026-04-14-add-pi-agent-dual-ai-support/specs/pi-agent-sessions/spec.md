## ADDED Requirements

### Requirement: GET /api/pi-sessions endpoint
The Go server SHALL expose a `GET /api/pi-sessions` endpoint that returns pi agent sessions in the same `{ "agents": AgentGroup[] }` JSON shape as `/api/agent-sessions`. Each `AgentGroup.name` is the pi agent name; each `AgentSessionInfo` has `id`, `title`, `timeCreated`, and `timeUpdated`.

#### Scenario: Pi sessions returned when pi is available
- **WHEN** `pi session list --json` exits successfully
- **THEN** the endpoint returns HTTP 200 with a valid `{ agents: [...] }` body

#### Scenario: Empty list when pi is not installed
- **WHEN** `pi` is not found in PATH
- **THEN** the endpoint returns HTTP 200 with `{ "agents": [] }`

#### Scenario: Empty list when pi has no sessions
- **WHEN** `pi session list --json` returns an empty array or empty output
- **THEN** the endpoint returns HTTP 200 with `{ "agents": [] }`

### Requirement: Client method getPiSessions in agent-client.ts
The `@icon-tui/core` agent client SHALL expose a `getPiSessions(): Promise<AgentGroup[]>` function that calls `GET /api/pi-sessions` and returns the parsed result.

#### Scenario: Client returns parsed session groups
- **WHEN** the server returns a valid session list
- **THEN** `getPiSessions()` resolves with the corresponding `AgentGroup[]`

#### Scenario: Client returns empty array on network error
- **WHEN** the server returns a non-2xx response
- **THEN** `getPiSessions()` propagates the error (caller logs a warning and falls back to `[]`)

### Requirement: Pi sessions displayed in AgentSpaceView
The `AgentSpaceView` SHALL display pi sessions in a separate labelled section below the opencode sessions, with the section header "— pi sessions —". Each pi session row SHALL be rendered identically to opencode session rows (title, relative time).

#### Scenario: Pi sessions appear under their own header
- **WHEN** `piAgentGroups` prop is non-empty
- **THEN** a "— pi sessions —" separator row is rendered above the pi session rows

#### Scenario: No pi section when pi sessions list is empty
- **WHEN** `piAgentGroups` prop is an empty array
- **THEN** no pi section separator or rows are rendered

### Requirement: Pi sessions fetched on agent view open
The `openAgentView` action SHALL also call `client.getPiSessions()` and store the result in a new `piAgentGroups` signal in `agent-store.ts`.

#### Scenario: Pi sessions loaded on agent view open
- **WHEN** the user opens the agent view
- **THEN** `getPiSessions()` is called concurrently with `getAgentSessions()` and the result is stored in `piAgentGroups`

#### Scenario: Pi fetch failure does not block agent view
- **WHEN** `getPiSessions()` throws
- **THEN** a warning is logged, `piAgentGroups` is set to `[]`, and the view still renders

### Requirement: launchPi action launches pi interactively
The `agent-actions.ts` SHALL expose a `launchPi(sessionId: string | null)` function that suspends the TUI renderer, executes `pi <projectRoot> [--session <sessionId>]` via `spawnSync`, then resumes the renderer and refreshes both opencode and pi session lists.

#### Scenario: New pi session launched without session ID
- **WHEN** `launchPi(null)` is called
- **THEN** the renderer is suspended, `pi <projectRoot>` is executed, then the renderer resumes

#### Scenario: Existing pi session resumed with session ID
- **WHEN** `launchPi("abc123")` is called
- **THEN** the renderer is suspended, `pi <projectRoot> --session abc123` is executed, then the renderer resumes

#### Scenario: Sessions refreshed after pi exits
- **WHEN** the `pi` subprocess exits (any exit code)
- **THEN** both `getAgentSessions()` and `getPiSessions()` are called to refresh the session lists

### Requirement: Enter key in AgentSpaceView launches correct tool
The keyboard handler for the agent view SHALL detect whether the selected row is an opencode session/agent or a pi session, and call `launchOpencode` or `launchPi` accordingly.

#### Scenario: Enter on opencode session launches opencode
- **WHEN** the selected row is an opencode session and the user presses Enter
- **THEN** `launchOpencode(null, session.id)` is called

#### Scenario: Enter on pi session launches pi
- **WHEN** the selected row is a pi session and the user presses Enter
- **THEN** `launchPi(session.id)` is called
