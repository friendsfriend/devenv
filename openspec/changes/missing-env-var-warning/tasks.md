## 1. Server-Side Substitution with Warnings

- [ ] 1.1 Add `SubstituteVarsWithWarnings(s string, vars map[string]string) (string, []string)` to `server/pkg/resources/envfile.go`
- [ ] 1.2 Track unresolved `${VAR}` names by checking if key exists in vars map
- [ ] 1.3 Ignore malformed placeholders (empty name, nested `${}`)

## 2. Provider Loading Integration

- [ ] 2.1 Update provider store to use `SubstituteVarsWithWarnings` when loading JSON files
- [ ] 2.2 Add `MissingVars []string` field to provider status response
- [ ] 2.3 Expose missing vars via `GET /api/providers` and `GET /api/providers/{name}` endpoints

## 3. App Start Integration

- [ ] 3.1 Check env vars during compose file resolution before `docker compose up`
- [ ] 3.2 Add `missingEnvVars []string` to start response in `server/pkg/server/handlers.go`
- [ ] 3.3 Include missing vars in SSE status event for real-time feedback

## 4. TUI Client Layer

- [ ] 4.1 Add `missingEnvVars` to `AppStatus` type in `tui/packages/types/src/index.ts`
- [ ] 4.2 Add `missingEnvVars` to provider response types
- [ ] 4.3 Update `tui/packages/core/src/apps-client.ts` to expose missing vars from start response

## 5. TUI Notification Integration

- [ ] 5.1 In `docker-actions.ts`, check `missingEnvVars` on app start response
- [ ] 5.2 Trigger `uiStore.setNotification("Missing env vars: ...", "warning")` when vars are missing
- [ ] 5.3 In `provider-actions.ts`, check missing vars on provider load and show warning
- [ ] 5.4 Ensure notification auto-dismisses after 3 seconds (existing behavior)

## 6. Testing

- [ ] 6.1 Unit test `SubstituteVarsWithWarnings` with all/multiple/none missing vars
- [ ] 6.2 Test provider loading with missing vars returns warnings
- [ ] 6.3 Test app start with missing vars includes them in response
- [ ] 6.4 Test TUI notification shows warning with correct var names
