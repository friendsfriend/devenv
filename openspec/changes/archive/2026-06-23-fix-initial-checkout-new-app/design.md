## Context

New app creation currently builds an in-memory app with the selected branch, writes only static fields to JSON, seeds `MainWorktreeBranch`, reloads config, then starts async checkout from the reloaded app. Because `Branch` and `ActiveWorktree` are runtime fields and were not persisted before reload, checkout can see an empty branch and fail.

Static app definition files must remain static-only. Runtime git state belongs in SQLite.

## Goals / Non-Goals

**Goals:**

- Make first checkout after app creation use the branch selected in the add-app flow.
- Keep `Branch`, `ActiveWorktree`, and `MainWorktreeBranch` consistent across the reload that happens before async clone.
- Preserve current primary-worktree path behavior for worktree apps.
- Cover the regression with a small backend test.

**Non-Goals:**

- No TUI flow changes.
- No app config JSON schema change.
- No new database columns or migrations.
- No rewrite of checkout/worktree handling.

## Decisions

- Persist full initial runtime state at app creation.
  - Use existing SQLite state fields: `branch`, `active_worktree`, `main_worktree_branch`.
  - Rationale: `LoadConfig` already overlays these fields before resolving paths and before checkout gets the app.
  - Alternative considered: keep passing the pre-reload `newApp` into async checkout. Rejected because server state and broadcasts would still be inconsistent after reload.

- Keep async clone allowed to correct `MainWorktreeBranch` after clone.
  - Rationale: existing fallback behavior handles missing requested branches by cloning remote default and recording actual primary branch.
  - Alternative considered: never overwrite seeded main branch. Rejected because it preserves wrong primary-branch metadata when remote fallback occurs.

- Test at manager/state boundary.
  - Rationale: root bug is runtime state missing after `LoadConfig`; this is cheaper and more stable than an end-to-end clone test.
  - Alternative considered: mock full HTTP create + async checkout. Rejected as larger and slower for same regression signal.

## Risks / Trade-offs

- Persisting `active_worktree` for a repo before clone means active branch points to a not-yet-existing directory during checkout startup → mitigated by existing `resolveActiveWorktreePath` primary-dir fallback when linked directory does not exist.
- Requested branch may not exist remotely → mitigated by existing clone fallback and post-clone `MainWorktreeBranch` update.
- Branch state briefly exists before clone completes → acceptable; UI already shows checkout in progress and branch selected by user.
