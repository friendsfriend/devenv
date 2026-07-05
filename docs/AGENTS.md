# AGENTS.md - Coding Guidelines for devenv-cli

> **IMPORTANT**: After completing any significant operation (new features, refactors, architectural changes, package additions/removals), update both this file (`docs/AGENTS.md`) and `README.md` to reflect the changes. Documentation must stay in sync with the codebase.

## 🌟 Primary Architecture Reference

DevEnv uses a Go HTTP API server plus a TypeScript/Bun OpenTUI frontend with SolidJS.

Key rules:
- **JSX Configuration**: Use `@opentui/solid/preload` in `bunfig.toml` for OpenTUI JSX runtime initialization.
- **Type Safety**: Use TypeScript with `jsxImportSource: "@opentui/solid"` and DOM types.
- **Component Patterns**: Prefer reusable SolidJS components with OpenTUI primitives.
- **State Management**: Use SolidJS signals and stores for reactive UI.
- **Client/Server Architecture**: Use HTTP API + Server-Sent Events for real-time updates.
- **Separate Process Pattern**: Server runs in a separate process from the TUI to avoid Bun compiled-binary networking issues.
- **Pi-only AI**: AI workflows use `pi`; OpenCode is not an AI backend.

OpenCode compatibility is limited to theme JSON shape support.

---

## 📁 Repository Structure

```
devenv-cli/
├── server/                              # Go backend server
│   ├── main.go                         # Server entry point
│   ├── pkg/
│   │   ├── app/                        # App/InfraService domain types, apps.json loading
│   │   ├── build/                      # Docker build & test service
│   │   ├── docker/                     # Docker client (container ops, events, stats)
│   │   ├── git/                        # Git repository operations (go-git)
│   │   ├── github/                     # GitHub API client
│   │   ├── gitlab/                     # GitLab API client
│   │   ├── logging/                    # Status log + per-item log writer
│   │   ├── operations/                 # Clone/checkout/run operations + executor
│   │   ├── provider/                   # Git provider credential management
│   │   ├── resources/                  # Home dir, config dir, env file, template management
│   │   ├── server/                     # HTTP API server (DI-based)
│   │   │   ├── server.go              # Server struct, Start(), SSE, pollers
│   │   │   ├── handlers_agent.go      # Pi session endpoints
│   │   │   ├── handlers_apps.go       # App/infra/status endpoints
│   │   │   ├── handlers_build.go      # Build/test/run/start actions
│   │   │   ├── handlers_docker.go     # Docker start/stop/restart/logs
│   │   │   ├── handlers_git.go        # Git pull/push/fetch/branches/checkout
│   │   │   ├── handlers_github.go     # GitHub PR/actions endpoints
│   │   │   ├── handlers_gitlab.go     # GitLab MR/pipeline/job endpoints
│   │   │   └── response.go           # Shared response helpers
│   │   ├── services/                   # DI container (wires all services)
│   │   │   └── container.go           # Container struct with all service deps
│   │   └── status/                     # Operation status manager with listener pattern
│   └── go.mod
│
├── tui/                                # TypeScript/Bun TUI
│   ├── bunfig.toml                    # Bun configuration (JSX preload)
│   ├── package.json                   # TUI dependencies
│   ├── packages/
│   │   ├── cli/                       # CLI entry point
│   │   │   ├── src/
│   │   │   │   ├── spawn.ts          # Command dispatcher (spawn/attach/server/start)
│   │   │   │   └── tui/              # TUI application
│   │   │   │       ├── app-opentui.tsx  # Orchestrator (~246 lines)
│   │   │   │       ├── columns.ts       # Table column definitions
│   │   │   │       ├── spinner.ts       # Spinner animation
│   │   │   │       ├── stores/          # 8 store files (factory pattern)
│   │   │   │       ├── actions/         # 12 action files (factory pattern)
│   │   │   │       ├── effects/         # Log subscription effects
│   │   │   │       ├── keyboard/        # 16 keyboard handler files
│   │   │   │       └── views/           # Content router, modals, header helpers
│   │   │   └── package.json
│   │   ├── core/                      # Client SDK & utilities
│   │   │   ├── src/
│   │   │   │   ├── index.ts           # DevEnvClient facade (~122 lines)
│   │   │   │   ├── client-types.ts    # ClientDeps + FetchFunction types
│   │   │   │   ├── apps-client.ts     # App/infra/status API methods
│   │   │   │   ├── docker-client.ts   # Docker container operations
│   │   │   │   ├── git-client.ts      # Git operations
│   │   │   │   ├── cr-client.ts       # CR management
│   │   │   │   ├── ci-client.ts       # CI/CD pipeline/job operations
│   │   │   │   ├── provider-client.ts # Provider CRUD
│   │   │   │   ├── agent-client.ts    # Pi sessions
│   │   │   │   ├── logs-client.ts     # Operation logs + AI analysis
│   │   │   │   ├── repos-client.ts    # Repo search/branches
│   │   │   │   ├── events-client.ts   # SSE subscription + health
│   │   │   │   ├── custom-fetch.ts    # Node.js HTTP-based fetch
│   │   │   │   ├── error-handler.ts   # Fetch error handling
│   │   │   │   ├── logger.ts          # Logging system
│   │   │   │   └── clipboard.ts       # Clipboard utilities
│   │   │   └── package.json
│   │   ├── types/                     # Shared TypeScript types
│   │   └── ui/                        # Shared UI components
│   │       ├── src/
│   │       │   └── colors.ts          # Catppuccin Mocha theme
│   │       └── package.json
│   ├── scripts/
│   │   └── build.ts                   # Build script (creates binaries)
│   └── tsconfig.json
│
├── build.ts                            # Root build orchestrator
├── .gitlab-ci.yml                     # CI/CD pipeline
└── docs/
    └── AGENTS.md                      # This file
```

