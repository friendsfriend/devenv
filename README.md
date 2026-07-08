# DevEnv CLI

Hybrid Go backend + TypeScript OpenTUI frontend for managing development environments.

## Architecture

```
devenv-cli/
├── build.ts              # Main build script
├── package.json          # Root package.json
├── server/               # Go backend
│   ├── cmd/              # CLI commands (Cobra)
│   ├── main.go           # Entry point
│   └── pkg/
│       ├── app/           # App/InfraService domain types, split-file loading
│       ├── build/         # Docker build & test service
│       ├── docker/        # Docker client (container ops, events, stats)
│       ├── git/           # Git repository operations
│       ├── github/        # GitHub API client
│       ├── gitlab/        # GitLab API client
│       ├── logging/       # Status log + per-item log writer
│       ├── operations/    # Clone/checkout/run operations + executor
│       ├── provider/      # Git provider credential management
│       ├── resources/     # Home dir, config dir, env file, templates
│       ├── server/        # HTTP API server + handler files + SSE
│       ├── services/      # DI container (wires all services)
│       └── status/        # Operation status manager
├── tui/                  # TypeScript OpenTUI frontend
│   ├── packages/
│   │   ├── cli/          # CLI entry point & TUI application
│   │   │   └── src/tui/  # Stores, actions, keyboard handlers, views
│   │   ├── core/         # API client (DevEnvClient facade + 10 domain modules)
│   │   ├── types/        # Shared TypeScript types
│   │   └── ui/           # UI components (Catppuccin Mocha theme)
│   └── scripts/          # Build scripts
├── dist/                 # Build output
│   └── tui/              # Self-contained TUI binaries (embedded Go server)
└── docs/                 # Documentation
```

The Go backend uses dependency injection via `services.Container` — no global state. The TUI uses SolidJS signal-based stores with factory functions for state management and actions.

## Requirements

- **Bun** 1.3.14+
- **Go** 1.26.4+
- **Docker** or **Podman** (for container management features)
- Optional Kubernetes runtime tools: `kind`, `kubectl`, `helm`, and `k9s` for Helm/kind app runs

## Quick Start

### Development

```bash
# Start server + TUI (spawns both, kills server on exit)
bun run dev
```

### Build

```bash
# Build for current platform only (recommended for development)
bun run build:single

# Release build for all platforms
bun run build
```

**Output:** `dist/tui/devenv-<platform>-<arch>/bin/devenv`

### Guides

Task-focused guides are available from the TUI Help view (`?`) and linked below:

- [Configuration Repository](tui/packages/cli/src/tui/guides/config-repository.md) — Share DevEnv config across machines or with a team
- [Container Runtime](tui/packages/cli/src/tui/guides/container-runtime.md) — Choose Docker or Podman via `DEVENV_CONTAINER_RUNTIME`
- [Kubernetes Runtime](tui/packages/cli/src/tui/guides/kubernetes-runtime.md) — Run Helm app and infrastructure targets on managed kind
- [Choosing a Runtime](tui/packages/cli/src/tui/guides/choosing-runtime.md) — When to use Docker Compose, Kubernetes, shell, or script infrastructure
- [Adding a Repository](tui/packages/cli/src/tui/guides/adding-repositories.md) — Repository definitions, Dockerfiles, Compose config, and infra linking
- [Adding a Task](tui/packages/cli/src/tui/guides/adding-scripts.md) — Task discovery, --devenv-metadata convention, parameter types
- [Adding Infrastructure](tui/packages/cli/src/tui/guides/adding-infrastructure.md) — Infra definitions, Compose placement, sharing between apps
- [Adding Libraries](tui/packages/cli/src/tui/guides/adding-libraries.md) — Library definitions, build and test Dockerfiles
- [Using Worktrees](tui/packages/cli/src/tui/guides/using-worktrees.md) — Single checkout vs worktrees, worktrunk, IDE setup
- [Using AI Features](tui/packages/cli/src/tui/guides/using-ai-features.md) — pi session view, sessions, pi integration
- [Using Git Integrations](tui/packages/cli/src/tui/guides/using-git-integrations.md) — Providers, Change Request browsing, diff, discussions, approvals, AI review, pipelines, test results
- [Using the Log Viewer](tui/packages/cli/src/tui/guides/using-log-viewer.md) — Container logs, operation logs, search, visual mode, keyboard shortcuts
- [Finding Logs](tui/packages/cli/src/tui/guides/finding-logs.md) — Log directory structure, status log format, per-item logs, server log

