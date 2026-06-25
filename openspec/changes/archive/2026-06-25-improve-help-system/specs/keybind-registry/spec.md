## ADDED Requirements

### Requirement: Keybind registry exists as a single source of truth

The system SHALL maintain a centralized keybind registry at `tui/packages/cli/src/tui/keyboard/registry.ts` that documents all keyboard shortcuts across all TUI views, serving as the single source of truth for help text display, status bar hints, and keybind search.

#### Scenario: Registry exports typed keybind definitions
- **WHEN** the registry module is imported
- **THEN** it SHALL export a `KeybindDef` type with fields `keys: string[]`, `description: string`, `context: string`, and `category: string`
- **AND** it SHALL export a `KEYBINDS: KeybindDef[]` constant containing all registered keybinds

#### Scenario: Registry covers all view contexts
- **WHEN** the registry is built
- **THEN** it SHALL contain keybind entries for every view mode string returned by `appStore.viewMode()` that has keyboard interaction
- **AND** each entry's `context` field SHALL use the exact same string value as its corresponding view mode

#### Scenario: Registry is manually maintained
- **WHEN** a new keybind is added to a keyboard handler file
- **THEN** the corresponding entry SHALL be added to the registry manually as a separate step
- **AND** the existing keyboard handler SHALL NOT be modified to read from the registry

### Requirement: Registry is consumed by help text and status bar

The registry SHALL replace the duplicated keybind descriptions currently hardcoded in `help-actions.ts`.

#### Scenario: Help view reads from registry
- **WHEN** `getHelpContent()` is called
- **THEN** it SHALL return help sections derived from the registry by filtering and grouping `KEYBINDS` by `context` and `category`, instead of returning hardcoded text

#### Scenario: Status bar reads from registry
- **WHEN** `getKeybinds()` is called
- **THEN** it SHALL return keybind hints derived from the registry by filtering `KEYBINDS` by the current view's `context`, instead of returning hardcoded text
