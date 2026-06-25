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

The status log (`status.log`) records all operations with structured entries:

```
2026-06-24T10:30:00Z [INFO] Starting container: my-service
2026-06-24T10:30:05Z [INFO] Container started: my-service (port 3000)
2026-06-24T10:30:10Z [ERROR] Container crashed: my-service (exit code 1)
```

Each entry includes a timestamp, severity level, and descriptive message.

## 3. Per-app logs

Each app, library, and infrastructure service has its own log file:

```
~/devenv/logs/APP_IDENT.log
```

These logs contain command output from Docker operations (build, test, start, stop), git operations (clone, pull, push), and script execution.

## 4. Server log location

The Go server also logs to the status log. When running in server mode, you can follow server logs at:

```bash
tail -f ~/devenv/logs/status.log
```

## 5. Viewing logs in the TUI

- Press `l` to view container logs for the selected app
- Press `o` to view operation logs for the selected app
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