### Run

The built binary is self-contained — it includes the Go server embedded inside:

```bash
./dist/tui/devenv-<platform>-<arch>/bin/devenv                     # Default: spawn server + TUI
./dist/tui/devenv-<platform>-<arch>/bin/devenv spawn               # Same as above (explicit)
./dist/tui/devenv-<platform>-<arch>/bin/devenv server --port 4050  # Server only
./dist/tui/devenv-<platform>-<arch>/bin/devenv attach <url>        # TUI only (connect to running server)
```

The `spawn` command (default) starts the server, launches the TUI, and cleans up the server on exit.

### Install

#### From Homebrew (recommended)

Tap the formula and install:

```bash
brew install friendsfriend/tap/devenv
```

> [!NOTE]
> First run `brew tap friendsfriend/tap` if you haven't already.
> The tap formula auto-updates on `brew upgrade`.

#### From GitHub releases

One command — no Go or Bun needed:

```bash
curl -fsSL https://raw.githubusercontent.com/friendsfriend/devenv/main/install-remote.sh | sh
```

This downloads the latest binary for your OS/arch from GitHub Releases,
places it in `~/.local/bin/devenv`, and strips the macOS quarantine
attribute so Gatekeeper doesn't block it.

#### From local build (for contributors)

```bash
bun run build:single
bun run install:bin
```

---

## Configuration

All configuration lives outside the repository in `~/.config/devenv/`. The server reads from this directory at startup.

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DEVENV_HOME` | `~/devenv` | Root directory for cloned repositories, logs, and task collections |
| `DEVENV_CONFIG_DIR` | `~/.config/devenv` | Config directory override |
| `DEVENV_CONTAINER_RUNTIME` | `docker` | Container runtime for Docker-compatible features. Set to `docker` or `podman` in `~/.config/devenv/.env` |
| `DEVENV_PODMAN_HOST` | unset | Optional Podman Docker API socket override, e.g. `unix:///run/user/501/podman/podman.sock` |

### Directory Structure

```
~/.config/devenv/
├── .env                                 # Optional — variable substitution for compose/providers/templates
├── providers/                           # Git provider definitions (credentials via .env placeholders)
│   └── <name>.json                      # Individual provider definitions
├── themes/                              # Custom TUI themes
│   └── <theme-name>.json                # OpenCode-compatible theme JSON
├── apps/
│   ├── compose/                         # Per-app Compose files
│   │   ├── <app-ident>-compose.yml          # Per-app compose files
│   │   └── <app-ident>-<profile>-compose.yml # Per-app profile variants
│   ├── definitions/                     # Per-app JSON definitions (split files)
│   └── build/                           # Custom Dockerfiles
│       ├── <app-ident>-build.Dockerfile     # App-specific build Dockerfile
│       └── <app-ident>-test.Dockerfile      # App-specific test Dockerfile
├── infrastructure/
│   ├── compose/                         # Shared infra compose files (per-service)
│   └── definitions/                     # Per-infra JSON definitions
├── libraries/
│   ├── definitions/                     # Per-library JSON definitions
│   └── build/                           # Library build helpers (optional)
├── templates/                           # Template files (copied into repository directories)
```

Task collections live under `$DEVENV_HOME/scripts/` (default `~/devenv/scripts/`), not in the config directory. If you share `~/.config/devenv` as a config repository, sync tasks separately:

