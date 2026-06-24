## Context

DevEnv already has the core pieces needed for first setup:

- Provider management exists in the TUI through the Providers view and Add Provider modal.
- App/library creation exists through the Add App modal.
- Example config generation exists as the `create-example-config` CLI command backed by `server/pkg/exampleconfig`.
- Startup currently loads apps and infrastructure, then shows the main table even when everything is empty.

The change should make first launch feel intentional without inventing a large wizard or duplicating existing flows.

## Goals / Non-Goals

**Goals:**

- Detect the empty first-run state after startup data loads.
- Replace the empty main table with a concise first-steps view.
- Reuse existing provider and add-app modals from the first-steps view.
- Add a safe TUI-accessible path to generate example config.
- Preserve the current CLI example config behavior and data-protection guards.
- Keep implementation small and dependency-free.

**Non-Goals:**

- No multi-page onboarding wizard.
- No account creation, OAuth, token generation, or provider-specific setup automation.
- No automatic example config generation without explicit user action.
- No changes to generated example app contents unless required for TUI access.
- No persistence of dismissed onboarding state; resources existing is the state.

## Decisions

### Decision: Use an empty-state first-steps view, not a wizard

Show first steps when startup is complete and all user-facing resource collections are empty. The view lives in the main content area and offers direct actions.

Rationale: this keeps navigation simple and avoids a second setup system. Existing modals remain the source of truth for provider and app creation.

Alternative considered: auto-open Add Provider on first launch. Rejected because it is pushy and does not support users who want the example config path.

### Decision: Reuse existing provider and add-app flows

The first-steps view should call existing actions such as `openAddProviderModal` and `openAddAppModal` instead of introducing new provider/app forms.

Rationale: fewer files, less validation duplication, less risk.

Alternative considered: embed provider/app form fields directly in first steps. Rejected because it duplicates modal behavior and increases maintenance.

### Decision: Add a small backend endpoint for example config generation

Expose example config generation through a server endpoint that calls the existing `exampleconfig.Generator`. On success, refresh server-side app/infra state and let the TUI reload apps, infra, and scripts.

Rationale: the TUI cannot directly call Go package code. A narrow endpoint keeps logic server-side and reuses existing safety checks.

Alternative considered: show only the CLI command. Rejected because the desired flow says the first-steps view should allow creating the example config.

### Decision: Preserve strict data protection

The TUI action must fail if the generator detects existing guarded config or scripts content. The UI shows the exact failure in user-friendly form and does not partially write files.

Rationale: first-run convenience must not overwrite user data.

Alternative considered: allow generation into partially populated config directories. Rejected for now; conflict resolution can come later if users need it.

### Decision: Keep first-run detection derived from loaded resources

The TUI treats first-run as true when apps, infrastructure, and scripts are empty after startup. Providers may be empty or present; if providers exist but no apps exist, the first-steps view can emphasize adding the first app.

Rationale: no new persistent flag or config file is needed.

Alternative considered: store a `firstRunDismissed` flag. Rejected as YAGNI and likely wrong when users delete all resources later.

## Risks / Trade-offs

- Directory creation during server startup may make example generation look unsafe → make generator/endpoint distinguish empty directories from meaningful user content, and keep existing no-overwrite behavior.
- Empty-state detection could show onboarding after a user intentionally has no resources → provide a visible way to continue to the normal empty table/help.
- Example generation may require reloads after writing files → refresh server in-memory app/infra state and trigger TUI reloads after success.
- More key handling in the main view can become scattered → keep first-steps key handling isolated and route only when the view is visible.

## Migration Plan

No data migration required. Existing configs, providers, apps, and scripts continue to load normally. Rollback removes the first-steps UI and TUI endpoint usage; the existing CLI `create-example-config` command remains unchanged.
