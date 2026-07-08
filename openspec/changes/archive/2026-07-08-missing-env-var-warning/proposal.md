## Why

Compose files, provider JSON, and templates use `${VAR}` placeholders substituted from `.env`. When a required variable is missing, substitution silently leaves the placeholder as-is, causing cryptic failures at runtime (e.g., empty database URL, failed git auth). Users have no visibility into which variables are missing until something breaks.

## What Changes

- Detect missing `.env` variables during substitution and surface them as warning notifications
- Server-side: return list of unresolved variable names alongside substituted values
- TUI-side: show warning notification listing missing vars when starting an app or loading providers

## Capabilities

### New Capabilities
- `missing-env-detection`: Server returns unresolved variable names from `.env` substitution; TUI displays warning notifications for missing required variables

### Modified Capabilities

## Impact

- `server/pkg/resources/envfile.go` — add warning-returning variant of `SubstituteVars`
- `server/pkg/server/handlers.go` — include missing vars in compose/provider responses
- `tui/packages/core/src/` — propagate missing vars through API client
- `tui/packages/cli/src/tui/actions/docker-actions.ts` — trigger notification on missing vars
