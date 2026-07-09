## Purpose
Keyboard routing uses OpenTUI Keymap layers, named commands, runtime state, and priorities so active TUI contexts own keyboard behavior and discoverability.

## Requirements
### Requirement: Keyboard routing uses keymap layers
The system SHALL route normal TUI keyboard actions through OpenTUI Keymap layers and named commands instead of a single manual dispatcher chain.

#### Scenario: Active view dispatches matching layer command
- **WHEN** a key is pressed while a view-specific layer is active
- **THEN** the keymap SHALL dispatch the matching named command for that active view
- **THEN** inactive view layers MUST NOT handle the key

#### Scenario: Commands preserve existing behavior
- **WHEN** a key binding is migrated from the current handler modules to a keymap command
- **THEN** the resulting command SHALL perform the same user-visible action as the previous handler

### Requirement: Layer priority preserves modal and global behavior
The system SHALL model global actions, modal actions, text-entry actions, table actions, and detail-view actions as prioritized keymap layers.

#### Scenario: Modal layer wins over underlying view
- **WHEN** a modal is open and a key is bound by both the modal and underlying view
- **THEN** the modal layer SHALL handle the key before the underlying view layer

#### Scenario: Text entry consumes printable input
- **WHEN** a text-entry mode is active
- **THEN** printable input SHALL be routed to that text-entry layer and MUST NOT trigger normal app actions

#### Scenario: Global help remains available
- **WHEN** no higher-priority layer consumes `?`
- **THEN** the global help command SHALL open help from the current context

### Requirement: Shutdown disables normal keymap actions
The system SHALL prevent normal keymap commands from running after graceful shutdown begins.

#### Scenario: Key arrives during shutdown
- **WHEN** shutdown is active and a key event arrives
- **THEN** the keymap routing SHALL consume or ignore the event without running normal app commands

### Requirement: Keymap runtime state reflects app context
The system SHALL keep keymap runtime data synchronized with current view mode, active modal, active tab, text-entry mode, and shutdown state.

#### Scenario: View mode changes
- **WHEN** the app changes view mode
- **THEN** keymap runtime state SHALL update so active bindings match the new context

#### Scenario: Modal opens or closes
- **WHEN** a modal opens or closes
- **THEN** keymap runtime state SHALL update so modal layers activate or deactivate accordingly

### Requirement: Keyboard layout fallback is registered
The system SHALL register OpenTUI base-layout fallback support so shortcuts remain stable where Kitty keyboard base-layout data is available.

#### Scenario: Keyboard layout differs from binding layout
- **WHEN** the terminal provides base-layout key data and the user's active keyboard layout differs from the binding layout
- **THEN** keymap matching SHALL use base-layout fallback for registered shortcuts where supported
