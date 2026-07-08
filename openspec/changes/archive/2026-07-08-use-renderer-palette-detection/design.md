## Context

DevEnv currently calls `queryTerminalThemeColors()` before `createCliRenderer()`. That helper writes raw OSC 10/11/4 queries to stdout, reads stdin directly, and parses terminal responses itself. This duplicates OpenTUI renderer functionality and can race with late terminal replies. OpenTUI's renderer exposes palette/theme APIs (`getPalette`, `palette` events, `themeMode`, `waitForThemeMode`) that are tied to renderer-owned input/output lifecycle.

OpenTUI docs also clarify that `consoleMode: "disabled"` only disables the overlay surface. Global `console.*` capture is controlled by `OTUI_USE_CONSOLE`. DevEnv currently gates only `consoleMode` with `DEVENV_TUI_CONSOLE`.

## Goals / Non-Goals

**Goals:**
- Remove DevEnv's raw OSC theme/palette query path.
- Use renderer-managed palette/default foreground/default background data for the generated system theme.
- Preserve fallback theme behavior when palette detection is unsupported or slow.
- Avoid post-exit OSC escape dumps caused by late palette responses.
- Align `DEVENV_TUI_CONSOLE` with OpenTUI console capture semantics.
- Keep current user-facing theme names and custom theme loading behavior.

**Non-Goals:**
- Redesign theme JSON format or theme colors.
- Add live automatic theme switching when terminal palette changes.
- Add a user-visible theme picker change.
- Change server APIs.

## Decisions

### Move system theme initialization after renderer creation

Create the renderer first, then ask the renderer for terminal colors through `renderer.getPalette({ size: 16 })` and/or `renderer.waitForThemeMode(...)` as needed. Convert OpenTUI's `TerminalColors` shape to DevEnv's `TerminalThemeColors` shape and pass it to `loadSystemTheme()`.

Alternatives considered:
- Keep custom raw OSC query with longer timeout: fixes some races but retains duplicated terminal IO and lifecycle risk.
- Use only `renderer.themeMode`: enough for light/dark fallback, but loses terminal palette-derived semantic colors.

### Keep bounded startup behavior

Palette detection MUST NOT block startup indefinitely. Use a small bounded timeout or gracefully handle `getPalette()` failure by calling `loadSystemTheme({})`.

Alternatives considered:
- Await full palette detection unbounded: more accurate, bad UX on terminals that do not respond.
- Skip system theme generation entirely: simpler, removes existing feature.

### Set console capture intent before OpenTUI initialization

Before importing or creating OpenTUI renderer paths that initialize console capture, set or respect `OTUI_USE_CONSOLE` based on `DEVENV_TUI_CONSOLE`. If the user already explicitly set `OTUI_USE_CONSOLE`, do not override it.

Alternatives considered:
- Keep only `consoleMode`: docs indicate this does not disable global capture.
- Always disable console capture: would break `DEVENV_TUI_CONSOLE=1` debugging behavior.

### Preserve theme utility boundaries

Keep `loadCustomThemes()`, `loadThemeName()`, `applyTheme()`, and `loadSystemTheme()` in `theme-settings.ts`. Remove or deprecate only `queryTerminalThemeColors()` and replace it with a conversion helper that accepts renderer palette data.

Alternatives considered:
- Move all theme setup into `app-opentui.tsx`: faster but bloats startup code.

## Risks / Trade-offs

- Renderer palette API may be unavailable on some terminals → catch failures and use existing fallback colors.
- Creating renderer before applying theme may show one frame with default colors → initialize system theme before Solid render so normal content uses selected theme from first app frame.
- `OTUI_USE_CONSOLE` must be set early enough → adjust entrypoint/import order if needed and add focused tests.
- Palette data shape may differ from custom parser output → isolate conversion in a tested helper.

## Migration Plan

1. Add helper to convert OpenTUI terminal colors to `TerminalThemeColors`.
2. Replace `queryTerminalThemeColors()` startup call with renderer palette detection after `createCliRenderer()`.
3. Ensure `loadSystemTheme()` runs before `applyTheme(initialTheme)` and before Solid render.
4. Align `DEVENV_TUI_CONSOLE` with `OTUI_USE_CONSOLE` without overriding explicit user env.
5. Remove unused raw OSC query helper.
6. Add tests for conversion, fallback, and console env behavior.
7. Run TUI tests/type-check and full verification.

## Open Questions

- Exact timeout for renderer palette detection during startup.
- Whether to subscribe to future `palette` events in a later change for live system theme updates.
