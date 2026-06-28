# OpenTUI Guide

Use this when changing OpenTUI components, layouts, key handling, plugins, or bindings. Source docs: <https://opentui.com/docs/getting-started/> and linked OpenTUI docs.

## What OpenTUI is

OpenTUI is terminal UI toolkit with native Zig core and TypeScript bindings. It exposes component/renderable primitives, Yoga flexbox layout, keyboard/focus handling, tree-sitter code rendering, animations/timelines, React/Solid bindings, plugins, and keymap helpers.

Minimal core app:

```ts
import { createCliRenderer, Text } from "@opentui/core"

const renderer = await createCliRenderer()
renderer.root.add(Text({ content: "Hello", fg: "#00ff00" }))
```

## Core concepts

### Renderer

`createCliRenderer()` owns terminal lifecycle, root renderable tree, input loop, screen diffing, and cleanup. Add renderables to `renderer.root`. Keep one renderer per TUI process. Clean up on exit so terminal state restores.

Common rules:
- Do not write directly to stdout for app logs while renderer owns terminal; use console overlay/logger support.
- Batch UI changes when possible; avoid unnecessary recreate/remove churn.
- Treat `renderer.root` as top-level layout container.
- Prefer component props/style over manual cursor drawing.

Docs: <https://opentui.com/docs/core-concepts/renderer/>

### Renderables

Renderables are low-level visual nodes. They have layout/style/visibility, can contain children, and participate in rendering. Use built-in renderables/components first (`Box`, `Text`, `Input`, etc.). Create custom renderables only when built-ins cannot express needed drawing.

Docs: <https://opentui.com/docs/core-concepts/renderables/>

### Constructs

Constructs are higher-level objects that compose renderables and behavior. Use constructs for reusable UI behavior, not for one-off wrappers.

Docs: <https://opentui.com/docs/core-concepts/constructs/>

### Renderables vs Constructs

Use renderables for direct visual elements. Use constructs when you need orchestration, lifecycle, event handling, or composition around multiple renderables. Do not add construct abstraction for one static element.

Docs: <https://opentui.com/docs/core-concepts/renderables-vs-constructs/>

### Layout system

OpenTUI uses Yoga/flexbox-like layout. Styles support width/height, percentages, flex grow/shrink, direction, gap, alignment, padding, margins, position, borders/backgrounds where supported.

Rules:
- Prefer flex layout over manual x/y positioning.
- `%` sizes are relative to parent.
- `flexGrow` fills remaining space.
- Keep modal/content width tied to usable viewport width.
- For `<scrollbox>`, do **not** set `flexDirection`; scrollbox manages internal layout/scrollbar.

Docs: <https://opentui.com/docs/core-concepts/layout/>

### Keyboard input

OpenTUI provides keyboard events, focus management, and key handling. Reuse standard app/help keybinds. Do not invent shortcuts if help menu already defines a convention.

Rules:
- Route input through focused component where possible.
- Keep global handlers minimal (`Escape`, quit, help).
- Normalize modifiers instead of string-matching many variants when keymap helpers exist.

Docs: <https://opentui.com/docs/core-concepts/keyboard/>

### Lifecycle and cleanup

Renderer and components may allocate terminal state, native resources, subscriptions, timers, and listeners. Dispose/cleanup on process exit, component unmount, and tests.

Rules:
- Remove event listeners/subscriptions you add.
- Clear intervals/timeouts.
- Restore terminal state on exit paths.

Docs: <https://opentui.com/docs/core-concepts/lifecycle/>

### Colors

OpenTUI accepts color values including named/hex-style values depending on API. Prefer existing theme tokens from codebase over hardcoded colors. Use accessible contrast.

Docs: <https://opentui.com/docs/core-concepts/colors/> and <https://opentui.com/docs/reference/color-matrix/>

### Console overlay

Use console overlay/log facilities for debugging inside renderer-driven terminal apps instead of raw stdout/stderr that can corrupt UI.

Docs: <https://opentui.com/docs/core-concepts/console/>

### Notifications

Use built-in notification support for transient messages. Keep notifications short and non-blocking; use modal/dialog only for required decisions.

Docs: <https://opentui.com/docs/core-concepts/notifications/>

### Native audio

OpenTUI has native audio support. Keep optional; do not make core flows depend on sound. Provide mute/config if used.

Docs: <https://opentui.com/docs/core-concepts/audio/>

### Testing

Use OpenTUI testing utilities where available. Keep tests focused on rendered output, key handling, and lifecycle cleanup. For layout regressions, assert dimensions/positions or visible text, not implementation details.

Docs: <https://opentui.com/docs/core-concepts/testing/>

