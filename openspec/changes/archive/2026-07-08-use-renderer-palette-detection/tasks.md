## 1. Theme Palette Helpers

- [x] 1.1 Add a tested helper that converts OpenTUI renderer palette/default colors into `TerminalThemeColors`.
- [x] 1.2 Add fallback handling for missing palette, missing default foreground/background, and palette detection errors.
- [x] 1.3 Remove or deprecate the custom raw OSC `queryTerminalThemeColors()` helper once renderer palette detection is wired.

## 2. Startup Integration

- [x] 2.1 Move system theme initialization to run after `createCliRenderer()` and before Solid app rendering.
- [x] 2.2 Use OpenTUI renderer palette APIs with bounded failure handling so startup cannot hang.
- [x] 2.3 Preserve existing `loadCustomThemes()`, `loadThemeName()`, `loadSystemTheme()`, and `applyTheme()` behavior for custom/default themes.
- [x] 2.4 Verify no raw OSC palette query responses are emitted by DevEnv's theme initialization after TUI exit.

## 3. Console Capture Alignment

- [x] 3.1 Add startup logic that respects explicit `OTUI_USE_CONSOLE` and otherwise maps `DEVENV_TUI_CONSOLE=1` to enabled console capture.
- [x] 3.2 Ensure normal mode disables both console overlay and unexpected global `console.*` capture.
- [x] 3.3 Preserve console overlay copy behavior when `DEVENV_TUI_CONSOLE=1`.

## 4. Tests and Verification

- [x] 4.1 Add unit tests for palette conversion and fallback logic.
- [x] 4.2 Add tests or startup configuration coverage for console env mapping.
- [x] 4.3 Run `cd tui && bun test`.
- [x] 4.4 Run `cd tui && bun run type-check`.
- [x] 4.5 Run full project test suite and check pi-lens issues before finishing implementation.
