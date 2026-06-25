## Why

Frontend list and detail views repeat the same loading/error/empty, search header, bordered panel, and small formatting logic. Extracting shared pieces keeps future screens consistent and reduces copy-paste bugs.

## What Changes

- Add reusable UI primitives for common TUI view states, search headers, and detail sections.
- Refactor duplicated frontend views to use existing shared components first, then new minimal components where needed.
- Move duplicated formatting/color helpers into shared utilities where appropriate.
- Keep behavior and keybinds unchanged.

## Capabilities

### New Capabilities
- `frontend-reusable-components`: Reusable frontend UI components and utilities for repeated TUI view patterns.

### Modified Capabilities

## Impact

- Affects `tui/packages/ui/src/components` and shared UI utilities.
- No API, dependency, or storage changes.
- Visual output should remain equivalent except for consistency fixes from shared rendering.
