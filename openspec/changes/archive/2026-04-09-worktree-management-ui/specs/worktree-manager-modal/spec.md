## ADDED Requirements

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

### Requirement: Navigate worktree list
The user SHALL be able to move the cursor through the worktree list using keyboard navigation.

#### Scenario: Move cursor down
- **WHEN** the Worktree Manager modal is open and the user presses `j` or the down arrow key
- **THEN** the cursor SHALL move to the next worktree in the list

#### Scenario: Move cursor up
- **WHEN** the Worktree Manager modal is open and the user presses `k` or the up arrow key
- **THEN** the cursor SHALL move to the previous worktree in the list

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
