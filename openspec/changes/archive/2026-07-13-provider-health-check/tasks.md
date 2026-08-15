## 1. Server-Side Validation

- [ ] 1.1 Add `ValidateCredentials(ctx) error` to `server/pkg/github/client.go` — calls `GET /user`
- [ ] 1.2 Add `ValidateCredentials(ctx) error` to `server/pkg/gitlab/client.go` — calls `GET /api/v4/user`
- [ ] 1.3 Add `POST /api/providers/{name}/validate` handler to `server/pkg/server/handlers.go`
- [ ] 1.4 Handle public providers (no token) as always valid
- [ ] 1.5 Return `{ valid: boolean, error?: string }` response

## 2. TUI Client Layer

- [ ] 2.1 Add `validateProvider(name: string): Promise<{ valid: boolean; error?: string }>` to `tui/packages/core/src/provider-client.ts`

## 3. Provider Store Health Status

- [ ] 3.1 Add `healthStatus` signal per provider: `"unknown" | "valid" | "invalid"` in `provider-store.ts`
- [ ] 3.2 Add `healthError` signal for error message display
- [ ] 3.3 Add `validating` signal to track in-progress validation

## 4. Validation Action

- [ ] 4.1 Add `validateProvider(name)` action to `tui/packages/cli/src/tui/actions/provider-actions.ts`
- [ ] 4.2 Set `validating: true` before API call, `false` after
- [ ] 4.3 Update `healthStatus` and `healthError` based on result

## 5. ProvidersView Integration

- [ ] 5.1 Add health status column to `ProvidersView.tsx` (✅/❌/⏳ based on status)
- [ ] 5.2 Add `v` keybinding to trigger validation on selected provider
- [ ] 5.3 Show spinner during validation
- [ ] 5.4 Disable `v` keybind while validation is in progress

## 6. Startup Validation

- [ ] 6.1 In `init-actions.ts`, validate all providers in background after TUI loads
- [ ] 6.2 Collect invalid providers and show warning notification via `uiStore.setNotification`
- [ ] 6.3 Skip validation for public providers (no token)

## 7. Export & Polish

- [ ] 7.1 Export new types if needed
- [ ] 7.2 Style health indicators with theme colors (green=valid, red=invalid, muted=unknown)
- [ ] 7.3 Test with valid token
- [ ] 7.4 Test with expired/invalid token
- [ ] 7.5 Test with public provider (no credentials)
