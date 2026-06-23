## Why

Provider credentials are currently persisted in provider JSON files with username and token values in clear text. DevEnv already supports `${VAR}` substitution from the config `.env` file when loading providers, so provider creation should use that safer path by default.

## What Changes

- Store newly created provider usernames and tokens as entries in the DevEnv config `.env` file.
- Persist provider JSON files with `${DEVENV_PROVIDER_<NAME>_USERNAME}` and `${DEVENV_PROVIDER_<NAME>_TOKEN}` references instead of raw credential values.
- Preserve existing provider loading behavior so old clear-text provider files and existing placeholder-based files continue to work.
- Update provider edits to keep the existing token when no replacement token is supplied.
- Remove provider-owned `.env` credential entries when deleting a provider.

## Capabilities

### New Capabilities
- `provider-credential-storage`: Defines how DevEnv persists, resolves, updates, and deletes provider credentials without storing secrets directly in provider JSON files.

### Modified Capabilities

## Impact

- Affected backend areas: `server/pkg/provider`, provider CRUD handlers, `.env` resource utilities.
- Affected TUI behavior: no UI flow change expected; existing create/edit provider modal keeps sending credentials.
- Affected files on disk: `$DEVENV_CONFIG_DIR/providers/<name>.json` and `$DEVENV_CONFIG_DIR/.env`.
- No new runtime dependency expected.
