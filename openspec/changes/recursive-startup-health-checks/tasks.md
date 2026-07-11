## 1. Dependency-aware execution

- [x] 1.1 Resolve dependency-first ordered action steps
- [x] 1.2 Add `WaitForHealthy(ctx, containerName, timeout)` Docker polling
- [x] 1.3 Poll health every 2 seconds; fallback to `State.Running`
- [x] 1.4 Make readiness timeout configurable, default 60 seconds
- [x] 1.5 Abort dependent steps on unhealthy/timeout failure
- [x] 1.6 Skip already-running healthy dependencies

## 2. Action-run protocol

- [x] 2.1 Define shared action-run and step types
- [x] 2.2 Define SSE event payloads for action and step lifecycle
- [x] 2.3 Emit action.started with ordered step metadata
- [x] 2.4 Emit step started/completed/failed events
- [x] 2.5 Stream stdout/stderr chunks with run and step IDs

## 3. Server integration

- [x] 3.1 Associate executed commands with action steps
- [x] 3.2 Preserve per-step output while command runs
- [x] 3.3 Emit final action status on success/failure
- [x] 3.4 Keep existing operation status and status-log events compatible

## 4. TUI action store

- [x] 4.1 Add action-run signal/store
- [x] 4.2 Handle action lifecycle SSE events
- [x] 4.3 Append live output to correct step
- [x] 4.4 Track focused step and manual-focus flag
- [x] 4.5 Auto-focus latest started step before manual navigation
- [x] 4.6 Auto-focus failed step before manual navigation

## 5. Actions screen

- [x] 5.1 Open actions screen when action triggers
- [x] 5.2 Render ordered step overview
- [x] 5.3 Render shared loading indicator for active step
- [x] 5.4 Render command and live output log pane
- [x] 5.5 Switch log pane when focused step changes
- [x] 5.6 Render completed and failed states with error details
- [x] 5.7 Use app view stack and standard keymap navigation

## 6. Tests

- [x] 6.1 Test action screen opens on trigger
- [x] 6.2 Test lifecycle event handling and live output
- [x] 6.3 Test per-step log switching
- [x] 6.4 Test automatic focus behavior
- [x] 6.5 Test manual focus disables automatic focus
- [x] 6.6 Test failed-step focus and final action status

## 7. Multi-command dependency action modal correction

- [x] 7.1 Replace single-command step model with per-step command executions
- [x] 7.2 Build dependency-first step metadata for start actions
- [x] 7.3 Pass run/step/command context explicitly through command execution
- [x] 7.4 Stream stdout and stderr into selected step command
- [x] 7.5 Apply action execution model to start, stop, build, and test
- [x] 7.6 Render shared two-panel modal with step status and scrollable command log
- [x] 7.7 Add Shift+J/Shift+K panel focus and focused-panel navigation
- [x] 7.8 Test plans, command retention, streaming, panel focus, and scrolling
