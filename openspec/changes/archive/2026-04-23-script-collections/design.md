## Context

DevEnv already treats the config directory as the source of truth for user-managed resources such as app definitions, compose files, Dockerfiles, providers, agents, and templates. The main TUI table currently has three top-level tabs (applications, infrastructure, libraries) and keyboard-driven actions such as open in editor, open editor picker, logs, and app detail. There is no domain model for scripts today, so users must leave DevEnv to find, edit, and run their local automation helpers.

This change introduces a fourth config-backed resource type: scripts stored under `{configDir}/scripts/`. The structure must support both flat collections and arbitrarily nested folders, and the same list interaction model should work for browsing, editing, and running scripts.

## Goals / Non-Goals

**Goals:**
- Add a canonical scripts root under the config directory and discover supported script files recursively.
- Preserve folder hierarchy so the TUI can present a real tree instead of a flattened tag list.
- Add a Scripts tab to the main table that lets users browse folders and scripts with keyboard navigation.
- Allow script rows to be executed directly from the TUI with platform-appropriate interpreter selection.
- Reuse the existing open-in-editor actions so script rows can be edited without a special-case flow.
- Integrate script execution with existing status/log patterns so users get visible progress and output.

**Non-Goals:**
- Parameterized scripts, prompts, or per-script metadata files.
- Scheduling, background daemons, or automatic script execution.
- Inline script editing inside the TUI.
- Managing scripts stored outside the config directory.
- Supporting every shell type on day one; the initial scope is bash-compatible `.sh` scripts and PowerShell `.ps1` scripts.

## Decisions

### 1. Store scripts under `{configDir}/scripts/`

Scripts will follow the same externalized configuration pattern as compose files and templates. A dedicated root under the config directory keeps user-owned automation outside the repository, makes backup/sync straightforward, and allows variable folder depth naturally via the filesystem.

*Alternative considered:* storing scripts inside `DEVENV_HOME` or individual repositories. Rejected because the user explicitly wants config-backed collections and because repository-local scripts already exist independently of DevEnv.

### 2. Model folders and scripts as a tree, but render the table as a flattened visible row list

The backend should return a normalized tree that preserves directory hierarchy. The TUI will maintain expanded/collapsed folder state and derive a flattened row list for the existing table component. This keeps the transport format truthful to the domain while avoiding a new tree widget implementation.

*Alternative considered:* return only full relative paths and infer hierarchy in the client. Rejected because it makes folder rows, collapse state, and future features harder to reason about.

### 3. Add a dedicated `scripts` top-level tab instead of mixing scripts into Applications or Libraries

Scripts are a distinct resource type: they are config-backed files, not repositories or containers. A separate tab avoids overloading existing app semantics like branch, docker status, and repository path while still reusing the established list navigation patterns.

*Alternative considered:* place scripts under Libraries because they are local resources. Rejected because scripts have different actions and data columns.

### 4. Use explicit file-type-based execution with safe defaults

Execution will be chosen from the script extension: `.sh` runs through `bash`, `.ps1` runs through `pwsh` when available and falls back to `powershell` on Windows installations. The working directory will be the script's parent directory so relative paths within collections behave predictably.

*Alternative considered:* execute files directly based on executable bits or shebang detection. Rejected for the initial version because cross-platform behavior is less predictable and the supported formats are known.

### 5. Reuse existing editor actions by passing script file paths directly

The current `openInEditor` / `openInEditorWith` helpers already accept an explicit target path. Script rows should feed their absolute file path into those helpers, avoiding duplicate editor-launch logic and preserving existing user expectations for `e` and `E`.

*Alternative considered:* a script-specific editor workflow or modal. Rejected as unnecessary complexity.

### 6. Reuse operation logging/status infrastructure for script execution

Script runs should emit status updates and write output to log files using the same backend patterns already used for app operations. Even if scripts are not apps, users should see a familiar execution lifecycle and be able to inspect output consistently.

*Alternative considered:* fire-and-forget execution without structured status reporting. Rejected because script execution failures would be opaque and hard to debug.

## Risks / Trade-offs

- **Tree state adds UI complexity** → Expanded/collapsed folder state introduces a new list mode in the main table. Mitigation: keep the server payload simple and derive visible rows client-side.
- **Interpreter availability differs across platforms** → `bash`, `pwsh`, or `powershell` may not exist on every machine. Mitigation: validate interpreter availability before launch and return a user-facing error.
- **Executing arbitrary config scripts has security implications** → Scripts are inherently privileged local commands. Mitigation: execution is always explicit, scoped to user-owned config files, and never automatic.
- **Existing table columns are app-centric** → Branch/docker-oriented columns do not map to scripts. Mitigation: define a script-specific table column set when the Scripts tab is active.
- **Long-running scripts may not map perfectly to app operation semantics** → Scripts are one-shot tasks, not repository operations. Mitigation: model them as a separate operation type while reusing transport/logging primitives.

## Migration Plan

1. Introduce the new `scripts/` config directory convention and document it in `README.md`.
2. Add backend discovery and execution APIs without changing existing app endpoints.
3. Extend shared types and client modules to consume script data.
4. Add the Scripts tab and script-specific keyboard behavior in the TUI.
5. Roll back by removing the Scripts tab and endpoints; user script files remain untouched in the config directory.

## Open Questions

- Should the first version support folder collapse/expand controls, or is an always-expanded tree acceptable if visual indentation is preserved?
- Should script execution stream live output into the status log, or only write to per-run log files and completion messages?
- Do we want to support additional shell extensions later (for example `.bash`, `.command`, or `.psm1`) under the same capability?
