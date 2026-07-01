## Context

DevEnv infrastructure lifecycle is Docker Compose centric today. Native apps can be launched through configured run targets, and tmux-backed app runs already capture window identity for stop operations. Script infrastructure needs similar lifecycle tracking but represents services, not app run profiles, and first release is manual only because app-to-infrastructure dependency relationships are not modeled outside Docker Compose.

## Goals / Non-Goals

**Goals:**
- Define script-backed infrastructure services with shell and/or PowerShell runners.
- Let users manually start and stop script services from TUI.
- Run services in tmux window when possible and capture window identity for status/stop.
- Fall back to log-only execution when tmux window is unavailable.
- Show script infrastructure and running app state in TUI status displays.

**Non-Goals:**
- Automatic dependency resolution between native app run targets and infrastructure services.
- Replacing Docker Compose infrastructure support.
- Health-check protocol beyond process/window/log state.
- Cross-host orchestration or daemonization outside DevEnv lifecycle.

## Decisions

1. **Represent script services as first-class infrastructure service type.**
   - Store type, display name, working directory, runner script paths, selected runner, args/env, lifecycle state, and execution handle.
   - Rationale: avoids overloading Docker Compose service models and keeps status logic explicit.
   - Alternative considered: convert scripts into generated compose services. Rejected because native scripts may need host tools, interactive logs, or PowerShell.

2. **Use explicit runner choice when both shell and PowerShell exist.**
   - Service config can provide shell, PowerShell, or both. If both exist and no default is configured, TUI prompts user before first manual start.
   - Rationale: same service may have platform-specific scripts; implicit priority is surprising.
   - Alternative considered: prefer shell on Unix and PowerShell on Windows. Rejected because user specifically requested selection when both are available.

3. **Use tmux window for primary execution, log-only fallback otherwise.**
   - When DevEnv runs in usable tmux, spawn infrastructure script in named window and capture window id. If tmux unavailable, run detached child process with stdout/stderr appended to service log.
   - Rationale: tmux windows match existing app run integrations; fallback preserves manual service execution outside tmux.
   - Alternative considered: tmux split. Rejected because infrastructure should match existing app tmux integrations and keep long-running services in separate windows.

4. **Status source is lifecycle registry plus process verification.**
   - Running status is derived from captured tmux window/process handle. Exited scripts become stopped/failed with exit code where available. Apps use same status display pattern for active run targets.
   - Rationale: consistent TUI state for Docker, scripts, and apps without inventing health checks.

## Risks / Trade-offs

- **Long-running scripts may fork and exit early** → Status reflects wrapper process, not child daemon; document that service scripts should stay attached or provide future health checks.
- **Fallback process stop may not kill full process tree on all platforms** → Use process group where supported and surface best-effort stop result.
- **PowerShell availability differs by OS (`pwsh` vs `powershell`)** → Resolve executable explicitly and show clear missing-runtime error.
- **Tmux window lifecycle can be changed by user outside DevEnv** → Poll/verify window existence before reporting running and mark stopped when window disappears.

## Migration Plan

- Add new service type without changing existing Docker Compose config behavior.
- Existing infrastructure definitions continue to load as Docker services.
- Rollback removes script service definitions/state; Docker lifecycle unaffected.

## Open Questions

- Exact configuration file shape should follow existing infrastructure config conventions during implementation.
- Whether log-only fallback should be opt-in or automatic can be finalized during implementation based on current execution helpers.
