## Why

The branch selector modal currently only allows users to checkout existing branches. There is no way to create a new branch or worktree directly from the UI, forcing users to leave the TUI and use the command line. Adding an inline create flow improves productivity by keeping the user in context.

## What Changes

- Add `ctrl+n` keybind in the `BranchSelectorView` modal to open a "Create Branch" sub-modal
- The sub-modal prompts the user to enter a new branch name (e.g. `feature/1234-test`)
- On confirmation, the branch is created either as a new local branch (`git checkout -b <name>`) or as a new worktree (`wt switch --create <name>`), depending on the app's configuration
- The `BranchSelectorProps` interface gains two new optional callbacks: `onCreateBranch` and a flag `useWorktree` (or similar) to indicate which creation strategy to apply
- Help text in the branch modal is updated to include the new `ctrl+n` → Create hint

## Capabilities

### New Capabilities

- `branch-create-from-selector`: Ability to create a new branch or worktree directly from the branch selector modal using `ctrl+n`, entering a name in a sub-modal, and invoking the appropriate creation command based on app configuration.

### Modified Capabilities

- `worktree-checkout`: The worktree checkout capability is extended to support creation of new worktrees via `wt switch --create <name>` in addition to switching to existing ones.

## Impact

- `tui/packages/ui/src/components/BranchSelectorView.tsx` — new sub-modal, keybind handler, updated help text, new props
- App-level branch/worktree controllers that wire up the `BranchSelectorView` — need to handle the new `onCreateBranch` callback and pass `useWorktree` flag
- No new dependencies required; uses existing modal/input primitives already present in the codebase
