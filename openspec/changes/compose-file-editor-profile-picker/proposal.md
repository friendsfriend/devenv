## Why

Compose files live in `~/.config/devenv/apps/compose/` and are edited externally. Users must navigate to the right directory, know the naming convention (`{appIdent}-{profile}-compose.yml`), and manually create new profile files. An in-TUI profile picker that lists existing profiles and offers "create new" would reduce context switching and prevent naming mistakes.

## What Changes

- New `ComposeProfilePickerView` modal showing discovered profiles for the selected app
- Option to select an existing profile and open it in the user's editor
- Option to create a new profile (prompts for name, creates the file, opens editor)
- Keyboard shortcut `E` from app in table view triggers the picker

## Capabilities

### New Capabilities
- `compose-profile-picker`: Modal that lists compose profiles for an app, allows opening existing profiles in editor, and creating new profile files

### Modified Capabilities

## Impact

- `tui/packages/ui/src/components/ComposeProfilePickerView.tsx` — new component
- `tui/packages/cli/src/tui/stores/ui-store.ts` — new signals for compose profile picker state
- `tui/packages/cli/src/tui/keyboard/` — new keybind file for compose profile picker
- `server/pkg/server/handlers.go` — new endpoint for discovering compose profiles
- `tui/packages/core/src/apps-client.ts` — new API client method
