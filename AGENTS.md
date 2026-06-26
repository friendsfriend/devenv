* Always run the full test suite when finishing a feature
* Always check the pi-lens issues if available when finishing a feature
* Prefer reusable components over new implementations
* Use standard keybinds from the help menu; do not invent custom shortcuts
* When using server-side paging, filtering, sorting, and searching must also happen server-side before pagination; never page first and filter/search/sort client-side afterward
* For scrollbox content that should wrap (especially markdown/code renderers), set the rendered content width to the usable viewport width, leaving room for modal padding and the scrollbar; do not fix overlap by adding generic scrollbar padding/gaps
* OpenTUI `<scrollbox>` manages own scrollbar — shows when content overflows vertically. This is expected behavior. Do NOT set `flexDirection` on scrollbox style; it conflicts with internal layout and causes the scrollbar to render outside the panel.
