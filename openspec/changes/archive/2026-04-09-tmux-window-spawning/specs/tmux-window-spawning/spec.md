## ADDED Requirements

### Requirement: Tmux environment detection
The system SHALL detect whether it is running inside a tmux session and whether the `tmux` binary is available before attempting to spawn windows. Detection MUST check both `process.env.TMUX` (set by tmux on session entry) and the availability of the `tmux` binary in PATH. If either condition is not met, the system SHALL fall back to the existing suspend/resume behavior.

#### Scenario: Running inside tmux with tmux installed
- **WHEN** `process.env.TMUX` is set and the `tmux` binary is found in PATH
- **THEN** the system SHALL use tmux window spawning for tool launches

#### Scenario: Running inside tmux but tmux binary not found
- **WHEN** `process.env.TMUX` is set but `tmux` is not found in PATH
- **THEN** the system SHALL fall back to the existing `spawnSync` + renderer suspend/resume behavior

#### Scenario: Not running inside a tmux session
- **WHEN** `process.env.TMUX` is not set
- **THEN** the system SHALL fall back to the existing `spawnSync` + renderer suspend/resume behavior regardless of whether tmux is installed

---

### Requirement: Spawn lazygit in a named tmux window
When tmux environment is detected, the system SHALL open lazygit in a new tmux window within the current session instead of suspending the TUI.

#### Scenario: Lazygit launched in tmux
- **WHEN** the user triggers the lazygit action and tmux environment is detected
- **THEN** a new tmux window SHALL be created named `lazygit - <app.name>` with lazygit running in it, with the working directory set to `app.localDirectoryPath`

#### Scenario: Lazygit launched outside tmux
- **WHEN** the user triggers the lazygit action and tmux environment is not detected
- **THEN** the renderer SHALL suspend, lazygit SHALL run in the current terminal via `spawnSync`, and the renderer SHALL resume after lazygit exits

---

### Requirement: Spawn lazydocker in a named tmux window
When tmux environment is detected, the system SHALL open lazydocker in a new tmux window within the current session instead of suspending the TUI.

#### Scenario: Lazydocker launched in tmux
- **WHEN** the user triggers the lazydocker action and tmux environment is detected
- **THEN** a new tmux window SHALL be created named `lazydocker - <app.name>` with lazydocker running in it, with the working directory set to `app.localDirectoryPath`

#### Scenario: Lazydocker launched outside tmux
- **WHEN** the user triggers the lazydocker action and tmux environment is not detected
- **THEN** the renderer SHALL suspend, lazydocker SHALL run in the current terminal via `spawnSync`, and the renderer SHALL resume after lazydocker exits

---

### Requirement: Spawn nvim in a named tmux window
When tmux environment is detected, the system SHALL open nvim in a new tmux window within the current session instead of suspending the TUI.

#### Scenario: Nvim launched in tmux with a target path
- **WHEN** the user triggers the nvim editor action with a target path and tmux environment is detected
- **THEN** a new tmux window SHALL be created named `nvim - <app.name>` with nvim running and the target path passed as an argument, with the working directory set to `app.localDirectoryPath`

#### Scenario: Nvim launched outside tmux
- **WHEN** the user triggers the nvim editor action and tmux environment is not detected
- **THEN** the renderer SHALL suspend, nvim SHALL run in the current terminal via `spawnSync`, and the renderer SHALL resume after nvim exits

---

### Requirement: Tmux window naming convention
The system SHALL name all spawned tmux windows using the format `<tool> - <project-name>` where `<tool>` is the tool name (`lazygit`, `lazydocker`, or `nvim`) and `<project-name>` is `app.name` from the selected app.

#### Scenario: Window name format for lazygit
- **WHEN** lazygit is spawned in tmux for an app named `installer-space-mw`
- **THEN** the tmux window name SHALL be `lazygit - installer-space-mw`

#### Scenario: Window name format for lazydocker
- **WHEN** lazydocker is spawned in tmux for an app named `installer-space-mw`
- **THEN** the tmux window name SHALL be `lazydocker - installer-space-mw`

#### Scenario: Window name format for nvim
- **WHEN** nvim is spawned in tmux for an app named `installer-space-mw`
- **THEN** the tmux window name SHALL be `nvim - installer-space-mw`

---

### Requirement: TUI remains active during tmux window spawn
When a tool is spawned in a new tmux window, the devenv TUI SHALL remain running and interactive in its original tmux window. The renderer SHALL NOT be suspended.

#### Scenario: TUI stays alive after tmux spawn
- **WHEN** lazygit, lazydocker, or nvim is spawned in a new tmux window
- **THEN** the devenv TUI SHALL remain fully interactive in its original window without suspending

#### Scenario: TUI is unaffected when user closes the spawned tool
- **WHEN** the user exits lazygit, lazydocker, or nvim in the spawned tmux window
- **THEN** the devenv TUI SHALL continue running normally in its original window
