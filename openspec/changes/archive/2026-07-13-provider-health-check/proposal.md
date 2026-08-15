## Why

Provider tokens (GitHub/GitLab PATs) can expire or be revoked without warning. When a token is invalid, operations fail with cryptic auth errors. Users have no way to check token validity without manually hitting the API. A health check would catch expired tokens early.

## What Changes

- Server-side validation endpoint that hits the GitHub/GitLab API to verify credentials
- Health status indicator in the providers view (✅/❌/⏳)
- `v` key triggers validation on selected provider
- Startup validation of all providers with notification on failure

## Capabilities

### New Capabilities
- `provider-health-validation`: Validates provider credentials against the GitHub/GitLab API and displays health status in the providers view

### Modified Capabilities

## Impact

- `server/pkg/github/client.go` — add `ValidateCredentials` method
- `server/pkg/gitlab/client.go` — add `ValidateCredentials` method
- `server/pkg/server/handlers.go` — new `POST /api/providers/{name}/validate` endpoint
- `tui/packages/core/src/provider-client.ts` — new `validateProvider` method
- `tui/packages/ui/src/components/ProvidersView.tsx` — add status column and `v` keybind
- `tui/packages/cli/src/tui/actions/provider-actions.ts` — validation action
