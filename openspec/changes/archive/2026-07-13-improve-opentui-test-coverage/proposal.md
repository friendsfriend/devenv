## Why

DevEnv's TUI test coverage is mostly pure helper tests and a single Solid render test, while most OpenTUI behavior depends on rendering, styling, input, focus, and resize interactions. Recent regressions around orphan text nodes, shutdown lifecycle, and terminal escape handling show the current tests are not close to the coverage needed for a complex terminal UI.

## What Changes

- Add shared OpenTUI/Solid test utilities built around memory renderers, frame capture, span capture, resize, and mock input.
- Add rendering tests for common UI chrome, modals, list headers/status bars, and lifecycle splash overlays.
- Add interaction tests that drive real OpenTUI/keymap input flows instead of only calling handler functions directly.
- Add semantic styling tests using `captureSpans()` for highlights, badges, and status rows.
- Add responsive layout tests for narrow/wide terminal dimensions and wrapped content.
- Define a baseline coverage checklist for future TUI features.

## Capabilities

### New Capabilities
- `opentui-test-coverage`: OpenTUI-backed rendering, styling, input, and layout tests cover critical TUI behavior.

### Modified Capabilities

## Impact

- Test utilities under `tui/packages/cli/src/tui` and/or `tui/packages/ui/src/test-utils`.
- New tests for UI components, content router states, modals, key flows, and shutdown/startup overlays.
- Existing tests may be refactored to use shared helpers.
- CI/test runtime may increase modestly due to renderer-based tests.
- No production behavior changes expected.