---

## 🏗️ Architecture: Separate Process Pattern

**CRITICAL**: DevEnv uses **separate processes** for server and TUI:

```
┌─────────────────────────────────┐
│  devenv (spawn command)         │
└────────────┬────────────────────┘
             │
             ├─────► Go Server Process (HTTP API on port 4050)
             │       - Handles business logic
             │       - Docker, Git, GitLab operations
             │       - Server-Sent Events for real-time updates
             │
             └─────► TUI Process (attach command)
                     - Connects via HTTP to 127.0.0.1:4050
                     - SolidJS/OpenTUI rendering
                     - Native fetch works (separate process)
```

### Why Separate Processes?

**Problem**: Bun's compiled binaries have localhost networking issues when running TUI and server in the same process:
- First HTTP request succeeds
- Subsequent requests fail with ECONNREFUSED
- This is a Bun limitation in compiled binaries

**Solution**:
1. **`spawn` command** (default): Starts server process, then spawns TUI process with `attach` command
2. **`attach <url>` command**: Connects TUI to running server via HTTP
3. **Result**: Each process has its own event loop, Bun's fetch works correctly

### Commands

```bash
# Default: spawn both processes
./devenv                               # → spawn → server process + attach process

# Manual control
./devenv server --port 4050            # Start only server
./devenv attach http://127.0.0.1:4050  # Attach TUI to server
```

---

## Build/Test Commands

### Building

```bash
# Build all platforms (darwin, linux, windows)
bun run build.ts

# Build single platform (current OS/arch)
bun run build:single

# Build output: dist/tui/devenv-{platform}-{arch}/bin/devenv
```

### Testing

**Go Server Tests:**
```bash
cd server
go test ./...                       # Run all tests
go test ./pkg/gitlab/...           # Run specific package
go test -race ./...                # Run with race detection
go fmt ./...                       # Format code
go vet ./...                       # Static analysis
```

**TUI Development:**
```bash
cd tui
bun install                        # Install dependencies
bun run dev                        # Development mode
bun run build                      # Build TUI
```

### CI/CD (GitLab)

The `.gitlab-ci.yml` builds self-contained binaries for all platforms:

```yaml
build:binaries:
  stage: build
  script:
    - cd tui && bun install && cd ..
    - bun run build.ts              # Builds all platforms
  artifacts:
    paths:
      - dist/tui/                   # Contains all platform binaries
```

