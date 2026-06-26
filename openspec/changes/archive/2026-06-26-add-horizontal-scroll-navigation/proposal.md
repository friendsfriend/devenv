## Why

Several TUI content panes can contain lines wider than the viewport: logs, diffs, markdown/code blocks, AI summaries, repository paths, URLs, and detail text. OpenTUI supports horizontal scrollbars, but horizontal scrolling is only implemented in the log modal today. Adding it case-by-case would duplicate scrollbox setup and keyboard behavior across views.

The TUI also has existing `h`/`l` conflicts where those keys mean previous/next pages, files, stages, labels, or logs. Establishing a consistent keybind convention prevents horizontal scrolling from fighting related-object navigation.

## What Changes

- Add a reusable scrollable content component/pattern that wraps native OpenTUI `<scrollbox>` defaults and allows each caller to declare supported scroll modes.
- Enable horizontal scrolling only in views where horizontal overflow is meaningful.
- Support horizontal keyboard scrolling with both Vim keys (`h`/`l`) and arrow keys (`←`/`→`) when the active scroll component allows horizontal keyboard scrolling.
- Move previous/next related actions to `[`/`]` and `Shift+K`/`Shift+J`.
- Make job stage navigation `Tab` only.
- Move conflicting `l` actions in issue detail and branch selector to `Shift+L`.
- Keep script argument and script add modal value-editing keybinds unchanged.
- Update the keybind registry/help text to reflect the new conventions.

## Capabilities

### New Capabilities

### Modified Capabilities
- `frontend-reusable-components`: Adds a reusable scrollable content primitive/configuration for native scrollboxes.
- `keybind-registry`: Updates keybind conventions and help text for horizontal scrolling and previous/next navigation.

## Impact

- Affects TUI UI components under `tui/packages/ui/src/components`.
- Affects keyboard handlers and registry entries under `tui/packages/cli/src/tui/keyboard`.
- Affects help/guides where keybinds are documented.
- No server, API, dependency, or storage changes.
- Some user-facing keybinds change intentionally to remove conflicts and standardize navigation.
