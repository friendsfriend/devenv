## Context

The `BranchSelectorView` modal (and its keyboard/action wiring in the CLI layer) currently supports only checkout of existing branches. The UI has an `<input>` element for filtering and uses `GenericModal` as its shell. Navigation and actions are handled in `table-keys.ts`, while the branch open/checkout logic lives in `git-actions.ts`. The app's Git strategy (`BRANCH` or `WORKTREE`) is stored on the `App` object as `app.gitMode`.

## Goals / Non-Goals

**Goals:**
- Add `ctrl+n` keybind inside the branch selector to open a "Create Branch" sub-modal
- The sub-modal captures a branch name via a focused `<input>` element
- On confirmation (`Enter`) the CLI layer calls either `git checkout -b <name>` (BRANCH mode) or `wt switch --create <name>` (WORKTREE mode) via the server API
- On cancel (`Esc`) the sub-modal closes and the branch selector is restored
- Update the branch selector help text to include `ctrl+n → Create`

**Non-Goals:**
- Pushing the new branch to a remote automatically
- Validating branch name format beyond what the server enforces
- Creating branches from a specific base ref (always branches from current HEAD)

## Decisions

### 1. Sub-modal rendered as a separate `<Show>` overlay, not nested inside BranchSelectorView

**Decision:** Add a second `<Show>` block in `modal-overlays.tsx` with its own `<GenericModal>` for the create-branch flow, rather than embedding conditional sections inside `BranchSelectorView`.

**Rationale:** This follows the existing `ConfirmDialog` pattern — independent show-flag signal in `ui-store.ts`, keyboard handler guard at the top of `table-keys.ts` (highest-priority, blocks branch selector keys while open). It keeps `BranchSelectorView` a pure presentation component with no branching on create-mode. The alternative (embedding a step inside BranchSelectorView like `AddAppModal`) would require `BranchSelectorView` to own local state and complicate the keyboard handler with nested modes.

**Alternative considered:** A new `BranchCreateView` component. Rejected as overkill — the create modal is a single text input + confirm, identical in complexity to `ConfirmDialog`.

### 2. Branch name input via `<input>` element (not manual char accumulation)

**Decision:** Use an `<input ref>` with `onInput` callback, consistent with the existing search input in `BranchSelectorView`.

**Rationale:** The `<input>` element handles cursor positioning, backspace, and paste natively. The manual accumulation approach (used in `AddAppModal`) is only preferred when the keyboard handler is the sole input mechanism. Since we control focus with `inputRef.focus()` on mount (same pattern as `BranchSelectorView` line 85–88), this is straightforward.

### 3. New API action `createBranch(appIdent, branchName)` in `git-actions.ts`

**Decision:** Add a dedicated `createBranch` action in `git-actions.ts` that checks `app.gitMode` and calls the appropriate server endpoint.

**Rationale:** Keeps all Git orchestration in one place. For `BRANCH` mode the action calls a new `client.gitCreateBranch(appIdent, branchName)` endpoint (maps to `git checkout -b <name>` server-side). For `WORKTREE` mode it calls a new `client.createWorktree(appIdent, branchName)` endpoint (maps to `wt switch --create <name>` server-side). The TUI never shells out directly.

### 4. New `BranchSelectorProps` callback `onCreateBranch`

**Decision:** Add `onCreateBranch?: (branchName: string) => void` to `BranchSelectorProps`, but it is **not used inside BranchSelectorView itself** — the `ctrl+n` key is intercepted in `table-keys.ts` before the `<input>` sees it, matching how `Enter` and `Esc` are currently handled.

**Rationale:** The prop is added for completeness and potential future embedding scenarios. The actual create trigger comes from the keyboard handler layer, not from within the component. This avoids any cross-layer signal leakage.

## Risks / Trade-offs

- **`ctrl+n` vs filter input conflict** — `ctrl+n` is a control sequence, not a printable character, so it will NOT be forwarded to the `<input>` filter field. Safe to intercept in `table-keys.ts`.
- **Server endpoint contract** — The design assumes two new server-side endpoints (`POST /api/git/branches` and `POST /api/git/worktrees`) are available or will be added. If only one unified endpoint exists, the action layer will route accordingly without UI changes.
- **Focus restoration after sub-modal close** — When the create modal closes, the branch selector's `<input>` must regain focus. This is handled by the existing `onMount` pattern (`setTimeout(() => inputRef.focus(), 1)`). Since the branch selector view is not unmounted during the create modal overlay, its input retains its ref; focus can be restored by triggering a re-focus signal or relying on the overlay unmount to return focus naturally.
- **No optimistic UI update** — After `createBranch` succeeds, the branch list is refreshed by calling `openBranchSelector` (which reloads branches). There is a brief moment where the new branch may not appear. This matches the existing checkout-then-reload pattern.
