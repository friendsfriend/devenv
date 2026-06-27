* Always run the full test suite when finishing a feature
* Always check the pi-lens issues if available when finishing a feature
* Prefer reusable components over new implementations
* Use standard keybinds from the help menu; do not invent custom shortcuts
* List views must support the standard controls where applicable: `/` search, `F` filter, `O` order/sort. If a list cannot support one, document why.
* Backend-driven list endpoints must expose search, filter, and sort parameters where applicable so TUI list controls can work consistently.
* When using server-side paging, filtering, sorting, and searching must also happen server-side before pagination; never page first and filter/search/sort client-side afterward
* For scrollbox content that should wrap (especially markdown/code renderers), set the rendered content width to the usable viewport width, leaving room for modal padding and the scrollbar; do not fix overlap by adding generic scrollbar padding/gaps
* OpenTUI `<scrollbox>` manages own scrollbar — shows when content overflows vertically. This is expected behavior. Do NOT set `flexDirection` on scrollbox style; it conflicts with internal layout and causes the scrollbar to render outside the panel.
* When working with OpenTUI components, layouts, keymaps, plugins, or bindings, consult `OPENTUI_GUIDE.md` first.
* When creating or modifying reusable custom OpenTUI components, document them in `OPENTUI_GUIDE.md`.
