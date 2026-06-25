# Adding Infrastructure Services

Infrastructure services (databases, message queues, caches) are defined as Docker Compose services managed by DevEnv.

## 1. Create the service definition

Create a JSON file at `~/.config/devenv/infrastructure/definitions/IDENT.json`:

```json
{
  "ident": "postgres",
  "displayName": "PostgreSQL",
  "containerBaseName": "postgres"
}
```

- `ident` — unique identifier (required)
- `displayName` — human-readable name shown in the TUI
- `containerBaseName` — Docker container base name for lifecycle management

## 2. Create the Compose file

Place a Docker Compose file at `~/.config/devenv/infrastructure/compose/IDENT.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      - POSTGRES_DB=app
      - POSTGRES_PASSWORD=secret
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
```

Infrastructure services appear in the **Infrastructure** tab of the TUI. They support `s` (start), `S` (stop), `R` (restart), and container logs (`l`).

## 3. Share infra between apps

Multiple apps can depend on the same infra service. In each app's compose file, reference the shared service:

```yaml
services:
  my-service:
    image: my-service:latest
    depends_on:
      - postgres
```

When the infra service is started via the TUI, it becomes available to all apps that depend on it.

## 4. Differences from apps

Infrastructure services do **not** have:
- Git operations (clone, pull, branch switching)
- Build/test workflows
- MR/PR integration
- CI/CD pipeline features

See [Adding an App](adding-apps.md) for full application definitions.