```
~/devenv/scripts/                       # Any executable file is a task file
├── deploy.sh
├── greet.py                            # Python with shebang — works natively
├── weather.ts                          # TypeScript/Bun — works out of the box
├── database/
│   └── migrate.py
└── clean.sh
```

### `.env`

Optional local file for machine-specific DevEnv settings and `${VAR}` substitution in compose files, provider JSON files, and templates. Standard `KEY=VALUE` format with comments (`#`) and quoted values. Do not commit it.

| Variable | Description |
|---|---|
| `DEVENV_HOME` | Root directory for cloned repositories, logs, and task collections |
| `DEVENV_CONTAINER_RUNTIME` | Container runtime: `docker` (default) or `podman` |
| `DEVENV_PODMAN_HOST` | Optional Podman Docker API socket override |
| `CUSTOM_ENV_VAR` | Available as `${CUSTOM_ENV_VAR}` in compose files, provider JSON, and templates |

Example:

```dotenv
DEVENV_HOME=$HOME/devenv
DEVENV_CONTAINER_RUNTIME=docker
# DEVENV_CONTAINER_RUNTIME=podman
```

Docker runtime uses `docker` plus `docker-compose`. Podman runtime uses `podman` plus `podman-compose`.

### `themes/`

Custom TUI themes live in `DEVENV_CONFIG_DIR/themes/` (default `~/.config/devenv/themes/`). Drop an OpenCode-compatible theme file at:

```text
~/.config/devenv/themes/<theme-name>.json
```

Restart the TUI, then open the theme picker with `T`. Custom themes appear alongside built-in compatible themes and can override built-in names.

DevEnv also provides a `system` theme. It queries your terminal foreground, background, and ANSI palette at startup, then builds a theme from those colors.

Theme files use the OpenCode theme shape:

```json
{
  "defs": {
    "bg": "#101014",
    "fg": "#f0f0f5"
  },
  "theme": {
    "primary": "#7aa2f7",
    "secondary": "#bb9af7",
    "accent": "#7dcfff",
    "error": "#f7768e",
    "warning": "#e0af68",
    "success": "#9ece6a",
    "info": "#7dcfff",
    "text": "fg",
    "textMuted": "#9aa5ce",
    "background": "bg",
    "backgroundPanel": "#16161e",
    "backgroundElement": "#1f2335",
    "border": "#3b4261",
    "borderActive": "#7aa2f7",
    "selectedListItemText": "bg"
  }
}
```

See Help → Guides → Custom Themes for full field guidance.

### `providers/`

Git provider definitions are stored as individual JSON files in `~/.config/devenv/providers/`. Actual credentials live in `.env`; provider JSON must use `${...}` placeholders for `username` and `token`, making provider metadata safe to share in a config repository. Clear-text credentials in provider JSON are blocked: startup continues, the provider is shown as invalid in the TUI, and credentials are unusable until migrated to `.env` placeholders.

**Schema:**

```json
{
  "name": "my-github",
  "type": "github",
  "username": "${DEVENV_PROVIDER_MY_GITHUB_USERNAME}",
  "token": "${DEVENV_PROVIDER_MY_GITHUB_TOKEN}"
}
```

| Field | Type | Description |
|---|---|---|
| `name` | string | Unique identifier for the provider |
| `type` | string | `github` or `gitlab` |
| `username` | string | Git platform username or `${...}` placeholder backed by `.env` |
| `token` | string | Personal Access Token (PAT) or `${...}` placeholder backed by `.env` |

A default `github-public` provider (type: github, no credentials) is auto-created for public GitHub repositories.

Providers can be managed through the TUI Providers view (`c`) using keybinds:
- `a`: Add new provider
- `e`: Edit selected provider
- `d`: Delete selected provider
- `j` / `k`: Navigate list

**REST API:**

| Endpoint | Method | Description |
|---|---|---|
| `/api/providers` | GET | List all providers (tokens hidden) |
| `/api/providers` | POST | Create a new provider |
| `/api/providers/{name}` | GET | Get provider details |
| `/api/providers/{name}` | PUT | Update an existing provider |
| `/api/providers/{name}` | DELETE | Delete a provider |

