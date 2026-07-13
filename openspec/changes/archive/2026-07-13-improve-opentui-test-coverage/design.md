## Context

Current TUI tests primarily exercise pure functions and manually invoked keyboard handlers. The suite has minimal renderer-backed coverage: `progress-splash.test.tsx` uses `@opentui/solid` `testRender()`, but most shared components, modals, lists, keyboard routing, styling, and resize behavior are not tested through OpenTUI's renderer. OpenTUI's testing docs recommend memory renderers, frame capture, span capture, input/mouse simulation, resize, and visual settling helpers.

Recent issues show why this matters: orphan text nodes in shared chrome were only discovered while adding a render test, shutdown behavior required realistic lifecycle assumptions, and keyboard coverage currently bypasses the renderer/keymap path.

## Goals / Non-Goals

**Goals:**
- Add reusable OpenTUI/Solid test helpers that make renderer-backed tests easy and safe.
- Cover shared chrome (`SearchHeader`, `FilterStatusBar`, modal shell), lifecycle overlays, and representative lists/modals.
- Add input simulation tests for critical keyboard flows instead of only direct handler calls.
- Add styled-span assertions for semantic color/highlight behavior.
- Add resize/narrow-width tests for layouts most likely to regress.
- Document a coverage checklist for future TUI changes.

**Non-Goals:**
- Achieve exhaustive snapshot coverage for every TUI view in one change.
- Replace all pure unit tests with renderer tests.
- Introduce brittle full-screen golden snapshots for every frame.
- Change production UI behavior.

## Decisions

### Create shared test helpers

Add helpers around `@opentui/solid` `testRender()` and/or `@opentui/core/testing` `createTestRenderer()` to standardize setup, cleanup, frame capture, span capture, input, resize, and visual idle waits. Helpers should hide common teardown patterns and support both UI package components and CLI TUI components.

Alternatives considered:
- Inline renderer setup in each test: quick initially, but repetitive and leak-prone.
- Only use pure unit tests: insufficient for OpenTUI layout and rendering behavior.

### Prefer targeted frame assertions over broad snapshots

Use `captureCharFrame()` for expected text and layout markers, and keep snapshots limited to small pure output helpers or stable components. Avoid large brittle golden snapshots for entire app screens.

Alternatives considered:
- Snapshot every rendered frame: high maintenance and noisy diffs.
- Assert only no-throw: too weak to catch regressions.

### Use `captureSpans()` for semantic styling

Tests that verify status rows, highlights, badges, and selected/current states should inspect styled spans rather than hardcoding palette hex values. Assertions should focus on semantic role and presence of styling, in line with project color rules.

Alternatives considered:
- Assert raw ANSI output: brittle and not available through memory frame tests.
- Ignore styling in tests: misses important shared-component regressions.

### Exercise real input paths where possible

For critical keyboard flows, tests should use OpenTUI/keymap input simulation (`mockInput` when using `createTestRenderer`, or equivalent Solid/keymap helpers) so event normalization, keymap intercepts/layers, and focus behavior are covered. Direct handler tests can remain for pure edge cases.

Alternatives considered:
- Continue calling handlers directly: easier but bypasses OpenTUI/keymap behavior.
- Only manual smoke testing: not reliable for regressions.

### Build coverage in layers

Start with shared test utilities and high-value components/flows. Then add focused tests to features as they change. The coverage checklist prevents future OpenTUI features from adding only helper tests.

Alternatives considered:
- Big-bang full app render harness first: high setup cost and may block incremental value.

## Risks / Trade-offs

- Renderer tests can be slower → Keep tests targeted and use memory renderer helpers.
- Frame assertions can be brittle → Assert stable text/structure, not exact full frames unless necessary.
- Styled span API can change → Centralize span assertions in helper utilities.
- Full app state setup can be complex → Start with shared components and small view slices, then expand.
- Input simulation may require keymap refactor coordination → Add tests that work with current intercept path first, then adapt to keymap layers.

## Migration Plan

1. Add shared renderer test utility module with cleanup-safe helpers.
2. Convert existing splash render tests to use the shared helper.
3. Add shared chrome render tests for `SearchHeader`, `FilterStatusBar`, and `GenericModal` usage.
4. Add styled-span tests for highlight/badge/status-row semantics.
5. Add input simulation coverage for quit/shutdown and one modal priority flow.
6. Add responsive render tests for representative narrow/wide view slices.
7. Document the TUI coverage checklist in project docs or test README.
8. Keep pure unit tests for logic utilities and add renderer tests only where rendering/input/layout matters.

## Open Questions

- Best location for shared helpers: `tui/packages/ui/src/test-utils`, `tui/packages/cli/src/tui/test-utils`, or both.
- Whether to use `@opentui/solid` `testRender()` exclusively or mix with `@opentui/core/testing` for lower-level input tests.
- Minimum representative view set for first coverage baseline.
