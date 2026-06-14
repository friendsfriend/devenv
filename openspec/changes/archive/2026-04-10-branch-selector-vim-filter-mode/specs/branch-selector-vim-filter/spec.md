## ADDED Requirements

### Requirement: Branch selector input is not auto-focused on open
The branch selector modal SHALL open with the search input blurred (not focused). The user must explicitly enter filter mode to type a search query.

#### Scenario: Modal opens with input idle
- **WHEN** the branch selector modal is opened
- **THEN** the search input is not focused
- **AND** keystrokes are handled by the modal's action key layer, not the input

### Requirement: Pressing / enters filter mode
The branch selector modal SHALL enter filter mode when the user presses `/` while filter mode is inactive.

#### Scenario: / activates filter mode
- **WHEN** the branch selector modal is open
- **AND** filter mode is inactive
- **AND** the user presses `/`
- **THEN** the search input becomes focused
- **AND** `branchSelectorFilterMode` is set to true
- **AND** subsequent keystrokes are typed into the search filter

#### Scenario: / is ignored while filter mode is already active
- **WHEN** filter mode is already active
- **AND** the user presses `/`
- **THEN** `/` is typed into the filter query (not treated as a mode toggle)

### Requirement: Enter exits filter mode without triggering checkout
Pressing `Enter` while filter mode is active SHALL deactivate filter mode and blur the input, without performing a branch checkout.

#### Scenario: Enter confirms filter and exits filter mode
- **WHEN** filter mode is active
- **AND** the user presses `Enter`
- **THEN** the search input is blurred
- **AND** `branchSelectorFilterMode` is set to false
- **AND** the current filter text is preserved
- **AND** no branch checkout is performed

### Requirement: Esc clears the filter and exits filter mode
Pressing `Esc` while filter mode is active SHALL clear the filter query and exit filter mode. Pressing `Esc` while filter mode is inactive SHALL close the modal.

#### Scenario: Esc clears filter and exits filter mode
- **WHEN** filter mode is active
- **AND** the user presses `Esc`
- **THEN** the filter query is cleared
- **AND** the search input is blurred
- **AND** `branchSelectorFilterMode` is set to false
- **AND** the modal remains open

#### Scenario: Esc closes modal when filter mode is inactive
- **WHEN** filter mode is inactive
- **AND** the user presses `Esc`
- **THEN** the branch selector modal is closed

### Requirement: Help text surfaces the filter mode keybind
The branch selector modal footer SHALL display `/ Filter` as a keybind hint when filter mode is inactive.

#### Scenario: Footer shows / Filter in normal mode
- **WHEN** the branch selector modal is open in normal (non-worktree) mode
- **AND** filter mode is inactive
- **THEN** the footer includes `/ Filter` in the help text

#### Scenario: Footer hint not required while filter mode is active
- **WHEN** filter mode is active
- **THEN** the footer MAY omit or replace the `/ Filter` hint with an exit hint (e.g. `Enter Confirm` / `Esc Clear`)