---

### `apps/`

#### `apps/definitions/`

Each deployable application is defined by a single JSON file in `apps/definitions/`. Apps appear in the **Applications** tab of the TUI. They have the broadest set of capabilities:

- **Git operations** — clone, pull, push, fetch, branch switching (`g`), worktree management (`w`)
- **Docker lifecycle** — start (`s`), stop (`S`), restart (`R`), build (`B`), test
- **Status dashboard** — real-time container status via SSE, port mapping, resource stats
- **Change requests** — browse, diff, discuss, approve, rebase (`m` / `M`)
- **CI/CD pipelines** — view pipeline jobs, logs, test results
- **Logs** — container logs (`l`), operation logs (`o`)

**Schema (`apps/definitions/<ident>.json`):**

```json
{
  "ident": "my-service",
  "displayName": "My Service",
  "repositoryPath": "https://github.com/org/my-service.git",
  "containerBaseName": "my-service",
  "sourceType": "github",
  "provider": "my-github",
  "gitMode": "BRANCH"
}
```

| Field | Type | Description |
|---|---|---|
| `ident` | string | Unique identifier (required, becomes the directory name under `$DEVENV_HOME`) |
| `displayName` | string | Human-readable name shown in the TUI |
| `repositoryPath` | string | Git remote URL (HTTPS or SSH) |
| `containerBaseName` | string | Docker container base name (optional, defaults to ident) |
| `sourceType` | string | `"github"` or `"gitlab"` — enables Change Request integration (optional) |
| `provider` | string | Name of the provider from `providers/` (optional, used for authenticated API access) |
| `gitMode` | string | `"BRANCH"` (single checkout, default) or `"WORKTREE"` (parallel worktrees via worktrunk) |

> **Note:** `branch`, `activeWorktree`, and `mainWorktreeBranch` are runtime state fields stored in the SQLite database (`$DEVENV_HOME/db/state.db`). They MUST NOT be included in the JSON definition files.

---

#### `apps/build/`

Convention-based Dockerfiles for building and testing app containers. Each action (`build`, `test`) resolves its Dockerfile independently.

Dockerfiles must be placed at `{configDir}/apps/build/{appIdent}-{action}.Dockerfile`. If no Dockerfile is found, the action fails.

**Build Dockerfile**

Produces two outputs: a runnable Docker image and extracted artifacts. Use `LABEL devenv.artifacts="<path>"` to declare where build output lives inside the container. After the image is built, devenv extracts the contents at that path and mirrors them to the same relative path in the repository root.

**Example — Bun application:**

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

After build, the `dist/` directory is extracted from the container to `{repoRoot}/dist/`.

**Example — Maven application:**

```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn package -DskipTests

FROM eclipse-temurin:21-jre
LABEL devenv.artifacts="target"
WORKDIR /app
COPY --from=build /app/target/*.jar ./target/
```

After build, the `target/` directory is extracted from the container to `{repoRoot}/target/`.

**Example — Go application:**

```dockerfile
FROM golang:1.26-bookworm AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o bin/server .

FROM alpine:3.20
LABEL devenv.artifacts="bin"
WORKDIR /app
COPY --from=build /app/bin ./bin
```

**Test Dockerfile**

Runs as a single ephemeral container. Build succeeding = tests pass, build failing = tests fail. No artifact extraction.

**Example — Go + TypeScript:**

```dockerfile
FROM golang:1.26-bookworm
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"
WORKDIR /app
COPY server/go.mod server/go.sum ./server/
RUN cd server && go mod download
COPY tui/package.json tui/bun.lock ./tui/
RUN cd tui && bun install --frozen-lockfile
COPY . .
RUN cd server && go test ./...
RUN cd tui && bun run type-check
```

**Example — Maven:**

```dockerfile
FROM maven:3.9-eclipse-temurin-21
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn test
```

---

#### `apps/compose/`

