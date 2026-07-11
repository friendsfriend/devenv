## Dependency-aware execution

`TargetRegistry.ResolveStartPlan(rootID)` produces dependency-first ordered steps. Executor starts each step, then waits for Docker health before starting next dependent step. Poll `State.Health.Status` every 2 seconds; containers without healthchecks are ready when `State.Running` is true. Default timeout is 60 seconds per step and is configurable. Health failure aborts action and marks step failed.

## Action run model

Each triggered action creates an action run with dependency-first ordered steps. Each step retains every command execution separately:

```text
ActionRun
  id, title, status
  steps[]
    id, label, status, startedAt, finishedAt, error
    commands[]
      id, command, status, stdout, stderr, startedAt, finishedAt, error
```

Start plans label dependency steps as `Start dependency: <name>` and root steps as `Start application: <name>`. Build, test, stop, and run actions use the same command execution model.

Step statuses: `pending`, `active`, `completed`, `failed`.

## Event protocol

Emit structured SSE events:

- `action.started`: run metadata and complete ordered step list
- `action.step.started`: run ID, step ID, command, index
- `action.step.output`: run ID, step ID, output chunk, stream
- `action.step.health`: run ID, step ID, status (`starting`, `healthy`, `failed`)
- `action.step.completed`: run ID, step ID
- `action.step.failed`: run ID, step ID, error
- `action.completed`: run ID, final status

Output chunks append to focused step log and render live.

## TUI behavior

Opening action screen happens on action trigger. Screen uses two panels. Left panel shows dependency-first steps; right panel shows all commands and combined live output retained for focused step. Shift+J/Shift+K switches panel focus. Standard j/k/d/u/g/G navigation applies to focused panel:



```text
┌─ Steps ───────────────┬─ Log: focused step ─────────────┐
│ ✓ Build               │ $ command                       │
│ ⟳ Start backend       │ live stdout/stderr              │
│ ○ Start frontend      │                                 │
└───────────────────────┴─────────────────────────────────┘
```

Focus policy:
- Before manual navigation, focus latest started step.
- Failed step takes focus immediately.
- Any explicit focus movement sets `userMovedFocus`; automatic focus no longer changes selection.
- Selecting step changes log pane to that step's accumulated output.
- Active step uses shared splash/shutdown loading indicator styling.

## Compatibility

Keep existing operation status and status-log events. Action events provide richer data and are ignored by older clients.
