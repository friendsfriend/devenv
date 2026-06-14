## 1. Remove in-app repository configuration files (resources/manager.go)

- [x] 1.1 Remove repo-root fallback in `ResolveDockerfileForAction` — delete the `{repoRoot}/devenv-{action}.Dockerfile` check, keep only config dir resolution
- [x] 1.2 Remove repo-root fallback in `ResolveComposeFile` — delete `{repoRoot}/devenv-compose.yml` and `{repoRoot}/devenv-{profile}-compose.yml` checks for both profile and default paths
- [x] 1.3 Remove repo-root scanning from `DiscoverProfiles` — delete the `os.ReadDir(localDir)` block that scans for `devenv-*-compose.yml` patterns
- [x] 1.4 Remove `AppsConfigPath()` method from `resources.Manager` and its implementation

## 2. Remove legacy apps.json configuration (app/manager.go)

- [x] 2.1 Remove `AppsConfig` struct — delete it along with the `UnmarshalJSON` method
- [x] 2.2 Remove `legacyRuntimeFields` struct and `seedLegacyRuntimeState` method — remove the one-time migration code
- [x] 2.3 Remove `loadLegacyAppsConfig()` method — delete the `apps.json` reader function
- [x] 2.4 Remove `legacyAppsConfigPath()` and `infraServicesPath()` methods
- [x] 2.5 Simplify `loadAppsFromStorage()` — remove the `apps.json` fallback, keep only split-file loading
- [x] 2.6 Simplify `loadInfraServicesFromStorage()` — remove the `infra-services.json` and `apps.json` fallback code, keep only split-directory loading
- [x] 2.7 Remove the legacy format detection in `loadAppsFromDirectory` — remove the `legacyRuntimeFields` unmarshal and `seedLegacyRuntimeState` call

## 3. Update tests

- [x] 3.1 Remove legacy apps.json tests from `manager_test.go`:
  - `TestAppsConfigLegacyFormat`
  - `TestLoadConfigNewFormatOverridesInfraServices`
  - `TestLoadConfigLegacyFormatHasNoInfraServices`
  - `TestAppsConfigEmptyInput`
  - `TestLegacyRuntimeStateMigration`
- [x] 3.2 Remove or update `TestLoadConfigFromSplitFiles` — verify it no longer falls back to `apps.json`
- [x] 3.3 Remove or update `TestSaveConfigWritesInfraSplitFiles` — no longer needs `apps.json` fixture
- [x] 3.4 Remove repo-root fallback tests from `manager_test.go` (resources):
  - `TestResolveDockerfileForAction/falls_back_to_repo_root_devenv-build.Dockerfile`
  - `TestResolveComposeFile/falls_back_to_repo_root_devenv-compose.yml`
  - `TestResolveComposeFile/resolves_profile-specific_compose_from_repo_root`
  - `TestResolveComposeFile/profile_falls_back_to_default_compose_when_profile-specific_not_found`
  - `TestDiscoverProfiles/discovers_profiles_from_repo_root`
  - `TestDiscoverProfiles/deduplicates_profiles_from_both_sources`
- [x] 3.5 Ensure remaining tests compile and pass

## 4. Update README

- [x] 4.1 Remove the entire `apps.json` section from README.md
- [x] 4.2 Remove "Resolution order" documentation for Dockerfiles (apps/build section)
- [x] 4.3 Remove "Resolution order" documentation for Compose files and Profile Discovery
- [x] 4.4 Remove repo-root filename examples (`devenv-compose.yml`, `devenv-build.Dockerfile`, `devenv-test.Dockerfile`) from README
- [x] 4.5 Update the Directory Structure diagram to remove any apps.json reference

## 5. Clean up and verify

- [x] 5.1 Run `bun run type-check` on TUI to ensure no missing API client references
- [x] 5.2 Run Go tests to verify everything passes: `cd server && go test ./...`
- [x] 5.3 Search for any remaining references to `apps.json`, `devenv-compose`, `devenv-build.Dockerfile` in Go source files and clean up
