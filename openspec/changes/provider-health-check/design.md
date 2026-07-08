## Context

GitHub API: `GET /user` with token in `Authorization: Bearer <token>` header. Returns 200 if valid, 401 if invalid.
GitLab API: `GET /api/v4/user` with `PRIVATE-TOKEN: <token>` header. Returns 200 if valid, 401 if invalid.

Both clients (`pkg/github`, `pkg/gitlab`) already have HTTP client setup with base URL and auth headers. Adding a lightweight validation call is straightforward.

## Goals / Non-Goals

**Goals:**
- Validate a single provider's credentials via API call
- Show validation status in the providers view
- Validate all providers at startup, warn on failures
- Allow manual re-validation via `v` keybind

**Non-Goals:**
- Auto-refreshing expired tokens
- Token permission/scope validation (just auth check)
- Caching validation results across sessions

## Decisions

### 1. Lightweight API call for validation

Use the simplest authenticated endpoint: GitHub `GET /user`, GitLab `GET /api/v4/user`. These return user profile on success, 401 on failure. No heavy data transfer.

**Alternative considered:** Validate on every API call. Rejected because it adds latency to every operation. Validation should be explicit.

### 2. Validation status stored in provider object

Add `healthStatus: "unknown" | "valid" | "invalid"` to the provider store. Reset to `"unknown"` on TUI restart. Updated on validation.

### 3. Non-blocking startup validation

Validate all providers in background on startup. Show notification for any failures but don't block the TUI from loading.

## Risks / Trade-offs

- **[Risk] Rate limiting on GitHub/GitLab API** → Validate only on user action or startup; don't poll
- **[Trade-off] No automatic token refresh** → Users must manually update expired tokens; acceptable since DevEnv doesn't manage token lifecycle