**Build Process:**
1. Builds Go server binaries for each platform (darwin-amd64, darwin-arm64, linux-amd64, windows-amd64)
2. Embeds each server binary into corresponding TUI binary
3. Creates self-contained executables (one binary per platform)

---

## Code Style Guidelines
- **Module**: `friendsfriend/devenv` (Go 1.26.4)
- **Imports**: Use full module paths, group stdlib/external/internal imports
- **Naming**: Use camelCase for unexported, PascalCase for exported identifiers
- **Error Handling**: Use the status log to log errors and handle them gracefully. Never panic. Use `log.Printf` (not `fmt.Printf`) for server-side logging.
- **Packages**: Organize by domain (pkg/docker, pkg/gitlab, pkg/server, etc.)
- **Comments**: Use package comments for complex modules
- **Go Dependencies**: Cobra for CLI, Docker SDK, go-git
- **TUI Dependencies**: SolidJS + OpenTUI, Bun runtime

## Architecture Notes

### Go Backend
- **Dependency Injection**: `services.Container` holds all service instances. The `Server` struct receives `*services.Container`, `[]app.App`, and `[]app.InfraService` directly — no global state.
- **Handler organization**: Handlers are split by domain into separate files (`handlers_apps.go`, `handlers_docker.go`, etc.). Shared response helpers live in `response.go`.
- **Configuration**: All config values come from environment variables (`DEVENV_HOME`, `DEVENV_CONFIG_DIR`). There is no config file or config singleton — the `resources` package reads env vars directly.
- **Status broadcasting**: `status.Manager` uses a listener pattern — handlers call `manager.Broadcast()` and SSE connections receive updates via registered listeners.

### TUI Frontend
- **Store pattern**: Factory functions `createXxxStore()` return signal bundles typed as `XxxStore`. SolidJS signals are closures that must be created inside a reactive context, hence the factory pattern.
- **Action pattern**: Factory functions `createXxxActions(store1, store2, client, ...)` receive the stores they need. Actions contain business logic and API calls.
- **Keyboard handling**: OpenTUI only supports ONE `useKeyboard` hook per app. The single handler dispatches to sub-handler functions organized by domain (e.g., `handleGlobalKeys`, `handleTableKeys`, `handleCrDetailKeys`).
- **Views**: Content router selects the active view based on UI store state. Modal overlays are rendered conditionally.
- **Core client**: `DevEnvClient` is a facade class (~122 lines). Domain-specific API methods live in 10 separate client modules (e.g., `apps-client.ts`, `docker-client.ts`). Each module exports functions that take `ClientDeps` as their first argument.

### UI Colors
- **CRITICAL**: Always use colors from `@devenv/ui` (active theme)
  - Import via: `import { uiColors } from '@devenv/ui'`
  - Never hardcode hex colors in components
  - Use semantic color names: `uiColors.primary`, `uiColors.error`, `uiColors.textPrimary`, etc.
- When you change keybinds for actions also change the help text for the view
## Color System

**CRITICAL**: All UI components MUST use centralized theme colors. Never hardcode colors.

### Usage in TypeScript/OpenTUI Components
```typescript
import { uiColors } from '@devenv/ui';

// ✅ CORRECT - Use semantic color names
<text style={{ color: uiColors.primary }}>Loading...</text>
<box backgroundColor={uiColors.bgSurface1}>...</box>
<text style={{ color: uiColors.error }}>Error message</text>

// ❌ WRONG - Never hardcode colors
<text style={{ color: '#4A90E2' }}>Loading...</text>
<box backgroundColor="#2C2C2C">...</box>
```

