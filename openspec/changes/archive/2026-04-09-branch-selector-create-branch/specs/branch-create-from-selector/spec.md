## ADDED Requirements

### Requirement: User can create a new branch from the branch selector modal
The system SHALL provide a `ctrl+n` keybind inside the branch selector modal that opens a "Create Branch" sub-modal, allowing the user to enter a branch name and create it without leaving the TUI.

#### Scenario: ctrl+n opens the create branch sub-modal
- **WHEN** the branch selector modal is open
- **AND** the user presses `ctrl+n`
- **THEN** a "Create Branch" sub-modal appears on top of the branch selector
- **THEN** the sub-modal contains a focused text input for the branch name

#### Scenario: Confirming a branch name creates the branch and closes both modals
- **WHEN** the create branch sub-modal is open
- **AND** the user has entered a non-empty branch name
- **AND** the user presses `Enter`
- **THEN** the system creates the branch using the strategy matching the app's `gitMode`
- **THEN** both the sub-modal and the branch selector modal close
- **THEN** the branch list is refreshed

#### Scenario: Cancelling the create sub-modal returns to the branch selector
- **WHEN** the create branch sub-modal is open
- **AND** the user presses `Esc`
- **THEN** the sub-modal closes
- **THEN** the branch selector modal remains open and its filter input is re-focused

#### Scenario: Pressing Enter with an empty input has no effect
- **WHEN** the create branch sub-modal is open
- **AND** the branch name input is empty
- **AND** the user presses `Enter`
- **THEN** no branch is created
- **THEN** the sub-modal remains open

#### Scenario: Branch selector help text includes the create keybind
- **WHEN** the branch selector modal is rendered
- **THEN** the footer help text includes an entry for `ctrl+n` with action label "Create"

### Requirement: New branch creation uses mode-appropriate command
The system SHALL create a new branch via `git checkout -b <name>` for `BRANCH`-mode apps and via `wt switch --create <name>` for `WORKTREE`-mode apps.

#### Scenario: BRANCH mode creates a local git branch
- **WHEN** the app's `gitMode` is `BRANCH`
- **AND** the user confirms a new branch name in the create sub-modal
- **THEN** the system calls the server endpoint that executes `git checkout -b <name>`
- **THEN** the new branch becomes the active branch

#### Scenario: WORKTREE mode creates a new worktree
- **WHEN** the app's `gitMode` is `WORKTREE`
- **AND** the user confirms a new branch name in the create sub-modal
- **THEN** the system calls the server endpoint that executes `wt switch --create <name>`
- **THEN** a new linked worktree is created for the branch
- **THEN** the new branch becomes the active worktree
