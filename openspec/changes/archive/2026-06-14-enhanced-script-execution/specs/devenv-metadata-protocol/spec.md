## ADDED Requirements

### Requirement: Scripts can declare parameters via `--devenv-metadata` flag
The system SHALL support a universal `--devenv-metadata` flag convention that allows scripts of any language to declare their parameter schema. When a script is invoked with `--devenv-metadata`, it SHALL print a JSON array of parameter definitions to stdout and exit with code 0.

#### Scenario: Script supports `--devenv-metadata` and returns valid schema
- **WHEN** the system invokes `./deploy.sh --devenv-metadata`
- **THEN** the system SHALL capture stdout and parse it as a `ScriptParameter[]` JSON array
- **THEN** the system SHALL use the parsed parameters for the script's parameter UI

#### Scenario: Script does not support `--devenv-metadata`
- **WHEN** the system invokes `./script.py --devenv-metadata`
- **THEN** the system SHALL treat the script as having no parameters
- **THEN** the system SHALL run the script without showing the parameter input modal

#### Scenario: `--devenv-metadata` exits with non-zero or times out
- **WHEN** the system invokes `./faulty.sh --devenv-metadata` and it exits with code 1 or exceeds a 3-second timeout
- **THEN** the system SHALL treat the script as having no parameters
- **THEN** the system SHALL NOT show an error to the user (silent fallback)

---

### Requirement: Metadata results are cached and invalidated on file change
The system SHALL cache per-script metadata results to avoid re-running `--devenv-metadata` on every interaction. The cache SHALL be invalidated when the script file's modification time changes.

#### Scenario: Metadata is served from cache on repeated requests
- **WHEN** the user opens the script args modal for the same script twice
- **THEN** the system SHALL invoke `--devenv-metadata` only on the first request
- **THEN** the second request SHALL return the cached metadata without running the script

#### Scenario: Metadata cache is invalidated after script edit
- **WHEN** the user edits a script file (changing its mtime) and then opens the args modal
- **THEN** the system SHALL detect the mtime change and re-run `--devenv-metadata`
- **THEN** the new metadata SHALL replace the cached value

---

### Requirement: Metadata is accessible via a server API endpoint
The system SHALL provide a `GET /api/scripts/metadata` endpoint that returns the parameter schema for a given script path.

#### Scenario: Client requests metadata for a known script
- **WHEN** the client sends `GET /api/scripts/metadata?path=database/init.sh`
- **THEN** the server SHALL return a JSON object with a `parameters` array of `ScriptParameter` objects

#### Scenario: Client requests metadata for a script without `--devenv-metadata` support
- **WHEN** the client sends `GET /api/scripts/metadata?path=simple.sh` and the script does not support `--devenv-metadata`
- **THEN** the server SHALL return `{ "parameters": [] }` with no error

#### Scenario: Client requests metadata for a non-existent script
- **WHEN** the client sends `GET /api/scripts/metadata?path=nonexistent.sh`
- **THEN** the server SHALL return a 404 error
