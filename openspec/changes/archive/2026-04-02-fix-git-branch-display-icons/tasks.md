## 1. Server: Fix `GetCurrentBranch()` for linked worktrees

- [x] 1.1 In `server/pkg/git/repository.go`, replace the `existsDir` guard in `GetCurrentBranch()` with an `os.Stat` check that handles both `.git` as a directory (primary worktree / plain clone) and `.git` as a file (linked worktree)
- [x] 1.2 When `.git` is a file, read its contents to extract the `gitdir:` pointer, resolve the path to the per-worktree `HEAD` file, and parse the branch name from it (mirroring the logic in `appManager.getCurrentBranchFromGit()`)
- [x] 1.3 Add a comment explaining that the manual file-reading path is a workaround for go-git's lack of linked-worktree support
- [x] 1.4 Verify the fix manually: run the server with a worktree-mode app and confirm the branch name appears correctly in the TUI

## 2. TUI: Replace `[WT]` text prefix with icons

- [x] 2.1 In `tui/packages/cli/src/tui/columns.ts`, update the `branch` column `render` function to prefix with `` for `WORKTREE` mode and `` for branch mode (or no `gitMode`), removing the `[WT]` text prefix
- [x] 2.2 Verify the icon displays correctly in the terminal for both branch-mode and worktree-mode apps