### Available Semantic Colors
```typescript
uiColors = {
  // Primary colors
  primary: '#89b4fa',        // Blue - primary actions, highlights
  borderHighlight: '#b4befe', // Lavender - focused borders
  
  // Text colors
  textPrimary: '#cdd6f4',     // Text - main content
  textSecondary: '#bac2de',   // Subtext1 - secondary text
  textMuted: '#9399b2',       // Overlay2 - borders, muted elements
  
  // Background colors
  bgBase: '#1e1e2e',          // Base - main background
  bgMantle: '#181825',        // Mantle - header/footer background
  bgSurface1: '#45475a',      // Surface1 - table headers, elevated elements
  bgSurface2: '#585b70',      // Surface2 - selected rows, hover states
  
  // Status colors
  success: '#a6e3a1',         // Green - success states
  warning: '#f9e2af',         // Yellow - warnings
  error: '#f38ba8',           // Red - error states
}
```

### Color Usage Guidelines
- **Borders**: Use `uiColors.textMuted` for subtle borders, `uiColors.borderHighlight` for focused elements
- **Text**: Use `uiColors.textPrimary` for main text, `uiColors.textSecondary` for secondary text
- **Backgrounds**: Use `uiColors.bgSurface1` for headers, `uiColors.bgSurface2` for selections
- **States**: Use `uiColors.success`, `uiColors.warning`, `uiColors.error` for status indicators
- **Loading/Primary**: Use `uiColors.primary` for loading states and primary UI elements

---

## Text Styling (Bold, Underline, etc.)

**CRITICAL**: OpenTUI does NOT use CSS-style properties for text attributes. Use the `TextAttributes` API instead.

### Usage in TypeScript/OpenTUI Components

**Three Ways to Style Text**:

#### 1. Direct Attributes on `<text>` Element (Preferred for Bold)
```typescript
import { TextAttributes } from '@opentui/core';
import { uiColors } from '@devenv/ui';

// ✅ CORRECT - Use attributes property directly on <text>
<text fg={uiColors.primary} attributes={TextAttributes.BOLD}>Bold Text</text>
<text fg={uiColors.error} attributes={TextAttributes.BOLD}>Bold Error</text>
<text attributes={TextAttributes.UNDERLINE}>Underlined</text>
<text fg={uiColors.success} attributes={TextAttributes.BOLD | TextAttributes.UNDERLINE}>
  Bold + Underlined
</text>
```

#### 2. Style Object on `<span>` for Inline Styling
```typescript
// ✅ CORRECT - Use style object on <span> for inline styles
<text>
  <span style={{ fg: uiColors.text }}>
    <b>Bold with HTML tag</b>
  </span>
  <span style={{ fg: uiColors.textMuted }}>muted text</span>
</text>

// Combining fg color with TextAttributes in style object
<span style={{ fg: uiColors.success, attributes: TextAttributes.BOLD }}>
  ✓ Enabled
</span>
```

#### 3. HTML Tags Inside `<text>` or `<span>`
```typescript
// ✅ CORRECT - Use HTML <b> tag for bold
<text>
  Regular text with <b>bold section</b> inline
</text>

<span style={{ fg: uiColors.text }}>
  <b>Bold keybind</b> <span style={{ fg: uiColors.textMuted }}>description</span>
</span>
```

#### ❌ WRONG - CSS-Style Properties
```typescript
// ❌ These DON'T work in OpenTUI
<text style={{ bold: true }}>Bold Text</text>
<text style={{ fontWeight: 'bold' }}>Bold Text</text>
<text bold={true}>Bold Text</text>
```

### Available Text Attributes
```typescript
TextAttributes.BOLD       // Bold text
TextAttributes.DIM        // Dimmed/faded text
TextAttributes.ITALIC     // Italic text
TextAttributes.UNDERLINE  // Underlined text
TextAttributes.BLINK      // Blinking text
TextAttributes.REVERSE    // Reverse video (swap fg/bg)
TextAttributes.HIDDEN     // Hidden text
TextAttributes.STRIKETHROUGH // Strikethrough text
```

### Combining Attributes (Bitwise OR)
```typescript
// Multiple attributes using bitwise OR operator
<text 
  fg={uiColors.primary} 
  attributes={TextAttributes.BOLD | TextAttributes.UNDERLINE}>
  Bold and Underlined
</text>
```

### Conditional Attributes
```typescript
// Use ternary operator for conditional styling
const isBold = () => isSelected || isCurrent;

<text 
  fg={color} 
  attributes={isBold() ? TextAttributes.BOLD : undefined}>
  {text}
</text>
```

