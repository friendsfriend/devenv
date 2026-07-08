# Feature Ideas

Planned features for the DevEnv TUI. Each entry includes scope, affected files, and implementation notes.

---

## 1. Dependency Graph Tree View

**What:** Show the dependency tree for the selected app in the `AppDetailView`. Display which infrastructure services and other apps the current app depends on, recursively.

**Where:** Tree view inside `AppDetailView` component, alongside the existing overview/stats/logs panels.

**Data source:** `ActionTarget.requires` already carries `DependencyRef[]` per run target. The server-side `TargetRegistry.ResolveStartPlan` resolves the full dependency graph. TUI needs to call the existing action targets API and render the tree.

**Implementation:**
- `tui/packages/types/src/index.ts` — `DependencyRef` type already exists (`{ app?: string; infra?: string; runtime?: string; profile?: string }`)
- `tui/packages/core/src/apps-client.ts` — ensure `DiscoverActionTargets` response is exposed
- `tui/packages/ui/src/components/AppDetailView.tsx` — add a `DependencyTreeView` section below the overview panel. Render tree nodes with:
  - App deps: show app name, runtime, profile, running/stopped status
  - Infra deps: show service name, type (docker/script/kubernetes), running/stopped status
  - Recursive expansion for app→app deps
- `tui/packages/ui/src/components/DependencyTreeView.tsx` — new component. Tree-style layout using indent levels. Each node shows: icon (📦 app / 🗄️ infra), name, runtime label, status badge (green=running, red=stopped, yellow=unknown)
- Keyboard: `d` on app detail view opens/scrolls to dependency tree

**Status:** _Planned_

---

## 2. Missing .env Variable Warning

**What:** When starting an app, check if any `${VAR}` placeholders in compose files, provider JSON, or templates reference variables that are not set in `.env`. Show a warning notification listing the missing variables.

**Where:** Server-side during startup, with notification surfaced in TUI.

**Data source:** `pkg/resources/envfile.go` loads `.env` and performs substitution. Missing vars are silently left as-is today.

**Implementation:**
- `server/pkg/resources/envfile.go` — add `SubstituteVarsWithWarnings(s string, vars map[string]string) (string, []string)` that returns both the substituted string and a list of unresolved variable names
- `server/pkg/build/` or `server/pkg/operations/` — call the warning variant during compose resolution and log missing vars
- `server/pkg/server/handlers.go` — expose missing vars in the SSE status event or a new field in app status
- `tui/packages/cli/src/tui/actions/docker-actions.ts` — on app start, check for missing vars in the response and trigger `uiStore.setNotification("Missing env vars: FOO, BAR", "warning")`
- `tui/packages/types/src/index.ts` — add `missingEnvVars?: string[]` to `AppStatus` or a new response type

**Status:** _Planned_

---

## 3. Task Execution History in Status Log

**What:** Show recent task/script execution results in the status log. When a task finishes, append a status log entry with: task name, args used, success/failure, duration, timestamp.

**Where:** Status log view (bottom strip of main table view). Entries flow through the existing `StatusLogEntry` system.

**Data source:** Task execution happens in `tui/packages/cli/src/tui/actions/docker-actions.ts` (shell script runs) and `tui/packages/core/src/scripts-client.ts`. Server-side script execution via `/api/scripts/run`.

**Implementation:**
- `tui/packages/core/src/scripts-client.ts` — on script completion, emit a status log entry
- `tui/packages/cli/src/tui/stores/app-store.ts` — `StatusLogEntry` type may need a `source` field to distinguish task entries from operation entries
- Already integrated: status log entries appear in `StatusLogView` at the bottom of the table. Task entries just need to be pushed into `appStore.setStatusLogEntries()` after each run completes.

**Status:** _Planned_

---

## 4. Compose File Editor with Profile Picker

**What:** Edit compose files directly from the TUI. Open a profile picker showing existing profiles for the selected app, plus a "Create new profile" option. Then open the compose file in the user's editor.

**Where:** New modal flow triggered from the app detail view or the main table.

**Data source:** Compose files live at `~/.config/devenv/apps/compose/{appIdent}-{profile}-compose.yml`. Profile discovery already scans for matching filenames.

**Implementation:**
- `tui/packages/ui/src/components/ComposeProfilePicker.tsx` — new component. List existing profiles discovered from compose filenames. Options: each profile name, "Default (no profile)", "+ New profile". Selecting one opens the file in editor. Selecting "+ New profile" prompts for name, creates the file, then opens editor.
- `tui/packages/cli/src/tui/stores/ui-store.ts` — add signals: `showComposeProfilePicker`, `composeProfilePickerProfiles`, `composeProfilePickerAppIdent`, `composeProfilePickerSelectedIndex`
- `tui/packages/cli/src/tui/keyboard/` — new keybind file for compose profile picker
- `tui/packages/core/src/apps-client.ts` — new API endpoint or reuse existing profile discovery logic
- `server/pkg/server/handlers.go` — `GET /api/apps/{ident}/compose-profiles` returns discovered profiles and their file paths
- Keyboard shortcut: `E` on app in table view opens compose profile picker

**Status:** _Planned_

---

## 5. Provider Health Check

**What:** Validate that provider tokens are still valid by hitting the GitHub/GitLab API. Show a health status indicator in the providers view and notify on failure.

**Where:** Providers view (`c` key) and startup sequence.

**Data source:** Provider credentials are in `~/.config/devenv/providers/` with `${VAR}` placeholders backed by `.env`.

