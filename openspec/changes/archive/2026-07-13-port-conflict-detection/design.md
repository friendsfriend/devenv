## Context

Docker Compose port mapping is declared in compose files (e.g., `ports: ["3000:3000"]`). When `docker compose up` runs and a port is already bound by another container, Docker fails with a bind error. The port information is available before starting — we can query all running containers' port bindings and compare against the requested ports.

`docker inspect --format '{{range $p, $conf := .NetworkSettings.Ports}}{{$p}} -> {{(index $conf 0).HostPort}}{{end}}'` gives us all bound ports per container.

## Goals / Non-Goals

**Goals:**
- Detect port conflicts before starting an app
- Report which ports conflict and which containers use them
- Show as warning notification (not blocking error) — user may want to stop the conflicting app first

**Non-Goals:**
- Automatically stopping conflicting containers
- Port reassignment or random port selection
- Checking host-level port usage (only Docker container ports)

## Decisions

### 1. Pre-start check via Docker API

Query all running containers for their port bindings, then compare against the compose file's declared ports. Run this check in the server before `docker compose up`.

**Alternative considered:** Let Docker fail and parse the error. Rejected because Docker's error message is cryptic and doesn't identify the conflicting container.

### 2. Warning notification, not blocking error

Show port conflicts as `uiStore.setNotification("Port 5432 in use by postgres", "warning")`. Don't block the start — the user may decide to proceed anyway (e.g., if they know the conflict is temporary).

### 3. Parse ports from compose file

Extract host port bindings from the compose file's `ports` section before starting. This is simpler than parsing Docker's internal port format.

## Risks / Trade-offs

- **[Risk] Race condition: container starts between check and compose up** → Acceptable; rare edge case
- **[Trade-off] Only checks Docker ports, not host-level** → Acceptable; Docker is the primary port binding mechanism
