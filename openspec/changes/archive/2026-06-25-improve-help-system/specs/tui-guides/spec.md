## ADDED Requirements

### Requirement: TUI displays a list of guides

The TUI SHALL display a list of available guides within the help system, allowing users to browse and open guides by title.

#### Scenario: Guides section in HelpView
- **WHEN** the help view is displayed
- **THEN** a "Guides" section SHALL appear at the bottom of the help content
- **AND** each guide SHALL be listed with its title and short description

#### Scenario: Guide opens in MarkdownModal
- **WHEN** the user selects a guide from the list
- **THEN** the guide content SHALL be rendered in the existing `MarkdownModal` component
- **AND** the user SHALL be able to scroll through the guide content
- **AND** pressing Esc SHALL close the modal and return to the help view

### Requirement: Guides cover all documented workflows

The system SHALL ship with markdown guides covering the following workflows. Each guide SHALL be documented in a separate `.md` file under `tui/packages/cli/src/tui/guides/`.

#### Scenario: Adding an app guide
- **WHEN** the user opens the "Adding an App" guide
- **THEN** it SHALL explain the app definition JSON schema, Dockerfile conventions (build and test), Compose file configuration with profile variants, and how to link to infrastructure services

#### Scenario: Adding a script guide
- **WHEN** the user opens the "Adding a Script" guide
- **THEN** it SHALL explain the script discovery mechanism, the `--devenv-metadata` convention for declaring parameters, and the supported parameter types with examples

#### Scenario: Adding infrastructure services guide
- **WHEN** the user opens the "Adding Infrastructure" guide
- **THEN** it SHALL explain infrastructure definition JSON, compose file placement, and how multiple apps can share the same infrastructure service

#### Scenario: Adding libraries guide
- **WHEN** the user opens the "Adding Libraries" guide
- **THEN** it SHALL explain library definitions, the `appType: "LIB"` convention, build Dockerfile configuration, and test Dockerfile configuration

#### Scenario: Using worktrees guide
- **WHEN** the user opens the "Using Worktrees" guide
- **THEN** it SHALL explain worktree mode vs single-checkout, worktrunk prerequisites, directory layout, branch switching in worktree mode, IDE setup with `.config/wt.toml`, and how to enable worktrees during app creation

#### Scenario: Using AI features guide
- **WHEN** the user opens the "Using AI Features" guide
- **THEN** it SHALL explain the AI agent view, how to start a new session, how to resume existing sessions, and how to use the pi agent integration

#### Scenario: Using GitLab / GitHub integrations guide
- **WHEN** the user opens the "Using Git Integrations" guide
- **THEN** it SHALL explain provider setup, merge request browsing and detail view, the diff viewer, discussions, approvals, AI review, pipeline jobs, and test results

#### Scenario: Using the log viewer guide
- **WHEN** the user opens the "Using the Log Viewer" guide
- **THEN** it SHALL explain container logs, operation logs, log search, visual selection mode, and keyboard shortcuts for log navigation

#### Scenario: Finding devenv logs guide
- **WHEN** the user opens the "Finding Logs" guide
- **THEN** it SHALL explain the log directory structure under `$DEVENV_HOME/logs/`, the status log format, per-app log files, and the server log location

### Requirement: Guides registered in the guide system

All new guides SHALL be registered in the existing `guides/index.ts` registry.

#### Scenario: Guide appears in registry
- **WHEN** the guide registry is enumerated
- **THEN** each new guide SHALL appear as an entry with its key, title, description, and a lazy import function returning its markdown content
