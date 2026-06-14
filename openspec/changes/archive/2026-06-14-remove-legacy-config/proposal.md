## Why

The devenv CLI supports two legacy configuration approaches that conflict with the goal of keeping all configuration isolated to `~/.config/devenv/`:

1. **In-app repository configuration files** — Dockerfiles (`devenv-build.Dockerfile`, `devenv-test.Dockerfile`) and Compose files (`devenv-compose.yml`, `devenv-*-compose.yml`) can reside inside the cloned repository root, creating ambiguity about where config lives and coupling infrastructure config to application code.
2. **Legacy `apps.json`** — The old monolithic single-file format (`~/.config/devenv/apps.json`) has been superseded by split definition files under `apps/definitions/`, `libraries/definitions/`, and `infrastructure/definitions/`. Maintaining backward compatibility with `apps.json` and its legacy plain-array format adds code complexity without benefit.

Removing both simplifies the codebase, enforces a single source of truth for configuration, and reduces maintenance burden.

## What Changes

### Remove in-app repository configuration files **BREAKING**

- Dockerfile resolution will **only** check the config directory: `{configDir}/apps/build/{appIdent}-{action}.Dockerfile`
- Compose file resolution will **only** check the config directory: `{configDir}/apps/compose/{appIdent}-compose.yml` (and `{appIdent}-{profile}-compose.yml` for profiles)
- Profile discovery will **only** scan the config directory's `apps/compose/` folder
- The "resolution order" documentation describing repo-root fallbacks will be removed

### Remove legacy `apps.json` configuration **BREAKING**

- The monolithic `~/.config/devenv/apps.json` file will no longer be read
- All apps, libraries, and infrastructure services must be defined as individual split files in their respective `definitions/` directories
- The legacy plain-array format (`[...]` instead of `{"apps":[...]}`) will be removed
- The `infra-services.json` legacy file will no longer be read
- The `AppsConfig` struct and its custom `UnmarshalJSON` will be removed
- The `legacyRuntimeFields` struct and `seedLegacyRuntimeState` migration will be removed
- The `AppsConfigPath()` method on `resources.Manager` will be removed

## Capabilities

### New Capabilities

This change does not introduce new capabilities — it removes legacy features that were never formalized as separate specs. The existing config-directory-only behavior is already the primary path; these removals simply eliminate fallback and compatibility code.

### Modified Capabilities

None. No existing capability specs reference `apps.json`, in-repo Dockerfiles, or in-repo Compose files. These were implementation details that evolved organically and were never spec'd as formal requirements.

## Impact

### Code impacted

| Area | Files |
|---|---|
| **Config loading (Go)** | `server/pkg/app/manager.go` — remove `loadLegacyAppsConfig`, `legacyAppsConfigPath`, `AppsConfig.UnmarshalJSON`, `AppsConfig` struct, `legacyRuntimeFields`, `seedLegacyRuntimeState`, `infraServicesPath`; simplify `loadAppsFromStorage` and `loadInfraServicesFromStorage` |
| **Resource resolution (Go)** | `server/pkg/resources/manager.go` — remove repo-root fallback branches in `ResolveDockerfileForAction`, `ResolveComposeFile`, `DiscoverProfiles`; remove `AppsConfigPath()` |
| **Build service (Go)** | `server/pkg/build/service.go` — no code changes, but its callers (`ResolveDockerfileForAction`, `ResolveComposeFile`, `DiscoverProfiles`) will no longer find repo-root files |
| **Tests (Go)** | `server/pkg/app/manager_test.go` — remove tests for legacy format, apps.json loading, legacy runtime migration; update tests to use split files only |
| **Tests (Go)** | `server/pkg/resources/manager_test.go` — remove tests for repo-root fallback scenarios in Dockerfile, Compose, and profile discovery |
| **Documentation** | `README.md` — remove apps.json section, remove resolution-order docs for repo-root files, update directory structure diagram |
