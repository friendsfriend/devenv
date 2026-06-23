## Context

Provider CRUD currently accepts `name`, `type`, `username`, and `token` from the TUI and persists the full struct as JSON under `$DEVENV_CONFIG_DIR/providers/<name>.json`. `ProviderStore.Load()` already reads the DevEnv config `.env` file and substitutes `${VAR}` placeholders before unmarshalling provider JSON, so read-time support for externalized credentials already exists.

The missing piece is write-time behavior: `ProviderStore.Save()` writes the raw credentials it receives. Provider update also overwrites the full provider record, so an edit request with an empty token can accidentally clear an existing token.

## Goals / Non-Goals

**Goals:**
- Keep provider creation and edit UX unchanged.
- Store new or updated provider secrets in `$DEVENV_CONFIG_DIR/.env`.
- Store provider JSON with env placeholders instead of raw credentials.
- Continue loading legacy clear-text provider files.
- Preserve existing token when editing a provider without entering a new token.
- Clean up DevEnv-managed credential env entries on provider deletion.

**Non-Goals:**
- Encrypting secrets at rest.
- Migrating every existing provider file automatically on startup.
- Adding OS keychain integration.
- Changing provider API shapes or TUI modal flow.

## Decisions

### Use existing `.env` substitution instead of a new secret backend

Provider loading already supports `${VAR}` substitution from the config `.env` file. Extending `Save()` to emit placeholders keeps the change small and avoids another credential mechanism.

Alternative considered: OS keychain storage. Better security, but larger platform-specific scope and unnecessary for this change.

### Use deterministic DevEnv-managed variable names

Use provider-name-derived env variable names:

```text
DEVENV_PROVIDER_<SANITIZED_PROVIDER_NAME>_USERNAME
DEVENV_PROVIDER_<SANITIZED_PROVIDER_NAME>_TOKEN
```

`SANITIZED_PROVIDER_NAME` should be uppercased and normalized to env-safe characters. Provider names are already filesystem-safe, but env names need a narrower alphabet.

Alternative considered: include provider type (`DEVENV_GITLAB_WORK_TOKEN`). This adds little value and makes rename/type changes harder.

### Make env-file mutation a resource utility

Add or extend `.env` helper functions near `server/pkg/resources/envfile.go` so provider storage can update and remove entries without duplicating parsing/writing logic. The helper should preserve unrelated lines and comments where practical.

Alternative considered: rewrite `.env` from a map. Simpler, but destroys comments/order and can surprise users.

### Preserve token on empty update token

For `PUT /api/providers/{name}`, load the existing provider and keep its token if the request token is empty. This matches current TUI behavior, where edit mode only sends a token when changed.

Alternative considered: require clients to always send the existing token. Not possible because GET intentionally hides tokens.

### Keep legacy files loadable, migrate on save only

No startup migration is required. Existing clear-text files still load. When a provider is created or updated, the saved version uses env placeholders.

Alternative considered: automatic migration during `Load()`. Riskier because a read operation would mutate user files and `.env`.

## Risks / Trade-offs

- [Risk] Env variable name collisions after sanitizing provider names → Mitigation: either reject colliding names on save or use existing provider name validation plus deterministic collision check against provider files.
- [Risk] `.env` values with unusual characters may parse incorrectly → Mitigation: write values in the simplest format supported by the existing parser and add tests for representative GitHub/GitLab tokens.
- [Risk] Removing env entries could delete user-managed variables with matching names → Mitigation: only remove deterministic DevEnv-managed names for the deleted provider.
- [Risk] Legacy clear-text files remain until edited → Mitigation: document migration-on-save behavior; automatic migration can be a later change if needed.

## Migration Plan

1. Deploy support for env-backed provider saves while keeping legacy load support.
2. New provider creates write env entries and placeholder JSON.
3. Existing providers continue to work unchanged.
4. Editing an existing provider rewrites it into env-backed format.
5. Rollback is safe for already env-backed files because current loading already substitutes `.env` variables.

## Open Questions

- Should provider deletion remove env entries unconditionally, or leave them behind for manual recovery? Proposed default: remove them because they are DevEnv-managed secrets.
- Should updates that change provider name ever be supported? Current endpoint name is path-based; keep rename out of scope.
