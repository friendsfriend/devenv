## Context

The Scripts tab currently supports discovery, browsing, execution, and editor open actions for config-backed scripts, but it does not support authoring or linking scripts from the TUI. Users must leave DevEnv to create files and arrange folders manually, which interrupts flow and increases setup friction.

This change introduces write operations in a previously read-mostly script listing path, so design must cover safe path handling, symlink behavior, and immediate tree consistency after creation.

## Goals / Non-Goals

**Goals:**
- Add a single add-script interaction (triggered by `+`) in Scripts tab.
- Offer two creation modes: create new script file and create symlink to existing script.
- Support `folder/subfolder/script` and flat `script` input, reflecting hierarchy in the Scripts tree.
- Prefill target name/path with the currently selected folder in the Scripts tree.
- Include starter parameter comment examples in newly created script files.
- Validate user input and prevent invalid or unsafe filesystem writes.

**Non-Goals:**
- Editing existing scripts in-place.
- Cross-platform symlink emulation where symlinks are unsupported.
- Auto-detecting script arguments from script body.
- Introducing new remote APIs or background services.

## Decisions

1. **Use a modal-based add flow with explicit mode selection**
   - Decision: On `+`, open an add modal with choice between "Use existing script" and "Create new script".
   - Rationale: Keeps interaction consistent with existing TUI command patterns and reduces accidental writes.
   - Alternative considered: separate keybindings per mode; rejected due to discoverability and keybinding overhead.

2. **Prefill target name/path from current Scripts tree selection**
   - Decision: When opening add flow, initialize target name/path to the currently selected folder path. If a script row is selected, use its parent folder. If no folder context exists, default to empty.
   - Rationale: Reduces typing and encourages placing new entries in the active tree context.
   - Alternative considered: always empty default; rejected due to unnecessary friction.

3. **Treat entered script name as a relative path under config `scripts/`**
   - Decision: Parse name as slash-delimited path, normalize it, and resolve under `scripts/` root.
   - Rationale: Enables nested tree authoring with one field while preserving current collection hierarchy logic.
   - Alternative considered: separate folder and filename fields; rejected as slower and more complex for users.

4. **For "Use existing script", create symlink at target path to source path**
   - Decision: Require both target name/path and source script path. Validate source exists and target does not exist.
   - Rationale: Preserves single source of truth and allows aliasing scripts into organized config tree locations.
   - Alternative considered: copy file contents; rejected because copies drift and break reuse.

5. **For "Create new script", create file with starter comment block**
   - Decision: Generate new script in target location with executable-friendly starter content including parameter definition examples.
   - Rationale: Immediate guidance improves adoption and reduces mistakes when defining script parameters.
   - Alternative considered: empty file; rejected because it provides no usage guidance.

6. **Refresh script collection after successful write/link**
   - Decision: After operation success, invalidate/reload script tree and keep focus on created item when possible.
   - Rationale: Gives immediate feedback and confirms tree placement.
   - Alternative considered: deferred refresh; rejected due to stale UI confusion.

7. **Guardrails for path safety and collisions**
   - Decision: Reject empty names, absolute target paths, traversal (`..`), and existing target collisions.
   - Rationale: Prevents writes outside config root and accidental overwrite.

## Risks / Trade-offs

- **[Risk] Symlink behavior differs by platform/permissions** → Mitigation: detect symlink errors and return actionable error text; keep operation atomic and non-destructive.
- **[Risk] User confusion about extensionless names** → Mitigation: provide inline validation/help text and examples for expected name formats.
- **[Risk] Tree refresh could lose current selection context** → Mitigation: restore focus by target path when available, else keep nearest parent folder selected.
- **[Trade-off] Strict path validation may reject some edge-case names** → Mitigation: document allowed format and provide clear validation messages.
