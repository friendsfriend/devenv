## 1. Keybind Registry — Data Layer

- [x] 1.1 Create `tui/packages/cli/src/tui/keyboard/registry.ts` with `KeybindDef` type and `KEYBINDS` constant
- [x] 1.2 Populate registry with all keybinds from the `table` view context (navigation, actions, docker, git, build, scripts, general)
- [x] 1.3 Populate registry with all keybinds from `mergeRequests`, `mergeRequestDetail`, `jobs`, `testResults`, `changedFiles`, `discussionsView` contexts
- [x] 1.4 Populate registry with all keybinds from `appDetail`, `providers`, `issues`, `issueDetail`, `agentView`, `sshPicker` contexts
- [x] 1.5 Populate registry with all keybinds from modal contexts (logModal with search/visual/normal modes, passphraseModal, branchSelector, createBranchModal, etc.)

## 2. Registry Consumption — Refactor help-actions.ts

- [x] 2.1 Remove `getHelpContent()` hardcoded if/else chain; replace with functions that filter/group `KEYBINDS` by context and category
- [x] 2.2 Remove `getKeybinds()` hardcoded if/else chain; replace with context-filtered lookup from `KEYBINDS`
- [x] 2.3 Delete ~400 lines of duplicated keybind descriptions from `help-actions.ts`

## 3. Searchable Help View

- [x] 3.1 Add a text search input to `HelpView.tsx` at the top of the content area
- [x] 3.2 Implement live client-side filtering of displayed sections by matching against keys, description, and category fields
- [x] 3.3 Show empty state message when no keybinds match the search
- [x] 3.4 Add context-scope toggle (current context only vs all contexts) with visual indicator
- [x] 3.5 Handle Escape key in search input to clear filter

## 4. Guide Content — Markdown Files

- [x] 4.1 Create `tui/packages/cli/src/tui/guides/adding-apps.md` — app definition JSON, Dockerfile build/test, compose with profiles, infra linking
- [x] 4.2 Create `tui/packages/cli/src/tui/guides/adding-scripts.md` — discovery, `--devenv-metadata` convention, parameter types with examples
- [x] 4.3 Create `tui/packages/cli/src/tui/guides/adding-infrastructure.md` — infra definition JSON, compose placement, sharing infra between apps
- [x] 4.4 Create `tui/packages/cli/src/tui/guides/adding-libraries.md` — lib definitions, `appType: "LIB"`, build/test Dockerfiles
- [x] 4.5 Create `tui/packages/cli/src/tui/guides/using-worktrees.md` — single-checkout vs worktrees, worktrunk, directory layout, IDE setup
- [x] 4.6 Create `tui/packages/cli/src/tui/guides/using-ai-features.md` — AI agent view, sessions, pi agent integration
- [x] 4.7 Create `tui/packages/cli/src/tui/guides/using-git-integrations.md` — providers, MR/PR browsing, diff, discussions, approvals, AI review, pipelines, test results
- [x] 4.8 Create `tui/packages/cli/src/tui/guides/using-log-viewer.md` — container/operation logs, search, visual mode, keyboard shortcuts
- [x] 4.9 Create `tui/packages/cli/src/tui/guides/finding-logs.md` — log directory structure, status log format, per-app logs, server log location

## 5. Guide Registry and TUI Surface

- [x] 5.1 Register all 9 new guides in `tui/packages/cli/src/tui/guides/index.ts` with key, title, description, and lazy import
- [x] 5.2 Add "Guides" section to `HelpView.tsx` listing all guides by title and description
- [x] 5.3 Wire guide selection to open the selected guide content in `MarkdownModal`
- [x] 5.4 Add navigation through guide list in HelpView (j/k to select, Enter to open)

## 6. README Documentation

- [x] 6.1 Add `## Guides` section near the top of `README.md` with links to all 9 guide files and one-line descriptions

## 7. Verification

- [x] 7.1 Run TUI type-check (`bun run type-check`)
- [x] 7.2 Run Go tests (`cd server && go test ./...`)
- [x] 7.3 Run the full test suite before finishing (type-check + Go tests passed)
- [x] 7.4 Check pi-lens issues if available before finishing (none found)