Docker Compose files for running application containers via `docker compose up -d`. The image built by the build step is referenced in the compose file.

Compose files must be placed in the config directory. The system resolves them as follows:

With profile selected:
1. `{configDir}/apps/compose/{appIdent}-{profile}-compose.yml`
2. Falls back to default resolution below

Default (no profile):
1. `{configDir}/apps/compose/{appIdent}-compose.yml`

**Profile Discovery:** Profiles are discovered automatically by scanning the config directory for matching filenames. The TUI presents available profiles when starting an app. Selecting "default (no profile)" uses the default compose file. Config directory profiles: `{appIdent}-{profile}-compose.yml` → extracts `{profile}`

**Default compose file:**

```yaml
services:
  my-service:
    image: my-service:latest
    ports:
      - "3000:3000"
    env_file:
      - .env
```

**Profile: staging:**

```yaml
services:
  my-service:
    image: my-service:latest
    ports:
      - "3000:3000"
    env_file:
      - .env
    environment:
      - NODE_ENV=staging
      - DATABASE_URL=postgres://staging-db:5432/app
    depends_on:
      - staging-db

  staging-db:
    image: postgres:16
    environment:
      - POSTGRES_DB=app
      - POSTGRES_PASSWORD=staging
```

**Profile: debug:**

```yaml
services:
  my-service:
    image: my-service:latest
    ports:
      - "3000:3000"
      - "9229:9229"
    env_file:
      - .env
    environment:
      - NODE_ENV=development
      - DEBUG=true
    volumes:
      - .:/app
    command: ["node", "--inspect=0.0.0.0:9229", "dist/server.js"]
```

---

### `infrastructure/`

#### `infrastructure/definitions/`

Infrastructure services (databases, message queues, caches, etc.) appear in the **Infrastructure** tab of the TUI. They are managed purely through Docker Compose and have minimal capabilities:

- **Docker lifecycle** — start (`s`), stop (`S`), restart (`R`)
- **Status dashboard** — real-time container status via SSE
- **Container logs** (`l`)

Infrastructure services do **not** have git operations, build/test workflows, Change Request integration, or CI/CD pipeline features.

**Schema (`infrastructure/definitions/<ident>.json`):**

```json
{
  "ident": "postgres",
  "displayName": "PostgreSQL",
  "containerBaseName": "postgres"
}
```

| Field | Type | Description |
|---|---|---|
| `ident` | string | Unique identifier (required) |
| `displayName` | string | Human-readable name shown in the TUI |
| `containerBaseName` | string | Docker container base name used for lifecycle management |

#### `infrastructure/compose/`

Shared infrastructure Docker Compose files. One file per service placed under `{configDir}/infrastructure/compose/`. These compose files are used for lifecycle management (start/stop/restart) just like app compose files, but without profile support.

---

### `libraries/`

#### `libraries/definitions/`

Libraries use the same schema as apps, but their type is derived from their definition location under `libraries/definitions/`. They appear in the **Libraries** tab of the TUI. Libraries have a subset of capabilities focused on building and testing:

- **Git operations** — clone, pull, push, fetch, branch switching, worktree management
- **Docker lifecycle** — build (`B`), test
- **Change requests** — full Change Request workflow
- **CI/CD pipelines** — pipeline jobs, logs, test results
- **Logs** — operation logs

Libraries do **not** support running containers (`s`/`S`/`R`), container logs, or the real-time status dashboard since they are not deployed as services.

**Schema (`libraries/definitions/<ident>.json`):**

```json
{
  "ident": "shared-lib",
  "displayName": "Shared Library",
  "repositoryPath": "https://github.com/org/shared-lib.git",
  "provider": "my-github"
}
```

#### `libraries/build/`

Optional directory for build helpers and shared Dockerfile snippets used across library build/test workflows. Contents follow the same convention as `apps/build/`.

---

### `templates/`

Template files that are copied into repository directories during initialization. All files in this directory (non-recursive) are copied to the target repository directory when setting up a new repository.

