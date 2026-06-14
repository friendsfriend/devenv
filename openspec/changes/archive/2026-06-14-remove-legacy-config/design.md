## Context

The devenv CLI currently supports two separate paths for resolving Dockerfiles, Compose files, and application definitions:

1. **Resource resolution** (Dockerfiles, Compose files, profiles) uses a two-tier lookup: config directory first (`~/.config/devenv/apps/build/`, `~/.config/devenv/apps/compose/`), then falls back to the repository root (`devenv-build.Dockerfile`, `devenv-compose.yml`, etc.). This means an app's infrastructure configuration can be scattered between the global config directory and individual repositories.

2. **Application definitions** (`apps.json`, `infra-services.json`) were the original monolithic format. The codebase has already migrated to split definition files (`apps/definitions/`, `libraries/definitions/`, `infrastructure/definitions/`), but retains full backward compatibility with the old format — including a custom `AppsConfig.UnmarshalJSON` that handles both object and legacy plain-array formats, and a `seedLegacyRuntimeState` migration path for runtime fields that were previously stored in the JSON.

Both features add code complexity, test surface area, and documentation overhead. Removing them enforces a single configuration source and simplifies the codebase.

**Constraints:**
- Users who have `devenv-compose.yml` or `devenv-build.Dockerfile` in their repos must move them to the config directory before upgrading.
- Users who have a single `apps.json` must split it into individual files under `apps/definitions/`, `libraries/definitions/`, and `infrastructure/definitions/` before upgrading.
- No data migration is needed; this is purely a code removal.

## Goals / Non-Goals

**Goals:**
- Remove repo-root fallback for Dockerfile resolution (build, test)
- Remove repo-root fallback for Compose file resolution (run, profile-specific)
- Remove repo-root scanning from profile discovery
- Remove `apps.json` reading, parsing, and fallback in the app manager
- Remove `infra-services.json` reading and fallback
- Remove `AppsConfig` struct, `AppsConfig.UnmarshalJSON`, and legacy format support
- Remove `legacyRuntimeFields` struct and `seedLegacyRuntimeState` migration
- Remove `AppsConfigPath()` from `resources.Manager`
- Update tests to reflect the simplified behavior
- Update README to remove related documentation

**Non-Goals:**
- No changes to the split-file format or directory structure
- No changes to the SQLite state store or runtime state management
- No changes to the `infrastructure/compose/` resolution (it already only checks config dir)
- No changes to the TUI (it doesn't reference these features)
- No data migration tooling — users must adapt their config before upgrading

## Decisions

### Decision 1: Remove repo-root fallback entirely (not make it configurable)

**Option A (chosen):** Simply delete the repo-root fallback branches from `ResolveDockerfileForAction`, `ResolveComposeFile`, and `DiscoverProfiles`. Dockerfile/compose resolution becomes single-source: config directory only.

**Option B (rejected):** Add a configuration flag to allow users to opt into repo-root config. This adds complexity and defeats the purpose of the removal.

**Rationale:** The goal is simplification and single-source-of-truth. Making it configurable would keep the code paths alive and add more surface area. Users who need repo-root config can copy their files to the config directory or use symlinks.

### Decision 2: Remove legacy `apps.json` support outright (no graceful deprecation)

**Option A (chosen):** Delete all `apps.json` reading, parsing, and fallback code. The app manager will only load from split files.

**Option B (rejected):** Keep the code but log a deprecation warning. This creates noise without benefit, since the migration to split files has been supported for some time and the old format is purely legacy.

**Rationale:** The split-file format has been the primary path. The legacy code is dead code.

### Decision 3: Keep `AppsConfig` struct but restrict it to `apps.json` removal only

**Option A (chosen):** Remove the `AppsConfig` struct entirely since it was only used for `apps.json` parsing. The app and infra service loading functions will return slices directly.

**Option B (rejected):** Keep the struct but repurpose it. The struct has no other callers and adds no value.

**Rationale:** Cleaner to remove dead types.

### Decision 4: Remove `seedLegacyRuntimeState` migration

**Option A (chosen):** Delete `seedLegacyRuntimeState` and `legacyRuntimeFields` entirely. The SQLite state store has been the runtime state source for long enough that this one-time migration path is no longer needed.

**Option B (rejected):** Keep it for "safety." Any existing user would have had their runtime state migrated on first load after the SQLite migration was deployed.

**Rationale:** Dead code that adds complexity and test surface.

### Decision 5: Remove `AppsConfigPath()` from `resources.Manager`

**Option A (chosen):** Delete the method. It appears to have no external callers beyond internal references, and serves no purpose without `apps.json`.

**Rationale:** Cleanup.

## Risks / Trade-offs

- **[Risk] Users with `devenv-compose.yml` in their repos will get "no compose file found" errors after upgrading**
  → **Mitigation**: Document the breaking change clearly in the README. Users must copy their compose files to `~/.config/devenv/apps/compose/`.

- **[Risk] Users with `devenv-build.Dockerfile` in their repos will get "no dockerfile found" errors**
  → **Mitigation**: Same as above — document and instruct to copy files to `~/.config/devenv/apps/build/`.

- **[Risk] Users with a single `apps.json` will lose their app definitions**
  → **Mitigation**: Document that users must run a one-time split before upgrading. Provide an optional helper script if needed.

- **[Risk] A dev workflow depends on checking `devenv-compose.yml` into the repo for team sharing**
  → **Mitigation**: The config directory approach makes this less convenient, but compose files are infrastructure config, not application code. Teams can document the convention in their onboarding docs.

## Open Questions

- Should we provide a one-time migration script that converts `apps.json` to split files? Currently the answer is no (users do it manually), but this could be a follow-up task.
