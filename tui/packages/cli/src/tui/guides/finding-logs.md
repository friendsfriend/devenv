# Finding Logs

DevEnv stores logs in structured files under the home directory.

## 1. Log directory structure

All logs live under `$DEVENV_HOME/logs/` (default `~/devenv/logs/`):

```
~/devenv/logs/
├── status.log              # Operation status log (structured)
├── my-service.log          # Per-app command output logs
├── postgres.log            # Per-infra service logs
└── shared-lib.log          # Per-library operation logs
```

## 2. Status log format

The status log (`status.log`) records structured operation state changes. It is optimized for quick status history, not full command output.

```
2026-07-01 07:20:09|my-service|my-service|build|completed|building image...
2026-07-01 07:20:09|my-service|my-service|build|failed|Error: exit status 125
```

Each entry includes timestamp, app ident, app name, operation, status, and message.

## 3. Per-app logs

Each app, library, and infrastructure service has its own log file:

```
~/devenv/logs/APP_IDENT.log
```

These logs contain command input and full stdout/stderr from Docker/Podman operations (build, test, start, stop), git operations (clone, pull, push), and script execution.

Each command block includes:

- full quoted command line
- working directory
- environment overrides
- full output
- final exit status

## 4. Server log location

The Go server also logs to the status log. When running in server mode, you can follow server logs at:

```bash
tail -f ~/devenv/logs/status.log
```

## 5. Viewing logs in the TUI

- Press `l` to view container logs for the selected item
- Press `o` to view operation logs for the selected item
- Press `L` to toggle the status log maximized view

See [Using the Log Viewer](using-log-viewer.md) for full keyboard shortcuts and features.

## 6. Opening logs in your editor

Press `e` while in the log viewer to open the current log file in `$EDITOR`.

## 7. Log file locations reference

| Log Type | Location |
|---|---|
| Status/operation log | `~/devenv/logs/status.log` |
| Per-app container logs | `~/devenv/logs/APP_IDENT.log` |
| Server log | `~/devenv/logs/status.log` |
