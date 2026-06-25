## Why

The current help system has two problems. First, keybind documentation is duplicated across 18 keyboard handler files and a 600-line `help-actions.ts` — descriptions drift from reality, and neither side is searchable. Second, only one guide exists (config-repository) despite the README thoroughly documenting app setup, scripts, worktrees, AI features, and integrations — none of it is accessible from the TUI.

## What Changes

- Add a centralized keybind registry (`keyboard/registry.ts`) that becomes the single source of truth for help documentation, status bar hints, and the search feature — without modifying existing keyboard handlers.
- Add search/filter to the existing `HelpView` so users can type to find keybinds across all contexts.
- Create 9 task-focused markdown guides covering every documented devenv workflow, extracted from the comprehensive README.
- Register all guides in the existing `guides/index.ts` registry.
- Surface guides in the TUI by adding a "Guides" section to the `HelpView` — selecting a guide opens it in the existing `MarkdownModal`.
- Add a dedicated `## Guides` section near the top of `README.md` linking each guide file with a 1-line description.

## Capabilities

### New Capabilities
- `keybind-registry`: Centralized data structure that documents all keyboard shortcuts per view context — consumed by help display, search, and status bar, derived from (not replacing) existing keyboard handlers.
- `searchable-help`: Full-text search across all keybinds via a live filter input in the `HelpView` component.
- `tui-guides`: Task-focused markdown guides accessible from the TUI via the `HelpView` and renderable in the existing `MarkdownModal`.

### Modified Capabilities
- *(none — no existing spec changes)*

## Impact

- `tui/packages/cli/src/tui/keyboard/registry.ts` — new file, ~150 lines
- `tui/packages/cli/src/tui/actions/help-actions.ts` — remove `getHelpContent()` and `getKeybinds()`, derive from registry. ~400 lines deleted.
- `tui/packages/ui/src/components/HelpView.tsx` — add search input, filter logic, guides section
- `tui/packages/cli/src/tui/guides/*.md` — 9 new markdown files, ~100 lines each
- `tui/packages/cli/src/tui/guides/index.ts` — extend with 9 new guide entries
- `README.md` — add `## Guides` section with links
- No changes to any keyboard handler file. No new dependencies.