**Implementation:**
- `server/pkg/github/` and `server/pkg/gitlab/` — add `ValidateCredentials(provider) error` methods that make a lightweight API call (e.g., `GET /user` for GitHub, `GET /api/v4/user` for GitLab)
- `server/pkg/server/handlers.go` — `POST /api/providers/{name}/validate` endpoint
- `tui/packages/core/src/provider-client.ts` — `validateProvider(name: string): Promise<{ valid: boolean; error?: string }>`
- `tui/packages/ui/src/components/ProvidersView.tsx` — add status column: ✅ valid / ❌ invalid / ⏳ checking. `v` key triggers validation on selected provider.
- `tui/packages/cli/src/tui/actions/provider-actions.ts` — `validateProvider` action that calls API and updates provider status in store
- Startup: validate all providers in background, show notification for any failures

**Status:** _Planned_

---

## 6. Cross-App Log Aggregation

**What:** Unified log stream across all running containers/apps. Search and filter across multiple apps simultaneously.

**Where:** New view accessible from the main table or a keyboard shortcut.

**Data source:** Per-app container logs are already fetched via Docker API. The log viewer (`l` key) shows single-app logs.

**Implementation:**
- `server/pkg/docker/` — add `StreamLogsAllContainers(ctx, filter)` that multiplexes Docker log streams from all running containers, tagging each line with the container/app name
- `server/pkg/server/handlers.go` — `GET /api/logs/stream` SSE endpoint that streams from all containers with app name prefix
- `tui/packages/core/src/logs-client.ts` — `streamAllLogs()` method
- `tui/packages/ui/src/components/AggregatedLogView.tsx` — new component. Renders a unified log with: app name prefix (colored per app), search (`/`), filter by app (`F`), follow mode. Reuse `LogView` internals but with multi-source merge.
- `tui/packages/cli/src/tui/stores/log-store.ts` — new signals for aggregated log state
- Keyboard shortcut: `L` (capital) opens aggregated log view

**Status:** _Planned_

---

## 7. Recursive Startup with Dependency Health Checks

**What:** When starting an app, automatically start its dependencies first (recursive), and wait for each dependency to be healthy before starting the dependent app. This is already partially implemented server-side via `TargetRegistry.ResolveStartPlan`.

**Where:** Server-side startup orchestration, TUI status feedback.

**Data source:** `DependencyRef` in `ActionTarget.requires`, `TargetRegistry.ResolveStartPlan` computes the start order.

**Implementation:**
- `server/pkg/operations/executor.go` — the executor already resolves the start plan. Add health-check polling: after starting each dependency, poll its status (Docker container health, or simple `docker inspect`) until healthy or timeout.
- `server/pkg/docker/` — add `WaitForHealthy(ctx, containerName, timeout) error` that polls container health status
- `server/pkg/server/handlers.go` — expose dependency start progress via SSE: `{ type: "dependency.starting", app: "postgres", status: "healthy" }`
- `tui/packages/cli/src/tui/stores/app-store.ts` — handle dependency progress SSE events, show per-app status updates in the table (e.g., "⏳ Starting dependency: postgres...")
- `tui/packages/ui/src/components/RepositoryTable.tsx` — render dependency startup state in the status column

**Status:** _Planned_

---

## 8. Port Conflict Detection on App Start

**What:** Before starting an app, check if any of its declared ports are already in use by another container. Show an error/warning notification with the conflicting port and the app using it.

**Where:** Server-side pre-start check, TUI notification.

**Data source:** Docker API can list all container port bindings. App compose files declare port mappings.

**Implementation:**
- `server/pkg/docker/` — add `CheckPortConflicts(ports []string) ([]PortConflict, error)` that queries all running containers' port bindings and compares against the requested ports
- `server/pkg/build/` or `server/pkg/operations/` — call port check before `docker compose up`, abort or warn if conflicts found
- `server/pkg/server/handlers.go` — include port conflict info in the start response or SSE event
- `tui/packages/cli/src/tui/actions/docker-actions.ts` — on start response with conflicts, show `uiStore.showError("Port Conflict", "Port 5432 is already used by postgres")` or `setNotification(..., "warning")`
- `tui/packages/types/src/index.ts` — add `portConflicts?: Array<{ port: string; usedBy: string }>` to start response

**Status:** _Planned_

---

## 9. System Utilities Documentation

**What:** Document required and optional system utilities (lazygit, lazydocker, pi, ssh, kubectl, helm, kind, k9s, worktrunk) in the help/guides section. Include installation instructions and how each tool integrates with DevEnv.

**Where:** Help view guides, README, and in-TUI help.

**Implementation:**
- `tui/packages/cli/src/tui/guides/system-utilities.md` — new guide covering:
  - **Required:** git, docker/podman, bun
  - **Optional (enhanced experience):** lazygit, lazydocker, pi, ssh, kubectl, helm, kind, k9s, worktrunk
  - For each: what it does, how DevEnv uses it, installation command
- `tui/packages/cli/src/tui/guides/index.ts` — register the new guide
- `README.md` — add "System Utilities" section under Requirements
- Startup check: on TUI launch, detect which optional utilities are available and log status (no blocking, just informational)

**Status:** _Planned_

---

## Summary

| # | Feature | Complexity | Server | TUI |
|---|---------|-----------|--------|-----|
| 1 | Dependency Graph Tree View | Medium | — | AppDetailView + new component |
| 2 | Missing .env Variable Warning | Medium | envfile.go + handlers | notification on start |
| 3 | Task Execution History in Status Log | Low | — | status log entries |
| 4 | Compose File Editor with Profile Picker | Medium | new endpoint | new modal + keybinds |
| 5 | Provider Health Check | Medium | validate endpoint | providers view |
| 6 | Cross-App Log Aggregation | High | multi-stream SSE | new view + store |
| 7 | Recursive Startup with Health Checks | High | health poll + SSE | status feedback |
| 8 | Port Conflict Detection | Medium | docker inspect | notification |
| 9 | System Utilities Documentation | Low | — | guide + README |
