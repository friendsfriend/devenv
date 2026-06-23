## Why

Adding a new app can leave the selected branch out of runtime state before the initial async checkout starts. The clone then runs with an empty branch and fails, forcing the user to trigger a manual branch switch to recover.

## What Changes

- Persist the selected branch as initial runtime state when an app is created.
- Ensure initial async checkout/clone uses the selected branch after config reload.
- Keep the existing behavior where `MainWorktreeBranch` may later be corrected to the actual cloned branch if the remote falls back to its default.
- Add regression coverage for new-app checkout state across reload.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `worktree-main-path-resolution`: creation-time runtime state now includes the requested branch and active worktree, not only `MainWorktreeBranch`.
- `worktree-checkout`: initial checkout after app creation succeeds without requiring a manual branch switch.

## Impact

- Backend app creation handler and/or app manager runtime-state persistence.
- SQLite `app_state` values for newly created apps.
- Existing app definition JSON stays static-only; no runtime fields are added back to config files.
- No API contract or dependency changes.
