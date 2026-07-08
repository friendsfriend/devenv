## 1. Keymap Foundation

- [ ] 1.1 Add keymap setup module that registers base-layout fallback and app-specific metadata/activation fields.
- [ ] 1.2 Define command metadata conventions for context, category, title/description, footer label, and discoverability.
- [ ] 1.3 Add keymap runtime-state synchronization for view mode, active tab, active modal, text-entry mode, shutdown state, and focused panel/list context.
- [ ] 1.4 Add test helpers for dispatching keymap events and asserting active commands/keys.

## 2. Global and Shutdown Layers

- [ ] 2.1 Migrate global help, console, running text, copy selection, quit confirmation, and paste routing to named keymap commands/layers.
- [ ] 2.2 Add a high-priority shutdown guard layer that consumes keys while shutdown is active.
- [ ] 2.3 Add tests proving global commands preserve existing behavior and shutdown suppresses normal app actions.
- [ ] 2.4 Remove equivalent global-key logic from the manual dispatcher after parity tests pass.

## 3. Modal and Text-Entry Layers

- [ ] 3.1 Migrate error dialog, confirm dialog, markdown modal, theme picker, profile picker, action-target picker, and first-steps modal bindings to prioritized layers.
- [ ] 3.2 Migrate provider/add-repository/connect-provider, branch/task, log/diff/comment, and miscellaneous modal bindings to prioritized layers.
- [ ] 3.3 Model text-entry/search modes as runtime-gated layers that consume printable input and block normal app actions.
- [ ] 3.4 Add tests for modal priority, text-entry consumption, escape/enter behavior, and inactive underlying view actions.

## 4. Table and List Controls

- [ ] 4.1 Migrate table tab navigation, row navigation, selection, action execution, and detail-opening keys to table/list layers.
- [ ] 4.2 Migrate standard list controls `/` search, `F` filter, and `O` order/sort to layer bindings where each list supports them.
- [ ] 4.3 Migrate Kubernetes tab panel focus and lifecycle actions to keymap commands with active-tab gating.
- [ ] 4.4 Add tests for table/list context switching, standard controls, Kubernetes-specific actions, and inactive tab gating.

## 5. Detail and Workflow Views

- [ ] 5.1 Migrate app detail, issue list/detail/timeline, references, and linked-issue bindings to keymap layers.
- [ ] 5.2 Migrate change request list/detail, changed files, discussions, test results, and jobs bindings to keymap layers.
- [ ] 5.3 Migrate worktree manager and panel focus navigation bindings to keymap layers.
- [ ] 5.4 Add parity tests for navigation, close/back, panel focus, search/filter/sort, and view-specific actions across detail/workflow views.

## 6. Help and Footer Discovery

- [ ] 6.1 Build keymap metadata projection that returns footer entries for current active context.
- [ ] 6.2 Build keymap metadata projection for help sections, categories, search, and all-context display.
- [ ] 6.3 Preserve required Kubernetes, panel focus, and reverse tab cycling entries in keymap metadata.
- [ ] 6.4 Replace or reduce `keyboard/registry.ts` to a compatibility adapter, then remove static entries once metadata parity is complete.
- [ ] 6.5 Add tests proving help/footer output updates from keymap metadata and does not drift from implemented bindings.

## 7. Manual Dispatcher Removal

- [ ] 7.1 Remove the old sequential handler invocation from `app-opentui.tsx` once all contexts are covered by keymap layers.
- [ ] 7.2 Delete or simplify obsolete handler modules while preserving reusable utilities.
- [ ] 7.3 Ensure no duplicate handling occurs between keymap layers and remaining intercepts/raw input hooks.
- [ ] 7.4 Add regression tests for common key conflicts and command fallthrough behavior.

## 8. Verification

- [ ] 8.1 Run `cd tui && bun test`.
- [ ] 8.2 Run `cd tui && bun run type-check`.
- [ ] 8.3 Manually smoke test global help/quit, modal priority, table/list controls, issue/CR flows, and shutdown.
- [ ] 8.4 Run full project test suite and check pi-lens issues before finishing implementation.
