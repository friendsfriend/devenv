### Requirement: Backend field in analyze-logs-stream request
The `POST /api/ai/analyze-logs-stream` endpoint SHALL accept an optional `backend` field in its JSON request body with valid values `"opencode"` and `"pi"`. When absent or set to `"opencode"`, existing behaviour is unchanged. When set to `"pi"`, the server SHALL route the request through the pi subprocess path.

#### Scenario: Request without backend field uses opencode
- **WHEN** a client posts `{ "logs": "...", "prompt": "..." }` with no `backend` field
- **THEN** the server routes through `ensureOpencodeServer` as before

#### Scenario: Request with backend=pi uses pi path
- **WHEN** a client posts `{ "logs": "...", "prompt": "...", "backend": "pi" }`
- **THEN** the server spawns `pi` as a subprocess with the prompt and log content

### Requirement: Pi subprocess execution for log analysis
The server SHALL spawn `pi` as a subprocess, pass the concatenated prompt and log text, collect stdout, and return it as a single SSE `delta` event followed by a `done` event. The subprocess MUST be killed when the HTTP request context is cancelled.

#### Scenario: Successful pi analysis returns single delta + done
- **WHEN** `pi` exits with status 0 and produces output on stdout
- **THEN** the server emits `data: {"delta": "<output>"}` then `data: {"done": true}` and closes the stream

#### Scenario: Pi not in PATH returns 503
- **WHEN** `pi` is not found in `PATH`
- **THEN** the server returns HTTP 503 with body `{"error": "pi not found in PATH"}`

#### Scenario: Pi exits non-zero returns error event
- **WHEN** `pi` exits with a non-zero status code
- **THEN** the server emits `data: {"error": "<stderr text>"}` and closes the stream

#### Scenario: Request timeout kills pi subprocess
- **WHEN** `pi` has not completed within 90 seconds
- **THEN** the subprocess is killed and the server emits `data: {"error": "timeout"}` and closes the stream

### Requirement: Log size cap applied to pi path
The server SHALL truncate logs to the most recent 100 KB before passing them to `pi`, identical to the opencode path.

#### Scenario: Large logs are truncated
- **WHEN** the `logs` field exceeds 100 KB
- **THEN** only the last 100 KB is passed to `pi`, with a truncation note appended to the prompt

### Requirement: TUI client forwards backend parameter
The `analyzeLogsWithAIStream` function in `logs-client.ts` SHALL accept an optional `backend?: 'opencode' | 'pi'` parameter and include it in the JSON request body when provided.

#### Scenario: Client sends backend field when specified
- **WHEN** `analyzeLogsWithAIStream` is called with `backend: 'pi'`
- **THEN** the POST body includes `"backend": "pi"`

#### Scenario: Client omits backend field when not specified
- **WHEN** `analyzeLogsWithAIStream` is called without a `backend` argument
- **THEN** the POST body does not include a `backend` field

### Requirement: Log store tracks selected backend for active analysis
The `log-store.ts` SHALL expose a `logAiBackend` signal of type `'opencode' | 'pi'` (default `'opencode'`). This signal is set when the AI backend picker confirms a selection for the `'log-analysis'` context, and is passed as the `backend` argument to `analyzeLogsWithAIStream` by `runAiAnalysis`. It is reset to `'opencode'` by `clearAiState`.

#### Scenario: Backend is set when picker confirms pi for log analysis
- **WHEN** the picker confirms `pi` in `'log-analysis'` context
- **THEN** `logAiBackend` is set to `'pi'` before analysis begins

#### Scenario: Backend resets to opencode on clearAiState
- **WHEN** `clearAiState` is called
- **THEN** `logAiBackend` is set to `'opencode'`

#### Scenario: Analysis uses the stored backend
- **WHEN** `runAiAnalysis` is called and `logAiBackend()` is `'pi'`
- **THEN** `analyzeLogsWithAIStream` is called with `backend: 'pi'`
