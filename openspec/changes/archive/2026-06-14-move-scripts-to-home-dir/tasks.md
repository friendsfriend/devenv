## 1. Core: Move ScriptsDir and update handlers

- [x] 1.1 Change `ScriptsDir()` in `server/pkg/resources/scripts.go` to accept and use home dir — update the doc comment from "under the config root" to "under the devenv home directory"
- [x] 1.2 Update all handlers in `server/pkg/server/handlers_scripts.go` — replace every `resources.ScriptsDir(s.services.ResourcesManager().ConfigDir())` with `resources.ScriptsDir(s.services.HomeDir())`
- [x] 1.3 Update tests in `server/pkg/resources/scripts_test.go` — change path expectations that reference config-dir-based scripts paths to home-dir-based paths
- [x] 1.4 Update tests in `server/pkg/server/scripts_test.go` — change path expectations that reference config-dir-based scripts paths to home-dir-based paths

## 2. Specs: Update requirement texts for new location

- [x] 2.1 Update `openspec/specs/script-collections/spec.md` — change "config directory under `scripts/`" references to "$DEVENV_HOME/scripts/" (first requirement and its scenarios)
- [x] 2.2 Update `openspec/specs/script-creation-and-linking/spec.md` — change "config `scripts/` directory" references to "$DEVENV_HOME/scripts/" (two requirements)
