## Why

First startup currently drops users into the full table experience before they have configured providers, apps, infrastructure, or scripts. A focused first-steps view reduces overwhelm and gives users one clear path to either connect a Git provider and add their first app, or generate the existing runnable example config.

## What Changes

- Add a first-run onboarding experience shown when DevEnv has no user resources loaded.
- Let users launch the existing add-provider flow from first steps.
- Let users launch the existing add-app flow from first steps after a provider is available.
- Expose example config generation from the TUI, reusing the existing generator and preserving its data-protection guards.
- Refresh loaded apps, infrastructure, scripts, and provider state after successful onboarding actions.
- Show clear errors when example config generation is blocked because guarded directories are not empty.

## Capabilities

### New Capabilities
- `first-run-onboarding`: Covers first-run detection, first-steps UI, onboarding actions, and safe example-config generation from the TUI.

### Modified Capabilities
- `example-config-generation`: Adds TUI/API access to the existing example config generator while preserving current CLI behavior and safety rules.

## Impact

- TUI routing/content area gains a first-steps empty state or view.
- TUI keyboard handling gains first-steps actions.
- Core client gains a method for example config generation.
- Server gains a small API endpoint for generating example config and refreshing in-memory app/infra state.
- Existing provider, add-app, and exampleconfig code is reused; no new runtime dependencies are expected.
