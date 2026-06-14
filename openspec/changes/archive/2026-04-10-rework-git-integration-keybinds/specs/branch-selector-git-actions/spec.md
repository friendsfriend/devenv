## ADDED Requirements

### Requirement: Branch selector modal supports switch keybind
The branch selector modal SHALL check out (switch to) the currently selected branch when the user presses `s`, in non-worktree-create mode.

#### Scenario: Switch selected branch with s
- **WHEN** the branch selector modal is open in normal checkout mode
- **AND** the user presses `s`
- **THEN** the selected branch is checked out (same behaviour as `Enter` previously)
- **AND** the branch selector modal is closed on success

#### Scenario: s key is ignored in worktree create mode
- **WHEN** the branch selector modal is open in worktree create mode
- **AND** the user presses `s`
- **THEN** no checkout is performed and no error is shown

### Requirement: Branch selector modal supports lazygit log keybind
The branch selector modal SHALL open lazygit in log-only mode for the currently selected branch when the user presses `l`.

#### Scenario: Open lazygit log for selected branch
- **WHEN** the branch selector modal is open
- **AND** the user presses `l`
- **THEN** lazygit is launched targeting the selected branch's log view
- **AND** the modal remains open after lazygit exits (or closes before launch if renderer suspend is required)

### Requirement: Branch selector modal supports fetch keybind
The branch selector modal SHALL trigger a git fetch for the current app when the user presses `f`.

#### Scenario: Fetch latest remote changes
- **WHEN** the branch selector modal is open
- **AND** the user presses `f`
- **THEN** a git fetch is performed for the currently targeted app
- **AND** the branch list is refreshed after fetch completes

### Requirement: Branch selector modal supports pull keybind
The branch selector modal SHALL pull the latest updates for the selected branch when the user presses `p`.

#### Scenario: Pull updates for selected branch
- **WHEN** the branch selector modal is open
- **AND** the user presses `p`
- **THEN** a git pull is performed for the currently targeted app

### Requirement: Branch selector modal supports push keybind
The branch selector modal SHALL push local commits when the user presses `Shift+P`.

#### Scenario: Push local commits with Shift+P
- **WHEN** the branch selector modal is open
- **AND** the user presses `Shift+P` (sequence `P`)
- **THEN** a git push is performed for the currently targeted app

### Requirement: Branch selector modal help text reflects new keybinds
The modal footer SHALL display all active keybinds including the new action keys.

#### Scenario: Help text shows action keybinds in normal mode
- **WHEN** the branch selector modal is open in normal (non-worktree) mode
- **THEN** the footer displays: `↑/↓ Navigate`, `s Switch`, `l Log`, `f Fetch`, `p Pull`, `P Push`, `ctrl+n Create`, `Esc Cancel`

#### Scenario: Help text in worktree create mode is unchanged
- **WHEN** the branch selector modal is open in worktree create mode
- **THEN** the footer displays: `↑/↓ Navigate`, `Enter Create worktree on branch`, `Esc Cancel`