## Components

### `Text`

Displays text content with foreground/background/style options. Use for labels, body copy, status text. For long wrapping content, constrain width to usable viewport.

Docs: <https://opentui.com/docs/components/text/>

### `Box`

Container for layout, backgrounds, borders, padding, children. Use `Box` for structure; avoid custom containers unless required.

Docs: <https://opentui.com/docs/components/box/>

### `Input`

Single-line text input with placeholder/value/focus behavior. Use for short values. Call `.focus()` or focus via app focus manager when needed.

Docs: <https://opentui.com/docs/components/input/>

### `Textarea`

Multi-line text input. Use for longer editable content. Ensure height, scrolling, and keybindings do not fight global shortcuts.

Docs: <https://opentui.com/docs/components/textarea/>

### `Select`

Single-choice list/dropdown style selection. Use for small-to-medium option sets. For large data, prefer server-side filtering/search and virtual/scrollable presentation.

Docs: <https://opentui.com/docs/components/select/>

### `TabSelect`

Tab-like selector for switching views/sections. Keep labels short. Ensure selected tab state is reflected visually and keyboard-accessible.

Docs: <https://opentui.com/docs/components/tab-select/>

### `ScrollBox`

Scrollable container. It manages own vertical scrollbar when content overflows.

Project rules:
- Do **not** set `flexDirection` on scrollbox style.
- For wrapped markdown/code/text, render content width to usable viewport width minus modal padding and scrollbar.
- Do not fix overlap by adding generic scrollbar padding/gaps.

Docs: <https://opentui.com/docs/components/scrollbox/>

### `ScrollBar`

Standalone scrollbar component. Prefer `ScrollBox` managed scrollbar unless implementing custom scroll behavior.

Docs: <https://opentui.com/docs/components/scrollbar/>

### `Markdown`

Renders Markdown. Use for rich text docs/messages. Constrain width for wrapping. Sanitize/limit untrusted or huge content before rendering if needed.

Docs: <https://opentui.com/docs/components/markdown/>

### `Code`

Renders code, with syntax highlighting/tree-sitter support when configured. Use for code blocks. For long lines, decide wrap vs horizontal scroll explicitly.

Docs: <https://opentui.com/docs/components/code/> and <https://opentui.com/docs/reference/tree-sitter/>

### `Diff`

Renders diffs. Use for reviews/patch previews. Keep width/scroll handling explicit; diffs often contain long lines.

Docs: <https://opentui.com/docs/components/diff/>

### `LineNumber`

Line-number gutter/rendering support. Use with code/diff views instead of hand-rolled prefixes when possible.

Docs: <https://opentui.com/docs/components/line-number/>

### `FrameBuffer`

Lower-level drawing buffer component. Use only when higher-level components cannot render needed content.

Docs: <https://opentui.com/docs/components/frame-buffer/>

### `AsciiFont`

Renders ASCII-art style text. Use sparingly for headers/splash screens; avoid for dense UI.

Docs: <https://opentui.com/docs/components/ascii-font/>

### `QRCode`

Renders QR codes in terminal. Use for URLs/auth pairing. Also print raw URL fallback for accessibility/copyability.

Docs: <https://opentui.com/docs/components/qr-code/>

### `Slider`

Numeric/ranged value picker. Use only when keyboard interaction is clear and exact numeric entry is not better.

Docs: <https://opentui.com/docs/components/slider/>

## Bindings

### React

OpenTUI React binding lets apps express renderable tree with React components. Use normal React lifecycle rules: stable props, cleanup effects, avoid unnecessary remounts, keep state minimal.

Docs: <https://opentui.com/docs/bindings/react/> and keymap docs <https://opentui.com/docs/keymap/react/>

### Solid

OpenTUI Solid binding supports Solid component model/signals. Keep reactive effects cleaned up and avoid work in render path.

Docs: <https://opentui.com/docs/bindings/solid/> and keymap docs <https://opentui.com/docs/keymap/solid/>

## Keymap system

OpenTUI keymap docs cover a composable keymap system with hosts, core API, addons, and framework integrations.

Use it when implementing shortcuts:
- Define keymaps centrally for discoverability/help output.
- Use standard keys already present in app.
- Keep host/global keymaps separate from focused component maps.
- Add custom addons only for repeated patterns.

Docs:
- Overview: <https://opentui.com/docs/keymap/overview/>
- Core: <https://opentui.com/docs/keymap/core/>
- Built-in addons: <https://opentui.com/docs/keymap/addons/>
- Custom addons: <https://opentui.com/docs/keymap/custom-addons/>
- Hosts: <https://opentui.com/docs/keymap/hosts/>
- React: <https://opentui.com/docs/keymap/react/>
- Solid: <https://opentui.com/docs/keymap/solid/>

