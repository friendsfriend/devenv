## Context

DevEnv already creates `createDefaultOpenTuiKeymap(renderer)` and wraps the Solid app in `KeymapProvider`, but keyboard behavior is still implemented through one `keymap.intercept("key", ...)` callback that manually invokes many handler modules in priority order. Help/footer keybinds are defined separately in `keyboard/registry.ts`, so implemented behavior and discoverable behavior can drift.

OpenTUI Keymap supports layered bindings, named commands, runtime data, metadata fields, active-key queries, Solid `useBindings()`, and OpenTUI-specific addons such as base-layout fallback. A full refactor should move DevEnv from manual dispatch to those primitives while preserving existing key behavior.

## Goals / Non-Goals

**Goals:**
- Replace the manual dispatcher chain with keymap layers and named commands.
- Preserve current key behavior across global actions, modals, tables, detail views, help, lists, and text-entry modes.
- Make help/footer keybind discovery derive from keymap metadata.
- Keep standard keybinds from the help menu; do not invent new shortcuts.
- Support `/` search, `F` filter, `O` sort/order behavior consistently where lists support them.
- Register base-layout fallback for keyboard-layout-stable shortcuts.
- Add tests that prove modal priority, active context switching, help/footer projection, and shutdown key suppression.

**Non-Goals:**
- Redesign keybindings or introduce a new shortcut scheme.
- Change server APIs or backend behavior.
- Rewrite every view component unrelated to keyboard ownership.
- Add plugin UI slots as part of this change.

## Decisions

### Use keymap layers as the source of truth

Each keyboard context becomes a keymap layer or layer group: global, shutdown guard, error dialog, confirm dialog, markdown modal, theme picker, provider modals, table, Kubernetes tab, details, issues, change requests, jobs, help, timeline, worktree manager, and text-entry modes. Layers use priority and runtime conditions rather than hand-coded handler order.

Alternatives considered:
- Keep intercept chain and add metadata mirror: lower risk, but preserves two sources of truth.
- Rewrite handlers into one giant layer: reduces interception but keeps poor modularity.

### Use named commands and adapters around existing actions

Commands should call existing action functions and store setters. Initial migration can wrap existing handler logic into commands in small slices, then remove old handlers after parity tests pass. Command names should be stable (`app.quit`, `help.open`, `table.search.open`, etc.) and include metadata for help/status rendering.

Alternatives considered:
- Inline binding handlers only: faster migration, but weakens command palette/help/query potential.
- Move all action logic into keymap files: mixes keyboard concerns with business logic.

### Drive activation from keymap runtime data

Synchronize runtime data such as `app.viewMode`, `app.activeTab`, `modal.active`, `textEntry.active`, `shutdown.active`, and focused panel/list state. Use `registerLayerFields()` / `registerBindingFields()` to gate layers declaratively.

Alternatives considered:
- Recreate layers reactively for every state change: Solid `useBindings()` supports this, but central runtime data is easier for cross-cutting context and query-based help.
- Keep imperative `if` guards inside each command: works, but active-key discovery would be inaccurate.

### Use Solid `useBindings()` for component-owned local lifetimes

App-wide bindings can be registered centrally during app setup. Component-specific or modal-specific bindings that depend on component lifetime/focus can use `useBindings()` in the owning Solid component.

Alternatives considered:
- Centralize every binding: simpler registry, but harder to clean up with modal/component lifecycle.
- Put every binding in components: fragments global priorities and makes tests harder.

### Replace static registry with metadata projection

Add metadata fields for context, category, description/title, footer label, and discoverability. Footer/help queries should use `getActiveKeys()`, `getCommands()`, or command binding projections filtered by current context. Existing `keyboard/registry.ts` can become a compatibility adapter during migration and be removed or reduced when metadata coverage is complete.

Alternatives considered:
- Keep static registry permanently: easy, but drift persists.
- Generate keymap layers from static registry: registry lacks enough execution/activation data.

### Migrate incrementally with parity tests

Refactor in slices: global/shutdown first, modals next, table/list controls, detail views, then help/footer registry. Each slice should have tests proving old behavior remains reachable and inactive contexts do not handle keys.

Alternatives considered:
- Big-bang replacement: faster final shape, high regression risk.

## Risks / Trade-offs

- Large keyboard surface regression risk → Use slice-by-slice migration with parity tests before removing old handlers.
- Help/footer queries may initially miss metadata → Keep compatibility adapter until metadata coverage is complete.
- Runtime state sync bugs could hide active keys → Add tests for state transitions and active-key projections.
- Modal priority mistakes can trigger destructive background actions → Put modal/text-entry/shutdown layers at explicit high priorities and test conflicts.
- Keymap API learning curve → Keep small helper builders for command metadata and layer activation fields.

## Migration Plan

1. Add keymap addon setup: base-layout fallback, app-specific metadata fields, app-specific activation fields.
2. Add runtime-state synchronization from stores to keymap data.
3. Create command/layer helper types and metadata conventions.
4. Migrate global actions and shutdown guard.
5. Migrate modal/text-entry layers by priority.
6. Migrate table/list controls and standard `/`, `F`, `O` bindings.
7. Migrate detail/list view handlers context by context.
8. Replace help/footer static registry reads with keymap metadata projection.
9. Remove obsolete manual dispatcher and unused handler code.
10. Run full tests and manual smoke test common contexts.

## Open Questions

- Whether every binding should be centrally registered or some modal/view bindings should move into UI components with `useBindings()`.
- Exact metadata schema for footer label versus full help description.
- Whether command palette support should be added later using the same command metadata.
- How much of the old registry should remain as fallback during the migration branch.
