* Always run the full test suite when finishing a feature
* Always check the pi-lens issues if available when finishing a feature
* Prefer reusable components over new implementations
* For semantic UI coloring, use the shared highlight types/component instead of custom color handling; direct color overrides are last resort only
* Information priority: badges only for prominently highlighted information; normal highlight color is second-tier emphasis; primary text is third-tier default content; muted text is fourth-tier supporting/chrome text
* Semantic feedback colors: green/positive only for success/healthy feedback, red/negative only for failure/destructive feedback, yellow/warning only for warning/attention feedback
* For pill-style labels/status chips, use the shared Badge component only when information deserves prominent emphasis
* Use standard keybinds from the help menu; do not invent custom shortcuts
* List views must support the standard controls where applicable: `/` search, `F` filter, `O` order/sort. If a list cannot support one, document why.
* Backend-driven list endpoints must expose search, filter, and sort parameters where applicable so TUI list controls can work consistently.
* When using server-side paging, filtering, sorting, and searching must also happen server-side before pagination; never page first and filter/search/sort client-side afterward
* For scrollbox content that should wrap (especially markdown/code renderers), set the rendered content width to the usable viewport width, leaving room for modal padding and the scrollbar; do not fix overlap by adding generic scrollbar padding/gaps
* OpenTUI `<scrollbox>` manages own scrollbar — shows when content overflows vertically. This is expected behavior. Do NOT set `flexDirection` on scrollbox style; it conflicts with internal layout and causes the scrollbar to render outside the panel.
* When working with OpenTUI components, layouts, keymaps, plugins, or bindings, load the project-local `opentui` skill first (`.pi/skills/opentui/SKILL.md`) and follow its referenced docs.
* When creating or modifying reusable custom OpenTUI components, update the project-local `opentui` skill references when reusable guidance changes.
* For TUI performance investigations, generate a disposable large fixture with `bun run perf:fixture -- --apps <count> --scripts <count>` (defaults write to `/tmp/devenv-perf-config` and `/tmp/devenv-perf-home`), then run with `DEVENV_CONFIG_DIR=<config> DEVENV_HOME=<home> OTUI_SHOW_STATS=true bun run dev -p <port>` and use the OpenTUI debug overlay stats.
* This project uses bun. Don't use pnpm or npm
* Never run `bun run build` unless explicitly requested. Use `bun run build:single` instead.
