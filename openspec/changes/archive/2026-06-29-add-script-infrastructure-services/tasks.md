## 1. Discovery and Data Model

- [x] 1.1 Locate existing Docker infrastructure configuration, lifecycle, API, and TUI status code paths
- [x] 1.2 Add script infrastructure service model with runner type, shell path, PowerShell path, default runner, cwd, args, env, status, log path, and execution handle
- [x] 1.3 Extend infrastructure config loading/validation to accept script services without changing existing Docker service behavior
- [x] 1.4 Add tests for shell-only, PowerShell-only, and dual-runner service config parsing

## 2. Execution and Lifecycle

- [x] 2.1 Add shell and PowerShell runner resolution, including clear errors for missing `sh`/`bash`, `pwsh`, or `powershell`
- [x] 2.2 Implement manual start for script infrastructure services with duplicate-start protection
- [x] 2.3 Implement tmux window spawn for script infrastructure and capture window id
- [x] 2.4 Implement log-only fallback execution with stdout/stderr log capture
- [x] 2.5 Implement stop for tmux window and fallback managed process, using captured handles
- [x] 2.6 Add lifecycle polling/status refresh for running, stopped, and failed states
- [x] 2.7 Add unit/integration tests for start, stop, duplicate start, process exit, and failed exit

## 3. Server API

- [x] 3.1 Extend infrastructure endpoints/services to return Docker and script service status consistently
- [x] 3.2 Add manual start/stop endpoints or actions for script infrastructure services
- [x] 3.3 Ensure search/filter/sort behavior remains server-side before pagination for any infrastructure list endpoint touched
- [x] 3.4 Add API tests for script service lifecycle and status responses

## 4. TUI Integration

- [x] 4.1 Extend infrastructure TUI views/actions to display script services and statuses alongside Docker services
- [x] 4.2 Add runner selection prompt when both shell and PowerShell runners are available and no default is configured
- [x] 4.3 Add log inspection path for script service output, including failed services
- [x] 4.4 Update app run status display so active app run targets show running/stopped state
- [x] 4.5 Confirm list controls remain standard where applicable: `/` search, `F` filter, `O` sort; document exceptions

## 5. Documentation and Validation

- [x] 5.1 Document script infrastructure service configuration and manual lifecycle behavior
- [x] 5.2 Document first-step limitation: no native app-to-infrastructure dependency wiring yet
- [x] 5.3 Update OpenTUI guide only if reusable OpenTUI components are added or changed
- [x] 5.4 Run targeted tests during implementation
- [x] 5.5 Run full test suite before finishing feature
- [x] 5.6 Check pi-lens issues if available before finishing feature