## Plugins

OpenTUI plugin system supports core plugins, framework plugins, and slots. Use plugins for cross-cutting extension points, not for local one-off behavior.

Docs:
- Core plugins: <https://opentui.com/docs/plugins/core/>
- React plugins: <https://opentui.com/docs/plugins/react/>
- Solid plugins: <https://opentui.com/docs/plugins/solid/>
- Plugin slots: <https://opentui.com/docs/plugins/slots/>

## References

- Environment variables: <https://opentui.com/docs/reference/env-vars/>
- Standalone executables: <https://opentui.com/docs/reference/standalone-executables/>
- Tree-sitter: <https://opentui.com/docs/reference/tree-sitter/>
- Color matrix: <https://opentui.com/docs/reference/color-matrix/>

## Reusable project components

Custom reusable components live in `tui/packages/ui/src/components` and are exported from `tui/packages/ui/src/index.ts`. Reuse these before creating new OpenTUI wrappers.

### Layout and chrome

- `Layout` — app shell with fixed 2-line header, flex content, 3-line footer. Use for full-screen TUI pages.
- `Header` — standard `DΞV/ΞNV` top header with context/details/right status and severity color.
- `StatusBar` — 3-line footer keybind display. Truncates/flows keybind hints; feed it standard help-menu keybinds.
- `ContentFrame` — full-size base background with vertical gutters.
- `ContentPanel` — standard full-screen panel: `ContentFrame` + mantle inner panel.
- `ContentStack` — vertical stack of full-width content items separated by base-background gaps.
- `GridLayout` — side-by-side columns with standard gaps; use for detail dashboards.

### Lists, tables, and scrolling

- `ScrollableContent` — thin `scrollbox` wrapper with standard scrollbar options, axis toggles, sticky scroll, and ref callback. It intentionally does not set `flexDirection`.
- `ScrollableList<T>` — virtualized selectable list with optional filter bar, empty/loading states, scrollbar, and scroll indicator. Use for reusable list views; caller owns selection and keyboard logic.
- `Table` — app table with columns, optional tabs, search header, and `ScrollableList` body. Use for app/library/script-style tabular lists.
- `ListViewModal<T>` — `GenericModal` + `ScrollableList`; use for picker/list modals before writing modal-specific scrolling code.
- `SearchHeader` — 1-line header that switches between column/header content and `/query` search display.
- `FilterModal` — standard list filtering modal. Use `F` to open; model filters as parameter → values (e.g. status → running/exited). Keep filter state per list/tab where applicable.
- `SortModal` — standard list ordering modal. Use `O` to open; each parameter has `asc`/`desc`/`none`, and parameter order defines sort priority.

### Modal/dialog helpers

- `GenericModal` — centered overlay shell with title/header, content area, footer/help, configurable width/height, and backdrop click. Dialog mouse-up stops backdrop bubbling but invokes the global selection-copy handler registered via `setGlobalSelectionMouseUpHandler`; keep this so mouse-drag copy works inside all modal views.
- `ConfirmDialog` — small warning confirm/cancel modal built on `GenericModal`.
- `ErrorDialog` — small error modal with copy/close help.
- `ModalTabs` — compact tab row for modal sections, with optional badges.

### Text and state helpers

- `CenteredState` — centered empty/loading/status message.
- `DetailSection` — titled section wrapper for detail views.
- `HelpText` / `formatHelpText` — consistent keybind help rendering/string formatting.

### Utilities

- `focusSoon` (`tui/packages/ui/src/utils/focusSoon.ts`) — focuses an OpenTUI renderable on next tick after mount. Use instead of scattered `setTimeout(() => input.focus(), 0)` hacks.

When modifying or creating reusable OpenTUI components/utilities, update this section with purpose, location, and key usage constraints.

## Project-specific checklist

Before editing OpenTUI UI code:

1. Reuse existing component/style/keymap patterns in this repo.
2. Use `Box`, `Text`, `ScrollBox`, `Input`, etc. before custom renderables.
3. List views must implement standard controls where applicable: `/` search, `F` filter, `O` order/sort. If one does not apply, note why in code or docs.
4. Keep scrollbox rules: no `flexDirection`; width = usable viewport for wrapped content.
5. Backend-driven list endpoints must expose search/filter/sort parameters where applicable, and keep sorting/filtering/search server-side when paging data.
6. Use standard help-menu keybinds.
7. Clean up listeners/timers/renderers.
8. Run relevant tests; full suite when finishing feature.
