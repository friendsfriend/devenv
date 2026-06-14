## 1. Server: Pass known branch to post-checkout broadcast

- [x] 1.1 Add `broadcastAppStatusWithBranch(appIdent, branch string)` helper to `server/pkg/server/server.go` that uses the provided branch (when non-empty) instead of calling `GetCurrentBranch`
- [x] 1.2 Update `handleGitCheckout` in `server/pkg/server/handlers_git.go` to call `broadcastAppStatusWithBranch(appIdent, branch)` instead of `broadcastAppStatus(appIdent)` after a successful worktree checkout

## 2. Tests

- [x] 2.1 Add a unit test in `server/pkg/server/` (or extend an existing test file) that verifies `broadcastAppStatusWithBranch` sends a `status.updated` event with the provided branch name when the app has a valid in-memory branch
- [x] 2.2 Verify existing tests still pass (`go test ./server/...`)

## 3. Manual verification (worktree mode)

- [x] 3.1 Switch a worktree-mode app to a new branch and confirm the TUI branch column updates immediately (no polling delay)
- [x] 3.2 Confirm the branch column also updates correctly when switching back to the main branch