### Pattern Reference
- Never use `style={{ bold: true }}` - it won't work
- Always import `TextAttributes` from `@opentui/core`

### Examples

#### Example 1: Dialog Titles (Direct Attributes)
```typescript
<text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
  {props.title}
</text>
```

#### Example 2: Keybind Help Text (HTML Tags + Inline Styles)
```typescript
<text>
  <span style={{ fg: uiColors.textPrimary }}>
    <b>{item.title}</b>{" "}
  </span>
  <span style={{ fg: uiColors.textMuted }}>{keybind}</span>
</text>
```

#### Example 3: Status Indicators (Style Object with Attributes)
```typescript
// From dialog-mcp.tsx - enabled/disabled status
function Status(props: { enabled: boolean; loading: boolean }) {
  if (props.loading) {
    return <span style={{ fg: uiColors.textMuted }}>⋯ Loading</span>
  }
  if (props.enabled) {
    return <span style={{ fg: uiColors.success, attributes: TextAttributes.BOLD }}>✓ Enabled</span>
  }
  return <span style={{ fg: uiColors.textMuted }}>○ Disabled</span>
}
```

#### Example 4: Conditional Bold (Active Selection)
```typescript
// From dialog-select.tsx - bold when active
<text 
  fg={props.active ? fg : uiColors.textPrimary}
  attributes={props.active ? TextAttributes.BOLD : undefined}>
  {props.title}
</text>
```

#### Example 5: Inline Bold Sections
```typescript
// From dialog-prompt.tsx - mixed bold and normal text
<text>
  enter <span style={{ fg: uiColors.textMuted }}>submit</span>
</text>

// With inline bold
<text>
  <b>enter</b> <span style={{ fg: uiColors.textMuted }}>to continue</span>
</text>
```

---

## JSX Configuration

**CRITICAL**: OpenTUI requires specific JSX configuration to work correctly.

### bunfig.toml (Bun Configuration)
```toml
# Preload OpenTUI's JSX runtime before any code executes
preload = ["@opentui/solid/preload"]
```

**Why**: The preload script initializes OpenTUI's JSX runtime, preventing "React is not defined" errors.

### tsconfig.json (TypeScript Configuration)
```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@opentui/solid",  // NOT "solid-js"
    "lib": ["ESNext", "DOM", "DOM.Iterable"]  // DOM types required
  }
}
```

**Key Points**:
- Use `"@opentui/solid"` as JSX import source (not `"solid-js"`)
- Include DOM types for terminal rendering
- Preserve JSX for Bun to handle at runtime

---

## 🏛️ Current Architecture

### Go Backend (server/pkg/)

The Go backend uses **dependency injection** — no global state, no singleton patterns.

```
services.Container (DI wiring)
    ├── *docker.Client         # Docker container operations
    ├── *build.Service         # Docker build & test
    ├── *operations.Service    # Clone/checkout/run + executor
    ├── *git.Service           # Git repository operations
    ├── *gitlab.Client         # GitLab API
    ├── *github.Client         # GitHub API
    ├── *provider.Store        # Provider credential management
    ├── *resources.Manager     # Config dir, home dir, templates, env file
    ├── *logging.StatusLog     # Structured status logging
    ├── *logging.AppLogWriter  # Per-app log output
    └── *status.Manager        # Operation status broadcasting

Server struct
    ├── container  *services.Container
    ├── apps       []app.App
    └── infraSvcs  []app.InfraService
```

**Key design decisions:**
- `Server.Start()` registers all routes, starts SSE broadcaster, and launches pollers
- Handler files receive `*Server` and access services via `s.container.XXX`
- No facade layer — handlers call services directly
- All configuration from environment variables (`DEVENV_HOME`, `DEVENV_CONFIG_DIR`)

### TUI Frontend (tui/packages/)

The TUI follows a **unidirectional data flow** with factory-based state management:

```
app-opentui.tsx (orchestrator)
    │
    ├── createXxxStore()     → Signal bundles (reactive state)
    ├── createXxxActions()   → Business logic (receives stores + client)
    ├── useKeyboard()        → Single handler → sub-dispatchers by domain
    ├── <ContentRouter />    → View selection based on UI state
    └── <ModalOverlays />    → Conditional modal rendering
```