### `scripts/`

Task collections for the Tasks tab in the TUI. Tasks are executable task files discovered recursively from `$DEVENV_HOME/scripts/` (default `~/devenv/scripts/`) and support both flat and nested layouts.

**Discovery rules:**
- **Unix:** Any executable file (`+x`) is treated as a task file, regardless of extension. The OS handles interpreter selection via the shebang (`#!`) line.
- **Windows:** Files with known executable extensions (`.sh`, `.ps1`, `.py`, `.ts`, `.js`, `.bat`, `.cmd`, `.exe`) are discovered, plus any file with a shebang referencing a recognized interpreter.

This means task files in any language work out of the box — Python, TypeScript/Bun, Rust, Ruby, or any executable with a shebang:

```text
scripts/
├── deploy.sh              # Bash (#!/usr/bin/env bash)
├── database/
│   └── migrate.py         # Python (#!/usr/bin/env python3)
├── serve.ts               # TypeScript/Bun (#!/usr/bin/env bun)
└── cleanup                # Binary executable (no extension, +x)
```

From the Tasks tab you can browse folders, run tasks, and open task files in your editor.

#### Parameter Metadata (`--devenv-metadata`)

Tasks can declare their parameter schema via the `--devenv-metadata` convention. When DevEnv needs to know a task's parameters (before showing the input modal), it runs the task file with `--devenv-metadata`, captures stdout, and parses the JSON output.

If the task exits with code 0 and prints valid JSON, the parsed parameters are used. If it fails, times out (3s), or prints invalid JSON, the task is treated as having no parameters (silent fallback, no error shown). Results are cached per-file and invalidated when the file's mtime changes.

**JSON schema (printed to stdout on `--devenv-metadata`):**

```json
[
  {
    "name": "env",
    "type": "enum",
    "required": true,
    "description": "Target environment",
    "defaultValue": "dev",
    "choices": ["dev", "test", "prod"],
    "flag": "--env"
  },
  {
    "name": "dryRun",
    "type": "bool",
    "required": false,
    "defaultValue": "true",
    "description": "Simulate without making changes",
    "flag": "--dry-run"
  }
]
```

| Field | Type | Description |
|---|---|---|
| `name` | string | Parameter name (required) |
| `type` | string | `string`, `int`, `bool`, or `enum` |
| `required` | bool | Whether the parameter must be filled |
| `description` | string | Shown in the modal as help text |
| `defaultValue` | string | Pre-filled value in the modal |
| `choices` | string[] | Allowed values for `enum` type |
| `flag` | string | CLI flag emitted (e.g. `--env`); defaults to `--<name>` |

**Example — Bash:**

```bash
#!/usr/bin/env bash

if [[ "${1:-}" == "--devenv-metadata" ]]; then
  cat <<'METADATA'
[
  {"name":"name","type":"string","required":true,"desc":"Name to greet","flag":"--name"},
  {"name":"shout","type":"bool","required":false,"defaultValue":"false","desc":"Uppercase output"}
]
METADATA
  exit 0
fi

# Normal execution follows...
NAME="${name:-World}"
echo "Hello, ${NAME}!"
```

**Example — Python:**

```python
#!/usr/bin/env python3
import json, sys

if len(sys.argv) > 1 and sys.argv[1] == "--devenv-metadata":
    print(json.dumps([
        {"name": "name", "type": "string", "required": True, "flag": "--name"},
    ]))
    sys.exit(0)
```

**Example — TypeScript/Bun:**

```typescript
#!/usr/bin/env bun

if (process.argv.includes("--devenv-metadata")) {
  console.log(JSON.stringify([
    { name: "city", type: "string", required: true, flag: "--city" },
  ]));
  process.exit(0);
}
```

#### Server-side metadata API

The server provides a `GET /api/scripts/metadata?path=<relativePath>` endpoint that the TUI calls before showing the args modal. This endpoint:
- Runs `--devenv-metadata` on the task file with a 3-second timeout
- Caches the result per-file, invalidating on mtime change
- Returns `{ "parameters": [...] }` or `{ "parameters": [] }` on error

