## Context

`TargetRegistry.ResolveStartPlan(rootID)` returns an ordered list of targets to start, with dependencies first. The executor currently starts each target in order but doesn't wait for health between steps. Docker containers have a `Health` field in `docker inspect` that reflects healthcheck status. For containers without healthchecks, we can use "container running" as the health signal.

## Goals / Non-Goals

**Goals:**
- Wait for each dependency to be healthy before starting the next target in the plan
- Support both Docker healthcheck-based health and simple "container running" fallback
- Emit SSE events for dependency startup progress
- Timeout after configurable duration (default 60s) and fail with clear error

**Non-Goals:**
- Application-level health checks (e.g., HTTP endpoint readiness) — Docker healthcheck covers this
- Custom health check scripts
- Retry logic beyond timeout

## Decisions

### 1. Health check polling via Docker inspect

Poll `docker inspect --format '{{.State.Health.Status}}'` every 2 seconds. Possible values: `starting`, `healthy`, `unhealthy`. For containers without healthchecks, check `State.Running`.

**Alternative considered:** Use Docker events stream. Rejected because it adds complexity and latency; polling is simpler and sufficient for startup flow.

### 2. 60-second default timeout per dependency

If a dependency doesn't become healthy within 60 seconds, fail the entire start operation with a clear error identifying the stuck dependency.

**Alternative considered:** No timeout. Rejected because it could hang indefinitely.

### 3. SSE events for progress

Emit `{ type: "dependency.starting", app: "postgres", status: "starting" | "healthy" | "failed" }` events during the startup sequence. TUI renders these in the status column.

## Risks / Trade-offs

- **[Risk] Containers without healthchecks always report "running"** → Acceptable; "running" is the best signal available
- **[Risk] Timeout too short for slow-starting services** → 60s is reasonable for most containers; can be made configurable later
- **[Trade-off] Polling adds 2s latency per check** → Acceptable for startup flow; not a hot path
