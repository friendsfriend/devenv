* Always run the full test suite when finishing a feature
* Always check the pi-lens issues if available when finishing a feature
* Prefer reusable components over new implementations
* For semantic UI coloring, use the shared highlight types/component instead of custom color handling; direct color overrides are last resort only
* Information priority: badges only for prominently highlighted information; normal highlight color is second-tier emphasis; primary text is third-tier default content; muted text is fourth-tier supporting/chrome text
* Semantic feedback colors: green/positive only for success/healthy feedback, red/negative only for failure/destructive feedback, yellow/warning only for warning/attention feedback
* For pill-style labels/status chips, use the shared Badge component only when information deserves prominent emphasis
* Use standard keybinds from the help menu; do not invent custom shortcuts
* TUI keybinds must be modeled as OpenTUI keymap layers/commands with metadata for help/footer discovery; avoid reintroducing manual sequential key dispatchers.
* TUI full-screen navigation must use the app view stack (`pushView`, `popView`, `replaceView`/`setViewMode`, `resetViewStack`) rather than hardcoded back targets. Opening a new full-screen view should usually `pushView`; Escape/back should usually `popView`; returning to the main table should `resetViewStack("table")` only when intentionally discarding history.
* TUI overlay navigation must use/sync the modal stack (`syncModalStack`, `activeModal`, `pushModal`, `popModal`) rather than relying on fixed boolean scan order. The top modal owns keyboard focus; closing it should reveal the previous modal without changing the view stack.
* Keymap runtime state must be derived from the view stack and modal stack (`app.viewMode`, `modal.active`) so the active keymap layer matches the visible topmost route/overlay.
* For panel-based views, synchronize focused panel into keymap runtime state (`focus.panel`) and gate panel-specific bindings with `focusedPanel` (for example `kubernetes:2` or `changeRequestDetail:1`) so help/footer hints and dispatch reflect the active panel.
* Prefer uppercase key bindings like `F`, `O`, `J` for shifted letter shortcuts; do not duplicate with `shift+f`/`shift+o` variants. Shifted lowercase key events should be normalized centrally.
* List views must support the standard controls where applicable: `/` search, `F` filter, `O` order/sort. If a list cannot support one, document why.
* View and modal headers must use the shared SearchHeader style: bgSurface1 one-line bar, title/summary content as fallback, and live `/query█` display while searching.
* Views/modals with filtering or sorting must render the shared FilterStatusBar directly under SearchHeader; keep it present and empty only when the design needs stable header chrome.
* Searchable row text must use the shared MatchedText component (or equivalent shared match renderer) so matched terms are highlighted consistently with theme colors (warning background, base foreground); do not hardcode palette colors for match highlighting.
* Backend-driven list endpoints must expose search, filter, and sort parameters where applicable so TUI list controls can work consistently.
* When using server-side paging, filtering, sorting, and searching must also happen server-side before pagination; never page first and filter/search/sort client-side afterward
* For scrollbox content that should wrap (especially markdown/code renderers), set the rendered content width to the usable viewport width, leaving room for modal padding and the scrollbar; do not fix overlap by adding generic scrollbar padding/gaps
* OpenTUI `<scrollbox>` manages own scrollbar — shows when content overflows vertically. This is expected behavior. Do NOT set `flexDirection` on scrollbox style; it conflicts with internal layout and causes the scrollbar to render outside the panel.
* OpenTUI `<text>` only accepts strings, TextNodeRenderable, or StyledText as children. Do NOT nest `<text>` inside `<text>` — use template literals or string concatenation instead.
* When working with any TUI elements (OpenTUI components, views, modals, layouts, keymaps, plugins, bindings, keyboard routing, or terminal rendering), load the project-local `opentui` skill first (`.pi/skills/opentui/SKILL.md`) and follow its referenced docs.
* When creating or modifying reusable custom OpenTUI components, update the project-local `opentui` skill references when reusable guidance changes.
* For TUI performance investigations, generate a disposable large fixture with `bun run perf:fixture -- --apps <count> --scripts <count>` (defaults write to `/tmp/devenv-perf-config` and `/tmp/devenv-perf-home`), then run with `DEVENV_CONFIG_DIR=<config> DEVENV_HOME=<home> OTUI_SHOW_STATS=true bun run dev -p <port>` and use the OpenTUI debug overlay stats.
* This project uses bun. Don't use pnpm or npm
* Never run `bun run build` unless explicitly requested. Use `bun run build:single` instead.
