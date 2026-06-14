### Requirement: Open worktree manager modal
The system SHALL open a Worktree Manager modal for the currently focused application when the user presses `w` on the main table.

#### Scenario: Open modal via w key
- **WHEN** the user focuses a row in the main application table and presses `w`
- **THEN** a Worktree Manager modal SHALL appear scoped to that application, listing all of its worktrees

#### Scenario: Modal does not open when no app is focused
- **WHEN** no application row is focused and the user presses `w`
- **THEN** no modal SHALL open

---

### Requirement: Display worktree list
The modal SHALL display all worktrees for the scoped application, each showing branch name, path, and flags indicating whether it is the active or primary worktree.

#### Scenario: Worktrees are listed on modal open
- **WHEN** the Worktree Manager modal opens
- **THEN** the modal SHALL fetch and display all worktrees for the application, including their branch name, path, and active/main status

#### Scenario: Empty state when no worktrees exist
- **WHEN** the Worktree Manager modal opens and the application has no additional worktrees
- **THEN** the modal SHALL display an empty state message indicating there are no worktrees

---

### Requirement: Worktree row color coding
Each worktree row SHALL be color-coded to visually distinguish its role: the active worktree uses the primary color, and the main (primary) worktree uses the success color.

#### Scenario: Active worktree uses primary color
- **WHEN** a worktree row is the currently active worktree
- **THEN** the row text is rendered in `uiColors.primary`

#### Scenario: Main worktree uses success color
- **WHEN** a worktree row is the primary (main) worktree but not the currently active worktree
- **THEN** the row text is rendered in `uiColors.success`

#### Scenario: Inactive non-main worktree uses default color
- **WHEN** a worktree row is neither active nor the primary worktree
- **THEN** the row text is rendered in `uiColors.textPrimary`

---

### Requirement: Navigate worktree list
The user SHALL be able to move the cursor through the worktree list using keyboard navigation.

#### Scenario: Move cursor down
- **WHEN** the Worktree Manager modal is open and the user presses `j` or the down arrow key
- **THEN** the cursor SHALL move to the next worktree in the list

#### Scenario: Move cursor up
- **WHEN** the Worktree Manager modal is open and the user presses `k` or the up arrow key
- **THEN** the cursor SHALL move to the previous worktree in the list

---

### Requirement: Switch to selected worktree
The user SHALL be able to switch to the selected worktree by pressing `Enter`, making it the active worktree.

#### Scenario: Switch worktree via Enter key
- **WHEN** the cursor is on a worktree in the Worktree Manager modal and the user presses `Enter`
- **THEN** the system SHALL call the switch-worktree API for that worktree
- **THEN** the modal SHALL close and the main table SHALL reflect the new active worktree

---

### Requirement: Delete a worktree
The user SHALL be able to delete a selected worktree by pressing `d`, provided the worktree is neither active nor the primary worktree.

#### Scenario: Delete a non-protected worktree
- **WHEN** the cursor is on a worktree that is not the active or primary worktree and the user presses `d`
- **THEN** the system SHALL call the remove-worktree API for that worktree and, on success, refresh the list in the modal

#### Scenario: Attempt to delete the active worktree
- **WHEN** the cursor is on the currently active worktree and the user presses `d`
- **THEN** the system SHALL display an error indicating the active worktree cannot be deleted, and the list SHALL remain unchanged

#### Scenario: Attempt to delete the primary worktree
- **WHEN** the cursor is on the primary (main) worktree and the user presses `d`
- **THEN** the system SHALL display an error indicating the primary worktree cannot be deleted, and the list SHALL remain unchanged

---

### Requirement: Close the modal
The user SHALL be able to close the Worktree Manager modal using `Escape` or `q`.

#### Scenario: Close with Escape
- **WHEN** the Worktree Manager modal is open and the user presses `Escape`
- **THEN** the modal SHALL close and the main table SHALL regain focus

#### Scenario: Close with q
- **WHEN** the Worktree Manager modal is open and the user presses `q`
- **THEN** the modal SHALL close and the main table SHALL regain focus

---

### Requirement: Branch selector does not receive keys while worktree modal is open
When the Worktree Manager modal is open and the branch selector is closed, keyboard events SHALL be consumed by the worktree modal handler and SHALL NOT propagate to the branch selector handler.

#### Scenario: Key events are consumed by worktree modal
- **WHEN** the Worktree Manager modal is open and the branch selector is not open
- **THEN** all relevant key events are handled by the worktree modal keyboard handler
- **THEN** no key event falls through to the branch selector

#### Scenario: Branch selector open inside worktree modal yields control
- **WHEN** the Worktree Manager modal is open and the branch selector is also open (e.g., for new worktree creation)
- **THEN** key events are yielded to the branch selector handler, not the worktree modal handler
