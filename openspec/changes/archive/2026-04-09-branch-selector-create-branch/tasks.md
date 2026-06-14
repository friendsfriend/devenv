## 1. UI Store — New Signals

- [x] 1.1 Add `showCreateBranchModal` boolean signal to `ui-store.ts`
- [x] 1.2 Add `createBranchName` string signal to `ui-store.ts` (holds the typed branch name)

## 2. BranchSelectorView — Props & Help Text

- [x] 2.1 Add optional `onCreateBranch?: (branchName: string) => void` to `BranchSelectorProps` interface in `BranchSelectorView.tsx`
- [x] 2.2 Update the `formatHelpText` array in `BranchSelectorView` to include `{ key: 'ctrl+n', action: 'Create' }`

## 3. Create Branch Modal Component

- [x] 3.1 Create `BranchCreateModal.tsx` in `tui/packages/ui/src/components/` as a `<GenericModal>` with a focused `<input>` for the branch name and help text `Enter → Confirm  Esc → Cancel`
- [x] 3.2 Export `BranchCreateModal` from the UI package index

## 4. Modal Overlay — Render Create Branch Modal

- [x] 4.1 Import `BranchCreateModal` in `modal-overlays.tsx`
- [x] 4.2 Add a `<Show when={uiStore.showCreateBranchModal()}>` block in `modal-overlays.tsx` that renders `BranchCreateModal` (above the branch selector in z-order)

## 5. Keyboard Handling

- [x] 5.1 In `table-keys.ts`, add a guard block at the top of the branch selector section: if `uiStore.showCreateBranchModal()` is true, handle `Enter` (call `gitActions.createBranch`) and `Esc` (close modal, restore focus), and consume all other keys to prevent branch selector interaction
- [x] 5.2 In the existing branch selector key block, intercept `ctrl+n` (`key === '\x0E'`) to set `uiStore.showCreateBranchModal(true)` and reset `uiStore.createBranchName('')`

## 6. Git Actions — createBranch Action

- [x] 6.1 Add `createBranch()` async action to `git-actions.ts` that reads `uiStore.createBranchName()` and `targetAppForBranch().gitMode`
- [x] 6.2 In `createBranch()`, for `BRANCH` mode call `client.gitCreateBranch(appIdent, branchName)` 
- [x] 6.3 In `createBranch()`, for `WORKTREE` mode call `client.createWorktree(appIdent, branchName)` (uses `wt switch --create` server-side)
- [x] 6.4 After success, close both modals (`showCreateBranchModal(false)`, `closeBranchSelector()`) and refresh branches

## 7. Git Client — New API Calls

- [x] 7.1 Add `gitCreateBranch(appIdent: string, branchName: string): Promise<void>` to `git-client.ts` — `POST /api/git/branches` with `{ appIdent, branchName }`
- [x] 7.2 Add `createWorktree(appIdent: string, branchName: string): Promise<void>` to `git-client.ts` — `POST /api/git/worktrees` with `{ appIdent, branchName }`