#### Execution

- **Unix:** The task file is executed directly via its shebang line (`exec.Command(scriptPath, args...)`). No interpreter resolution needed — the OS handles it.
- **Windows:** The shebang line is read, the interpreter is mapped to a Windows command (e.g., `python3` → `python`, `bun` → `bun.exe`), and execution proceeds with the resolved interpreter.

Both foreground (interactive TUI via `spawnSync`) and server-side (background via `exec.Command`) paths use the same architecture.

#### TUI interaction

In the parameter modal:
- `Enter` / `s` — Run the task (shows args modal first if metadata declares parameters)
- `j/k` selects a parameter field
- `Type` / `Backspace` edits text values
- `←/→` cycles through enum choices
- `Space` toggles boolean parameters
- `↑/↓` navigates per-task argument history
- `Esc` cancels

### Secrets Management

The CLI supports `${VAR}` placeholder substitution using values from the `.env` file in the config directory (`~/.config/devenv/.env` or `$DEVENV_CONFIG_DIR/.env`). The `.env` file uses standard `KEY=VALUE` format with comments (`#`) and quoted values. It is optional — without it, `${VAR}` placeholders remain unsubstituted but features still function.

There are three substitution mechanisms:

1.  **Docker Compose**: When a `.env` file exists, the CLI automatically injects `--env-file <path>` into all `docker compose` commands. Compose files use native `${VAR}` syntax for these variables. Note that `docker build` commands are not affected, as environment variables are not injected into builds.
2.  **Provider JSON files**: When the provider store loads JSON files from the `providers/` directory, it substitutes `${VAR}` placeholders in field values before parsing. The original JSON files on disk are never modified.
3.  **Template files**: During the `CopyTemplatesDir` operation, template files are read and `${VAR}` placeholders are substituted using values from the `.env` file before being written to the destination. Source templates remain unchanged.

The `pkg/resources/envfile.go` file provides the underlying logic through `LoadEnvFile(path) (map[string]string, error)` and `SubstituteVars(s string, vars map[string]string) string`.

It's recommended to maintain a `.env.example` file as a template with empty values for variables used in your compose/provider/template files.

---

## Runtime Directories

### Home Directory (`devenv_home`)

The home directory (default `~/devenv`) is where repositories are cloned and operational data is stored:

```
~/devenv/
├── <repository-localDirectoryPath>/   # Cloned repositories
├── logs/
│   ├── status.log              # Operation status log (structured)
│   └── <app-ident>.log         # Per-app command output logs
```

---

## Worktrees

By default, devenv manages one checkout per repository. Switching branches modifies the working tree in-place. **Worktree mode** gives each branch its own permanent directory instead — so `main`, `feature/login`, and `hotfix/auth` all exist on disk simultaneously and you can switch between them instantly without any git checkout.

This solves two common problems:

- **IDE configuration reset** — IntelliJ (`.idea/`), editor settings, and other gitignored config files survive branch switches because the directories are never touched
- **Parallel work** — you can build, run, or inspect one branch while working on another

### Prerequisites

