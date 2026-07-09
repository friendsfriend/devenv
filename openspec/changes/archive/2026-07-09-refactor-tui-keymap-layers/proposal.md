## Why

DevEnv currently creates an OpenTUI keymap but routes nearly all keyboard input through one manual intercept chain and a separate static help registry. This duplicates OpenTUI Keymap functionality, makes active key discovery drift-prone, and makes modal/view priority behavior harder to reason about as the TUI grows.

## What Changes

- Replace the manual global keyboard dispatcher chain with OpenTUI Keymap layers and named commands.
- Model global, modal, table, detail, list, and help contexts as keymap layers with priorities and runtime activation.
- Move keybind metadata into keymap command/binding metadata so help and footer hints can be derived from active keymap state.
- Use Solid `useBindings()` where component/view lifetime should own bindings, and centralized registration for app-wide bindings.
- Preserve current key behavior and standard shortcuts (`/`, `F`, `O`, `?`, `q`, `Ctrl+C`, navigation keys) unless explicitly documented.
- Add base-layout fallback for keyboard-layout-stable shortcuts where supported.
- Add tests for layer activation, modal priority, help/footer projection, and parity with current key handlers.

## Capabilities

### New Capabilities
- `keymap-layer-routing`: OpenTUI Keymap layers, commands, metadata, and runtime state drive TUI keyboard routing and discoverability.

### Modified Capabilities
- `keybind-registry`: Keybind help/footer entries are derived from keymap command/binding metadata rather than a separate static registry, while preserving required entries and contexts.

## Impact

- TUI keyboard modules under `tui/packages/cli/src/tui/keyboard/*`.
- TUI app bootstrap in `app-opentui.tsx` and Solid `KeymapProvider` usage.
- Help/footer keybind rendering and search in `help-actions.ts`, `registry.ts`, `StatusBar`, and `HelpView` integration.
- Tests for keyboard routing, modal priority, and keybind discovery.
- No server API changes expected.
