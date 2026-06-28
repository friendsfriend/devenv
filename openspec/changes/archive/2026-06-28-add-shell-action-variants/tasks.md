## 1. Resource Discovery and Types

- [x] 1.1 Add backend action target types for action, runtime, label, profile, launch mode, source path, and stable id.
- [x] 1.2 Add resource manager discovery for Docker build/test targets from existing Dockerfile paths.
- [x] 1.3 Add resource manager discovery for Docker run targets from default and profile compose files.
- [x] 1.4 Add resource manager discovery for shell build/test scripts under `apps/build/`.
- [x] 1.5 Add resource manager discovery for shell run profiles under `apps/run/`.
- [x] 1.6 Parse optional shell script metadata comments for `devenv:name` and `devenv:mode` with documented defaults.
- [x] 1.7 Add unit tests for discovery, metadata defaults, duplicate runtime/profile ids, and absent-target behavior.
- [x] 1.8 Add startup migration for legacy Dockerfile, test Dockerfile, and compose resource directories into `apps/build/` and `apps/compose/` without overwriting current files.

## 2. Backend APIs and Execution

- [x] 2.1 Add API endpoint(s) to list normalized action targets for an app/action.
- [x] 2.2 Extend build/test/run request payloads to accept a selected action target id or runtime/profile tuple.
- [x] 2.3 Route Docker targets through existing Dockerfile and compose execution paths without changing existing behavior.
- [x] 2.4 Execute shell build/test scripts from the app checkout directory with app-scoped logging and operation status.
- [x] 2.5 Execute shell run targets with launch mode `tmux` via `tmux new-window -P -F '#{window_id}'`.
- [x] 2.6 Return clear user-visible errors when tmux mode is requested but the server process cannot access tmux.
- [x] 2.7 Track active shell tmux run state with app ident, target id, profile, window id, and start time.
- [x] 2.8 Implement stop and restart behavior for tracked shell tmux runs.
- [x] 2.9 Add backend tests for API responses, shell execution, tmux unavailable errors, and stop/restart state transitions.

## 3. TUI Client and Shared Types

- [x] 3.1 Add shared TypeScript action target and launch mode types.
- [x] 3.2 Add core client methods for listing targets and invoking selected build/test/run targets.
- [x] 3.3 Update app action code to fetch targets before build/test/run operations.
- [x] 3.4 Implement single-target fast path for build/test and no-target error handling.
- [x] 3.5 Preserve operation-in-progress and error status updates for selected action targets.

## 4. Action Target Picker UI

- [x] 4.1 Refactor or replace `ProfilePickerView` with a reusable action target picker based on `ListViewModal`.
- [x] 4.2 Display runtime badges such as `[docker]`, `[shell]`, or `[tmux]` plus target label/profile.
- [x] 4.3 Use the target picker when build/test has multiple targets.
- [x] 4.4 Use the target picker for run targets combining Docker compose profiles and shell run profiles.
- [x] 4.5 Update keyboard handling for navigation, submit, cancel, and selection clamping.

## 5. TUI Configuration Flows

- [x] 5.1 Add TUI affordances to create/edit shell build script `apps/build/<ident>-build.sh`.
- [x] 5.2 Add TUI affordances to create/edit shell test script `apps/build/<ident>-test.sh`.
- [x] 5.3 Add TUI affordances to create/edit shell run profile scripts `apps/run/<ident>-<profile>.sh`.
- [x] 5.4 Generate shell script templates with shebang, metadata comments, safe defaults, and executable permissions.
- [x] 5.5 Validate profile names and prevent path traversal or writes outside the config directory.

## 6. Documentation and Validation

- [x] 6.1 Update app configuration guides with shell build/test/run file layout and examples.
- [x] 6.2 Document tmux launch mode requirements, attach-mode limitation, stop/restart behavior, and troubleshooting.
- [x] 6.3 Update example config generation to include at least one shell action example if appropriate.
- [x] 6.4 Run Go tests for backend/resource/build/server changes.
- [x] 6.5 Run TUI type-check and relevant frontend tests.
- [x] 6.6 Run full test suite before finishing implementation.