Worktree mode requires **[worktrunk](https://worktrunk.dev)** (`wt`) to be installed and available in your `PATH`:

```bash
brew install worktrunk
wt config shell install   # enables directory switching in your shell
```

### Enabling worktree mode

Set `"gitMode": "WORKTREE"` in the repository definition JSON (`~/.config/devenv/apps/definitions/<ident>.json` or `~/.config/devenv/libraries/definitions/<ident>.json`).

Repositories added through the TUI use single-checkout branch mode by default. To enable worktrees for those repositories, edit the definition JSON and restart DevEnv.

### Directory layout

When worktree mode is on, devenv clones the repository into a subdirectory and worktrunk places each additional branch alongside it:

```
$DEVENV_HOME/
  my-app/
    my-app/                    ← primary worktree  (initial clone, always present)
    my-app.feature-login/      ← linked worktree   (created on first checkout)
    my-app.hotfix-auth/        ← linked worktree
    my-app.develop/            ← linked worktree
```

The branch name becomes the directory suffix. Slashes in branch names are replaced with dashes (`feature/login` → `my-app.feature-login`).

> **Removing a repository** (`-` in the TUI) deletes the entire `my-app/` folder, including all worktrees, in one step.

### Switching branches

Branch switching works the same way as without worktrees — open the branch selector with `b`, pick a branch, and press `Enter`.

What changes behind the scenes:

- If the branch already has a worktree directory, devenv switches to it immediately (no git work at all)
- If it does not, worktrunk creates the directory, checks out the branch, and runs any configured hooks

The active branch is shown in the main table with a `[WT]` prefix, e.g. `[WT] feature/login`.

### IntelliJ and IDE setup

Each worktree starts as a fresh directory with no `.idea/` folder. To carry your IntelliJ project configuration across to new worktrees automatically, add a `post-start` hook to your repository:

**`.config/wt.toml`** (commit this file to your repo):

```toml
[post-start]
copy-config = "wt step copy-ignored"
```

When devenv creates a new worktree, worktrunk runs this hook in the background and copies all gitignored files — including `.idea/`, local `.env` files, build caches — from the source worktree into the new one. By the time you open the new directory in IntelliJ it is already configured.

Because each worktree has its own copy of `.idea/workspace.xml` (recent files, breakpoints, window layout), multiple IntelliJ windows can be open on different branches simultaneously without conflicting.

### Worktrunk path configuration

devenv sets the worktree path template automatically when calling worktrunk, so the layout above is always produced regardless of your personal `~/.config/worktrunk/config.toml`. You do not need to configure anything in worktrunk for devenv-managed repos.

If you also use worktrunk directly from the terminal in the same repo the paths will match, because devenv uses worktrunk's own default template.

### Manual configuration

Enable worktrees with `gitMode` in the repository definition (`~/.config/devenv/apps/definitions/<ident>.json` or `~/.config/devenv/libraries/definitions/<ident>.json`):

| Field | Type | Description |
|---|---|---|
| `gitMode` | string | `"WORKTREE"` enables parallel worktrees; `"BRANCH"` uses a single checkout |

Runtime worktree state (active worktree and main branch) is stored outside the definition JSON.

**Example:**

```json
{
  "ident": "my-app",
  "displayName": "My App",
  "repositoryPath": "https://github.com/org/my-app.git",
  "containerBaseName": "my-app",
  "provider": "my-github",
  "gitMode": "WORKTREE"
}
```

### Worktree API endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/git/worktrees?appIdent=...` | GET | List all worktrees for a repository (branch, path, isMain, active) |
| `/api/git/worktrees?appIdent=...&branch=...` | DELETE | Remove a linked worktree (active and primary worktrees are protected) |
| `/api/git/checkout?appIdent=...&branch=...` | POST | Create or activate a worktree for the branch |

---

## Server Features

- Docker container management (build, test, run, stop, status via SSE)
- GitLab / GitHub API integration (change requests, pipelines, branches)
- Repository operations (clone, checkout, pull, push)
- Convention-based Docker build/test/run with artifact extraction
- Real-time status broadcasting via SSE
- Multi-provider credential management
- pi session integration

## TUI Features

- Real-time container status dashboard
- Change request management and diff viewer
- CI/CD pipeline viewer
- pi sessions (AI coding sessions with history)
- Provider management (add, edit, delete providers)
- Interactive terminal UI (SolidJS + OpenTUI)

---

## Development

### Type Checking

```bash
bun run type-check
```

### Building for Distribution

```bash
bun run build:single   # Current platform only (recommended for development)
bun run build          # All platforms (release builds)
```

### Debugging

- **Server logs:** `<devenv_home>/logs/status.log`
- **Item logs:** `<devenv_home>/logs/<item-ident>.log`
