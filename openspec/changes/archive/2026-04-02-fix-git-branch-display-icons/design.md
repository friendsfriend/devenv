## Context

The TUI displays a `Branch` column in the application and library tables. With the recent introduction of git worktree support, two problems emerged:

1. **Broken branch resolution for linked worktrees**: The live git poller and all status endpoints use `gitRepository.GetCurrentBranch()` (`server/pkg/git/repository.go:499`), which guards with `existsDir()` — checking that `.git` is a directory. In a linked worktree, `.git` is a file containing a `gitdir:` pointer, so the guard fails and the function returns `""`. This causes every worktree-mode app to show `...` as its branch.

2. **Text-based mode indicator**: The column render (`tui/packages/cli/src/tui/columns.ts:30`) uses a `[WT]` text prefix for worktree mode, which is visually noisy. The desired UX is icon-based:  for branch mode,  for worktree mode.

The startup-time `appManager.getCurrentBranchFromGit()` (`server/pkg/app/manager.go:504`) already correctly handles linked worktrees by following the `gitdir:` pointer — it just isn't used by the live polling path.

## Goals / Non-Goals

**Goals:**
- Fix `GetCurrentBranch()` to return the correct branch name for linked worktrees
- Update the branch column render to use  /  icons instead of `[WT]` text prefix
- Ensure both the initial load and live SSE polling paths return correct branch names

**Non-Goals:**
- Refactoring the broader git poller architecture
- Changing how `gitMode` is determined or stored
- Handling detached HEAD state (already returns `""` in both paths)

## Decisions

### Decision 1: Extend `GetCurrentBranch()` rather than switching callers to `getCurrentBranchFromGit()`

**Chosen**: Add linked-worktree handling directly to `gitRepository.GetCurrentBranch()` in `repository.go`.

**Alternative considered**: Change all call sites (poller, status handlers) to call `appManager.getCurrentBranchFromGit()` instead.

**Rationale**: `getCurrentBranchFromGit()` is a private method on `appManager` and operates on a raw path string, while `GetCurrentBranch()` is part of the `GitRepository` interface that the rest of the server depends on. Extending the existing interface method is the least-invasive, most cohesive change — no call sites need updating, and the fix is in one place.

**Implementation**: Replace the `existsDir` guard with an `os.Stat` check. If `.git` is a file, read it to extract the `gitdir:` pointer and resolve the per-worktree `HEAD` file. This mirrors the logic already proven in `getCurrentBranchFromGit()`.

### Decision 2: Icon placement — icon prefix, branch name after

**Chosen**: `" <branch>"` (e.g., ` main`) and `" <branch>"` (e.g., ` feature/login`).

**Alternative considered**: No icon for branch mode (icon only for worktree mode, as a badge).

**Rationale**: Symmetric treatment of both modes makes the column scannable. Users can instantly distinguish mode without relying on knowing which apps are in which mode.

### Decision 3: Keep `'...'` as the fallback branch value

**Chosen**: Retain the `app.branch || '...'` fallback, now displayed as ` ...` or ` ...`.

**Rationale**: The fallback already communicates "branch not yet known" (e.g., app not yet cloned). Changing it would be a separate concern. Once the server fix lands, worktree-mode apps will resolve to a real branch name and the fallback will only appear legitimately.

## Risks / Trade-offs

- **[Risk] go-git library used for primary worktrees**: The `getRepository()` call (which uses `go-git`) is only reached for primary worktrees now. If go-git ever adds linked-worktree support, the manual file-reading path should be removed to avoid drift. → Mitigation: add a comment noting this is a workaround for go-git's lack of linked-worktree support.
- **[Risk] Icon rendering in terminal**: The  and  Unicode characters require a Nerd Font or compatible terminal. → Mitigation: this is consistent with the existing provider icons (, ) already used in the same file, so the font requirement is already established.
- **[Trade-off]** The branch column becomes slightly wider with an icon prefix, but the column width is already configured at `20%` which is sufficient.
