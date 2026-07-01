## Why

Infrastructure dependencies are currently limited to Docker Compose services, so projects with local native services or shell/PowerShell setup processes cannot model and operate those services from DevEnv. Script-based infrastructure lets teams run non-Docker infrastructure manually while keeping service state visible in the TUI.

## What Changes

- Add script-based infrastructure service definitions alongside existing Docker services.
- Support shell and PowerShell scripts as infrastructure runners, including explicit selection when both variants exist for one service.
- Run script infrastructure in a separate tmux window when available, with log-only fallback when tmux window execution is unavailable.
- Add manual start/stop/status operations for script infrastructure services as first step; no app-to-infrastructure dependency wiring yet.
- Reflect infrastructure service status in the TUI, including script services and currently running app processes where status is missing.
- Keep Docker Compose dependency handling unchanged.

## Capabilities

### New Capabilities
- `script-infrastructure-services`: Script-backed infrastructure service configuration, execution, manual lifecycle, and TUI status reporting.

### Modified Capabilities
- `tmux-window-spawning`: Tmux execution behavior extends from app run windows to infrastructure service windows with captured identity for lifecycle management.

## Impact

- Affects infrastructure configuration schema, server lifecycle APIs, TUI infrastructure views/actions, app status display, tmux process management, and logging.
- Requires portable script command resolution for shell and PowerShell.
- Introduces service state tracking for script infrastructure separate from Docker Compose state.
