# Adding an App

This guide walks through defining a new application in DevEnv.

## 1. Create the app definition

Create a JSON file at `~/.config/devenv/apps/definitions/IDENT.json`:

```json
{
  "ident": "my-service",
  "displayName": "My Service",
  "repositoryPath": "https://github.com/org/my-service.git",
  "appType": "APP",
  "containerBaseName": "my-service",
  "sourceType": "github",
  "provider": "my-github",
  "gitMode": "BRANCH"
}
```

Key fields:

- `ident` — unique identifier, becomes the directory name under `$DEVENV_HOME`
- `repositoryPath` — Git remote URL (HTTPS or SSH)
- `appType` — `"APP"` for applications, `"LIB"` for libraries
- `sourceType` — `"github"` or `"gitlab"` for MR/PR features
- `provider` — name of the provider from `providers/` for authenticated API access
- `gitMode` — `"BRANCH"` (default) or `"WORKTREE"` for parallel worktrees

## 2. Create Dockerfiles

Place build and test Dockerfiles at:

- `~/.config/devenv/apps/build/IDENT-build.Dockerfile`
- `~/.config/devenv/apps/build/IDENT-test.Dockerfile`

**Build Dockerfile** produces a runnable image and can extract artifacts. Use `LABEL devenv.artifacts="PATH"` to declare build output:

```dockerfile
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM debian:bookworm-slim
LABEL devenv.artifacts="dist"
WORKDIR /app
COPY --from=build /app/dist ./dist
```

**Test Dockerfile** runs ephemerally — build succeeding = tests pass:

```dockerfile
FROM golang:1.26-bookworm
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go test ./...
```

## 3. Configure Compose

Create a Docker Compose file for running the app:

```
~/.config/devenv/apps/compose/IDENT-compose.yml
```

```yaml
services:
  my-service:
    image: my-service:latest
    ports:
      - "3000:3000"
    env_file:
      - .env
```

For profile variants, use `IDENT-PROFILE-compose.yml` (e.g., `my-service-staging-compose.yml`).

## 4. Add shell action variants

Shell actions live next to Docker resources and can coexist with them:

- `~/.config/devenv/apps/build/IDENT-build.sh` — shell build target
- `~/.config/devenv/apps/build/IDENT-test.sh` — shell test target
- `~/.config/devenv/apps/run/IDENT-PROFILE.sh` — shell run profile

Example run profile:

```sh
#!/usr/bin/env sh
# devenv:name=Dev Server
# devenv:mode=tmux
set -eu
bun run dev
```

Metadata:

- `devenv:name` controls picker label.
- `devenv:mode=tmux` opens run scripts in a new tmux window.
- Build/test shell scripts default to logged execution.
- Run shell scripts default to tmux.

Tmux mode requires the DevEnv server process to run inside tmux. Attach mode connected to a server without `TMUX` will fail clearly instead of launching hidden background processes. Stop/restart target the tracked tmux window id.

## 5. Link to infrastructure

If your app depends on infra services (databases, queues), add `depends_on` in the compose file and reference the infra service name:

```yaml
services:
  my-service:
    depends_on:
      - postgres
```

## 6. Add from the TUI

Alternatively, press `+` in the TUI table view to add an app interactively — select provider, search for a repository, name it, and choose a branch.

See [Adding Infrastructure](adding-infrastructure.md) for shared services and [Adding Libraries](adding-libraries.md) for library definitions.
