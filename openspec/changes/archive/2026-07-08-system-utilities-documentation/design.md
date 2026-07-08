## Context

The existing guide system uses markdown files in `tui/packages/cli/src/tui/guides/` registered in `index.ts`. Each guide has a `key`, `title`, `description`, `category`, and lazy import function. Guides are accessible from the Help view (`?` → Guides tab).

Current guides cover: config repository, container runtime, kubernetes runtime, choosing a runtime, adding repos/tasks/infrastructure/libraries, worktrees, AI features, git integrations, log viewer, finding logs.

## Goals / Non-Goals

**Goals:**
- Document all system utilities DevEnv uses or can use
- Categorize as required vs optional
- Include installation commands for macOS (brew) and Linux (apt/yum/brew)
- Make the guide discoverable from Help view

**Non-Goals:**
- Auto-detecting installed utilities at startup (could be a future feature)
- Managing utility versions or updates
- Installing utilities automatically

## Decisions

### 1. Single guide file covering all utilities

One comprehensive `system-utilities.md` rather than separate per-tool guides. Keeps the guide list manageable and makes it easy to see the full picture.

### 2. Categorization: Required / Optional (Enhanced) / Optional (Advanced)

- **Required:** git, docker/podman, bun
- **Optional (Enhanced):** lazygit, lazydocker, pi — improves TUI experience
- **Optional (Advanced):** kubectl, helm, kind, k9s, worktrunk, ssh — for specific workflows

### 3. Add startup detection log

On TUI startup, detect which optional utilities are available and log to status. Not blocking — purely informational.

## Risks / Trade-offs

- **[Trade-off] No auto-install** → Users must install manually; acceptable since tools have different install mechanisms
- **[Trade-off] Single guide may be long** → Acceptable; users can search within it
