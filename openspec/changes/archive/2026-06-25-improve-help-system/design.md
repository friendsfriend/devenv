## Context

The TUI has 18 keyboard handler files (`tui/packages/cli/src/tui/keyboard/`) that each define their own keybind logic via if/else chains. Help content for those keybinds lives separately in `help-actions.ts` as two large functions: `getHelpContent()` (~300 lines) and `getKeybinds()` (~200 lines). This duplication means every feature that adds keybinds must update at least two files, and drift between what handlers accept and what help documents is invisible.

Guides are currently a flat array in `guides/index.ts` with lazy-loaded markdown. Only one guide exists (`config-repository`). The rendering path (MarkdownModal) already works — it uses OpenTUI's `<markdown>` component and supports scrolling.

The README (`README.md`, ~30KB) already documents all workflow topics (app setup, scripts, worktrees, infra, libraries, AI, integrations, logs) thoroughly. Guides should extract and re-cast this content as task-focused walkthroughs, not rewrite from scratch.

## Goals / Non-Goals

**Goals:**

- Eliminate keybind documentation duplication by creating a single data registry.
- Make all keybinds searchable/filterable from the TUI help view.
- Make 9 workflow guides accessible from the TUI.
- Link guides from README.md for discoverability outside the TUI.
- Keep existing keyboard handlers working without modification.

**Non-Goals:**

- No refactoring of keyboard handler dispatch logic. The registry is docs-only — it describes what handlers do, it doesn't drive them.
- No interactive wizards. Guides are rendered markdown, not stepped UI flows.
- No guide search within the TUI (guides are listed by title; keybind search is separate). Add guide search when guide count exceeds ~20.
- No changes to the existing config-repository guide content.

## Decisions

### Decision: Keybind registry as a flat exported array, not a class or service

`registry.ts` exports a `const KEYBINDS: KeybindDef[]` with typed entries. Each entry carries `keys`, `description`, `context` (view name), and `category` (grouping label).

Rationale: a flat array is trivial to query (filter, map, group), trivial to extend, and requires no DI or initialization. The help view and status bar both consume it with simple array methods.

Alternatives considered: registry as a Map keyed by context — rejected because flat arrays compose better for cross-context search.

### Decision: Registry context values match `appStore.viewMode()` values

Each `KeybindDef.context` uses the same string values that `appStore.viewMode()` returns (`"table"`, `"mergeRequestDetail"`, `"logs"`, etc.). This lets the help view default to the current context with zero mapping.

Rationale: eliminates a translation layer. If a new view mode is added, its keybinds slot in by using the same string.

### Decision: Search implemented as a client-side filter input in HelpView

A text input at the top of HelpView filters the displayed sections in real-time. Matching checks keys and description fields.

Rationale: no server changes, no new state. The dataset is small (~100 keybinds max), so client-side filtering is instant. Works offline.

Alternatives considered: fzf-like fuzzy finder overlay — rejected as over-engineering for the dataset size. Plain substring/word matching is sufficient.

### Decision: Guides are task-focused markdown extracted from README

Each guide covers exactly one task (e.g., "adding an app") and is 50-150 lines of markdown. Content is extracted (not copied verbatim) from the relevant README section(s), recast as a walkthrough with numbered steps. Each guide links back to the README for full detail.

Rationale: the README is the comprehensive reference. Guides are the quick-start for each task. Maintaining both as independent full documents would double content maintenance.

### Decision: Guides surfaced in the existing HelpView, not a new guide browser

A "Guides" section at the bottom of HelpView lists all guides as selectable items. Selecting one opens MarkdownModal.

Rationale: avoids a new modal, a new keybind, and a new navigation path. HelpView is already the place users go for "how do I use this thing?". Adding guides there keeps discovery simple.

Alternatives considered: dedicated `g` keybind to open guide list — rejected because it adds a keybind for something HelpView already covers. Per-guide keybinds — rejected because 9 keybinds pollute the namespace.

### Decision: Guides are plain markdown files with lazy imports, unchanged from current pattern

The existing `Guide` interface (`key`, `title`, `description`, `import()`) and flat array registry are unchanged. New guides follow the exact same pattern.

Rationale: the existing pattern works. Changing it is scope creep.

## Risks / Trade-offs

- **Registry drift** — The registry is manually maintained against handler files. No automated check ensures every registered keybind has a handler or every handler keybind is registered. → Mitigation: the help view will visibly miss keybinds if they aren't registered. The improvement over today is that there's ONE place to add them, not two.
- **Guide content staleness** — README may evolve without guide updates. → Mitigation: guides link to README sections so users can always find the latest detail. A future automated check could verify README anchors exist.
- **HelpView search across non-current contexts may surprise users** — Searching while in "table" mode shows keybinds for all views, not just table. → Mitigation: search results are grouped by context with visible headings. The user sees "Navigation" / "Merge Request Detail" / etc. as section headers.