**Store pattern** (SolidJS signals as closures):
```typescript
// stores/app-store.ts
export function createAppStore() {
  const [apps, setApps] = createSignal<App[]>([]);
  const [selectedApp, setSelectedApp] = createSignal<App | null>(null);
  return { apps, setApps, selectedApp, setSelectedApp };
}
export type AppStore = ReturnType<typeof createAppStore>;
```

**Action pattern** (DI via function arguments):
```typescript
// actions/app-actions.ts
export function createAppActions(appStore: AppStore, client: DevEnvClient) {
  const refreshApps = async () => { /* ... */ };
  return { refreshApps };
}
```

**Keyboard constraint**: OpenTUI supports only ONE `useKeyboard` hook per app. The single handler dispatches to sub-functions:
```typescript
// keyboard/index.ts — single entry point
// keyboard/global-keys.ts, keyboard/table-keys.ts, etc. — sub-dispatchers
```

### Core Client (tui/packages/core/)

`DevEnvClient` is a lightweight facade (~122 lines) that delegates to 10 domain client modules:

```
DevEnvClient (facade)
    ├── apps-client.ts      → getApps(), getInfra(), getStatuses()
    ├── docker-client.ts    → startContainer(), stopContainer(), ...
    ├── git-client.ts       → pull(), push(), checkout(), ...
    ├── cr-client.ts        → getChangeRequests(), approveCR(), ...
    ├── ci-client.ts        → getPipelines(), getJobs(), retryJob(), ...
    ├── provider-client.ts  → getProviders(), createProvider(), ...
    ├── agent-client.ts     → getPiSessions(), ...
    ├── logs-client.ts      → getLogs(), analyzeWithAI(), ...
    ├── repos-client.ts     → searchRepos(), getBranches(), ...
    └── events-client.ts    → subscribeSSE(), healthCheck(), ...
```

Each domain module exports functions taking `ClientDeps` (base URL + fetch function) as the first argument.

### When Making Changes:
- ✅ **DO**: Follow the DI pattern — inject dependencies, don't import globals
- ✅ **DO**: Use factory functions for stores and actions
- ✅ **DO**: Split new handlers into the appropriate `handlers_*.go` file
- ✅ **DO**: Add new API methods to the relevant domain client module
- ✅ **DO**: Keep Go backend logic intact (Docker, Git, GitLab/GitHub operations)
- ❌ **DON'T**: Create global variables or singletons
- ❌ **DON'T**: Add API methods directly to `DevEnvClient` — use domain modules
- ❌ **DON'T**: Create additional `useKeyboard` hooks — add sub-dispatchers instead
- ❌ **DON'T**: Put business logic in views — use action factories

---

## 🤖 AI Features

The TUI provides pi-only AI features.

### Feature 1 — Log Analysis (`Shift+A` in the log modal)

1. Open any log view (container logs, operation logs, job logs).
2. Optionally enter visual mode (`v`) and select a range of lines.
3. Press `Shift+A`.
4. Type a prompt (or press `Enter` for the default).
5. DevEnv runs `pi --print --no-session --no-tools` and shows the analysis in the overlay.

### Feature 2 — Pi Session Launcher (`A` key → pi session view)

1. Press `A` from the main table to open the pi session view.
2. Existing pi sessions are listed by working directory.
3. Press `Enter` on an **existing session** to resume it with `pi`.
4. Press `Enter` on **+ New Session** to launch `pi` in the project root.

### Server Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/ai/analyze-logs-stream` | Stream pi log analysis. |
| `GET`  | `/api/pi-sessions` | List pi sessions grouped by CWD. Session `id` is the full `.jsonl` file path. |

### Requirements

- `pi` must be in `PATH`. If absent, the server returns HTTP 503 with `{"error":"pi not found in PATH"}` and the overlay shows an error.
- Pi sessions are read from `~/.pi/agent/sessions/`. If the directory does not exist, the pi sessions section is empty.
