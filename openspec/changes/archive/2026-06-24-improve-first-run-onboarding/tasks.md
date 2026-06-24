## 1. Backend Example Config API

- [x] 1.1 Add a server endpoint that invokes the existing example config generator.
- [x] 1.2 Preserve no-overwrite guards and return clear error responses on generator failure.
- [x] 1.3 Refresh server in-memory app and infrastructure state after successful generation.
- [x] 1.4 Add backend tests for success, guarded-directory failure, and refreshed app/infra responses.

## 2. Core Client Support

- [x] 2.1 Add a core client method for the example config generation endpoint.
- [x] 2.2 Expose the client method through the existing DevEnv client facade.
- [x] 2.3 Add or update client tests for success and non-success responses if client tests exist for this package.

## 3. First-Steps TUI State and Actions

- [x] 3.1 Add derived first-run visibility based on empty apps, infrastructure, libraries, and scripts after startup.
- [x] 3.2 Load provider state needed by the first-steps view without disrupting existing provider management.
- [x] 3.3 Add first-steps actions that reuse existing add-provider and add-app flows.
- [x] 3.4 Add first-steps action for example config generation with loading, success refresh, and error feedback.
- [x] 3.5 Add a continue action that hides first steps for the current session and shows the normal empty table.

## 4. First-Steps UI and Keyboard Handling

- [x] 4.1 Add a compact first-steps view component in the main content area.
- [x] 4.2 Render provider/add-app/example/help/continue actions with provider-aware guidance.
- [x] 4.3 Route keyboard shortcuts to first-steps actions only while the first-steps view is visible.
- [x] 4.4 Ensure existing modals and help view still work when opened from first steps.

## 5. Verification

- [x] 5.1 Add TUI tests or focused component/action checks for empty-state visibility and action routing where practical.
- [x] 5.2 Run TUI type-check.
- [x] 5.3 Run Go tests.
- [x] 5.4 Run the full test suite before finishing.
- [x] 5.5 Check pi-lens issues if available before finishing.
