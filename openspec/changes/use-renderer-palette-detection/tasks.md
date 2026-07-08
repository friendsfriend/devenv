## 1. Theme Palette Helpers

- [ ] 1.1 Add a tested helper that converts OpenTUI renderer palette/default colors into `TerminalThemeColors`.
- [ ] 1.2 Add fallback handling for missing palette, missing default foreground/background, and palette detection errors.
- [ ] 1.3 Remove or deprecate the custom raw OSC `queryTerminalThemeColors()` helper once renderer palette detection is wired.

## 2. Startup Integration

- [ ] 2.1 Move system theme initialization to run after `createCliRenderer()` and before Solid app rendering.
- [ ] 2.2 Use OpenTUI renderer palette APIs with bounded failure handling so startup cannot hang.
- [ ] 2.3 Preserve existing `loadCustomThemes()`, `loadThemeName()`, `loadSystemTheme()`, and `applyTheme()` behavior for custom/default themes.
- [ ] 2.4 Verify no raw OSC palette query responses are emitted by DevEnv's theme initialization after TUI exit.

## 3. Console Capture Alignment

- [ ] 3.1 Add startup logic that respects explicit `OTUI_USE_CONSOLE` and otherwise maps `DEVENV_TUI_CONSOLE=1` to enabled console capture.
- [ ] 3.2 Ensure normal mode disables both console overlay and unexpected global `console.*` capture.
- [ ] 3.3 Preserve console overlay copy behavior when `DEVENV_TUI_CONSOLE=1`.

## 4. Tests and Verification

- [ ] 4.1 Add unit tests for palette conversion and fallback logic.
- [ ] 4.2 Add tests or startup configuration coverage for console env mapping.
- [ ] 4.3 Run `cd tui && bun test`.
- [ ] 4.4 Run `cd tui && bun run type-check`.
- [ ] 4.5 Run full project test suite and check pi-lens issues before finishing implementation.
