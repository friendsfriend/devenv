## 1. Scripts Tab Add-Flow UI

- [x] 1.1 Add `+` action handling in the Scripts tab to open an add-script modal/flow.
- [x] 1.2 Implement mode selector with `Create new script` and `Use existing script` options.
- [x] 1.3 Implement mode-specific form fields and validation messages (target name/path for both modes, plus source script path for linking).
- [x] 1.4 Prefill target name/path from current Scripts tree selection (selected folder or selected script’s parent folder).

## 2. Path Parsing and Validation

- [x] 2.1 Implement target name parsing for `folder/subfolder/script` and flat `script` formats.
- [x] 2.2 Enforce path safety checks (no empty names, no absolute target paths, no traversal outside `scripts/`, no target collisions).
- [x] 2.3 Validate `Use existing script` source path existence and surface actionable errors.

## 3. Filesystem Operations

- [x] 3.1 Implement create-new-script operation that creates missing folders under config `scripts/` and writes the new script file.
- [x] 3.2 Add starter script template content with example parameter-definition comment block for newly created scripts.
- [x] 3.3 Implement use-existing-script operation that creates symlink at the target path pointing to the source script path.

## 4. Script Tree Refresh and UX Feedback

- [x] 4.1 Trigger script collection reload after successful create/link so new entries appear in correct hierarchy.
- [x] 4.2 Preserve or restore focus to the created entry (or nearest parent) after refresh.
- [x] 4.3 Show success/error feedback for add-script operations in the existing status/log UX.

## 5. Verification

- [x] 5.1 Add/adjust tests for add-flow validation, selected-folder prefill behavior, nested/flat target parsing, and failure handling.
- [x] 5.2 Add/adjust tests for create-new-script template content and symlink creation behavior.
- [x] 5.3 Manually verify end-to-end in Scripts tab: create nested script, create flat script, link existing script, and execute/open resulting entries.
