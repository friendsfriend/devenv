## ADDED Requirements

### Requirement: Help view provides search/filter over all keybinds

The `HelpView` component SHALL include a text input at the top that lets users filter the displayed keybind sections in real time.

#### Scenario: Search input is visible
- **WHEN** the help view is rendered
- **THEN** a text input SHALL appear at the top of the help content area with placeholder text indicating the search function

#### Scenario: Filtering by key or description
- **WHEN** the user types text into the search input
- **THEN** the displayed keybind sections SHALL update in real time to show only entries where the typed text matches the `keys` field, the `description` field, or the `category` field (case-insensitive substring match)

#### Scenario: Clear search restores full list
- **WHEN** the user clears the search input (deletes all text or presses Escape)
- **THEN** the help view SHALL restore the full unfiltered keybind list

#### Scenario: No matches shows empty state
- **WHEN** the search text matches zero keybind entries
- **THEN** the help view SHALL display a message indicating no matching keybinds were found, rather than showing empty sections

### Requirement: Help view defaults to current context

When the help view opens, it SHALL default to showing keybinds for the current view context, with a way to show all keybinds.

#### Scenario: Opens with current context selected
- **WHEN** the help view opens
- **THEN** the keybind list SHALL initially be filtered to show entries whose `context` matches the previous view mode (the view the user was in before pressing `?`)

#### Scenario: User can show all contexts
- **WHEN** the help view is open and focused on a specific context
- **THEN** the user SHALL be able to toggle or switch to show keybinds from all contexts at once
