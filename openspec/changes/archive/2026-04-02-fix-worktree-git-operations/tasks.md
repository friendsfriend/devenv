## 1. Fix MainWorktreeBranch synchronous seeding at app creation

- [x] 1.1 In `server/pkg/server/handlers_apps.go`, add a synchronous call to `SetMainWorktreeBranch(app.Ident, requestedBranch)` immediately after `ActiveWorktree` is seeded, before the async clone goroutine is launched
- [x] 1.2 Verify the async clone path in `server/pkg/server/server.go → updateOrCreateRepoWithStatus` still overwrites `MainWorktreeBranch` with `actualBranch` after clone completes (confirm existing code, no change expected)

## 2. Fix resolveActiveWorktreePath fallback guard

- [x] 2.1 In `server/pkg/app/manager.go → resolveActiveWorktreePath`, add a guard: if `mainWorktreeBranch` is empty, return the primary worktree directory unconditionally
- [x] 2.2 Add a comment documenting the invariant: "primary dir is returned when active == mainWorktreeBranch OR when mainWorktreeBranch is unknown (empty)"

## 3. Verify git operations use correct path

- [x] 3.1 Trace `Pull` in `server/pkg/git/repository.go` — confirm it calls `app.GetLocalDirectoryPath()` and that after fixes 1 & 2 this always returns a valid directory for the main worktree case
- [x] 3.2 Repeat the same verification for `Push` and `Fetch` in `repository.go`
- [x] 3.3 Manually test: with the main worktree selected, trigger a pull — confirm no HTTP 500 and no "failed to open repository" error

## 4. Verify build works without worktree switch

- [x] 4.1 Trace `buildAppInternal` in `server/pkg/build/service.go` — confirm that after fixes 1 & 2 the `folderExists` check passes for a freshly created `WORKTREE`-mode app with the main branch active
- [x] 4.2 Manually test: create a new `WORKTREE`-mode app, immediately trigger a build without switching worktrees — confirm no "Error: Checkout needed"
- [x] 4.3 Manually test: reproduce the original workaround (switch to another worktree and back) — confirm it still works and does not regress

## 5. Edge case: apps with empty MainWorktreeBranch in SQLite (legacy)

- [x] 5.1 Confirm the guard added in task 2.1 covers the legacy case (empty `MainWorktreeBranch`) by testing with a manually zeroed SQLite row
- [x] 5.2 Document in code comments that no DB migration is needed due to the fallback guard

## 6. Regression tests

- [x] 6.1 Add a unit test in `server/pkg/app/manager_test.go` (or equivalent) for `resolveActiveWorktreePath`: covers `active == main`, `active == ""`, `main == ""`, and `active != main` cases
- [x] 6.2 Add or update an integration test that creates a `WORKTREE`-mode app and verifies `MainWorktreeBranch` is persisted synchronously before the clone completes
