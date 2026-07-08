## Context

`pkg/resources/envfile.go` provides `LoadEnvFile(path)` and `SubstituteVars(s, vars)`. Substitution replaces `${VAR}` with the value from the vars map; if a key is missing, the placeholder remains unchanged. Currently there's no way to distinguish "intentionally left as-is" from "variable not found."

Provider JSON files go through substitution during load. Compose files get `--env-file` injection but substitution happens in Docker Compose natively. Templates are substituted during `CopyTemplatesDir`.

## Goals / Non-Goals

**Goals:**
- Return a list of unresolved `${VAR}` names from each substitution call
- Surface missing vars as warning notifications in the TUI (not blocking errors)
- Cover: provider JSON loading, template substitution, and compose env file resolution

**Non-Goals:**
- Blocking app start for missing vars (some vars may be optional)
- Auto-creating `.env` entries
- Validating that all vars in `.env` are actually used

## Decisions

### 1. New function `SubstituteVarsWithWarnings`

Add `SubstituteVarsWithWarnings(s string, vars map[string]string) (string, []string)` that returns both the substituted string and a list of unresolved variable names. Existing `SubstituteVars` remains unchanged for backward compatibility.

**Alternative considered:** Modify `SubstituteVars` to return warnings. Rejected because it would break all existing call sites.

### 2. Warning notification, not error

Missing vars show as `uiStore.setNotification("Missing env vars: FOO, BAR", "warning")` with a 5-second timeout. Users can still proceed — the app may work fine without optional vars.

### 3. Check at provider load time + app start time

- Provider JSON: check when providers are loaded at startup, warn once per provider
- App start: check when compose file is resolved before `docker compose up`

## Risks / Trade-offs

- **[Risk] Noisy warnings for intentionally unused vars** → Acceptable; users can ignore. Could add `required: true` annotation later.
- **[Trade-off] Only covers direct substitution, not Docker's native `${VAR}`** → Docker compose handles its own `${VAR}` from `--env-file`. Our check covers the subset we substitute server-side.
