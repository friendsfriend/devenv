## Why

DevEnv currently treats build, test, and run as Docker-oriented operations, which does not fit terminal UIs and desktop applications that are launched locally rather than hosted as containers. Users need first-class per-app shell action variants while still keeping Docker variants available for apps where both local and container workflows are useful.

## What Changes

- Add per-app action variant discovery for build, test, and run operations.
- Support shell action scripts stored in the config repository alongside existing Docker resources.
- Allow Docker and shell variants to coexist for the same app/action.
- For build/test, run the only configured variant directly, or show a target picker when multiple variants exist.
- For run, combine Docker compose profiles and shell run profiles into one target picker.
- Add a shell run launch mode named `tmux` that opens the script in a new tmux window.
- Track shell/tmux runs enough for stop/restart behavior.
- Add TUI configuration flows for creating and editing per-app shell action scripts.

## Capabilities

### New Capabilities
- `app-action-variants`: Defines discovery, selection, and execution behavior for Docker and shell build/test/run variants.

### Modified Capabilities
- `tmux-window-spawning`: Extends tmux spawning from built-in tools to user-configured app run scripts.

## Impact

- Go backend app/build/resource/action services and API endpoints for action variant discovery and execution.
- TUI action flows, key handlers, picker UI, and app configuration screens.
- TypeScript shared types and API client methods for action variants.
- Config repository layout and guides for app build/test/run resources.
- Runtime state/status handling for shell/tmux launches, stop, and restart.
