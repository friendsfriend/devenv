## ADDED Requirements

### Requirement: Keybind discovery derives from keymap metadata
The keybind registry SHALL derive footer and help entries from OpenTUI Keymap command and binding metadata while preserving existing context coverage.

#### Scenario: Footer requests active keybinds
- **WHEN** the status bar requests keybind hints for the current context
- **THEN** the system SHALL query active keymap bindings or command metadata for the current keymap state
- **THEN** the returned entries SHALL match currently reachable commands for that context

#### Scenario: Help searches keymap metadata
- **WHEN** the help view displays or searches keybindings
- **THEN** the help content SHALL include keymap command titles, descriptions, categories, contexts, and key strings from metadata

#### Scenario: Existing required entries remain available
- **WHEN** the keybind metadata source replaces the static registry
- **THEN** required Kubernetes, panel focus, and reverse tab cycling entries SHALL remain visible in their documented contexts

#### Scenario: Documented keybinds do not drift from implementation
- **WHEN** a key binding is changed in a keymap layer
- **THEN** the help/footer projection SHALL use the same binding metadata and MUST NOT require a separate static registry update for the implemented key
