## Why

DevEnv currently performs its own raw OSC color queries before creating the OpenTUI renderer, which can race with terminal responses and leak OSC palette replies after exit. OpenTUI now exposes renderer-managed theme and palette detection APIs that fit the renderer lifecycle and avoid custom stdin handling.

## What Changes

- Replace custom raw OSC theme/palette querying with renderer-managed palette/theme APIs.
- Initialize the system theme after renderer creation using OpenTUI palette data when available.
- Preserve existing fallback behavior when palette detection is unavailable or times out.
- Align console capture configuration with OpenTUI's `OTUI_USE_CONSOLE` behavior so disabled console mode does not unexpectedly capture `console.*` output.
- Add tests for palette conversion/fallback logic and console environment handling.

## Capabilities

### New Capabilities
- `renderer-palette-theme`: System theme initialization uses OpenTUI renderer palette/theme detection instead of custom raw OSC queries.

### Modified Capabilities

## Impact

- TUI startup: `app-opentui.tsx` renderer creation and theme initialization order.
- Theme utilities: `theme-settings.ts` custom query code and `loadSystemTheme` input shape.
- Console/debug behavior: environment setup before OpenTUI initialization.
- Tests for theme palette conversion and startup configuration.
- No server API or persistent config schema changes expected.
