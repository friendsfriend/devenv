## 1. Inventory

- [x] 1.1 Inspect all native `<scrollbox>` usages and classify each as vertical-only, horizontal-capable, or unchanged/special-case.
- [x] 1.2 Inspect keyboard handlers and registry entries for `h`, `l`, `left`, `right`, `[`, `]`, `Shift+J`, and `Shift+K` conflicts.
- [x] 1.3 Confirm which views have existing scrollbox refs and which would need ref forwarding or registration.

## 2. Reusable Scroll Component

- [x] 2.1 Add or adapt a reusable scrollable content component/pattern that wraps native `<scrollbox>` with shared scrollbar defaults.
- [x] 2.2 Allow callers to declare render scroll axes (`x`, `y`) and keyboard scroll axes separately.
- [x] 2.3 Support ref forwarding/callbacks so existing context keyboard handlers can scroll the active content.
- [x] 2.4 Ensure horizontally scrollable content can exceed viewport width instead of being forced to `100%`.
- [x] 2.5 Export the reusable component only where needed.

## 3. Horizontal Scroll Enablement

- [x] 3.1 Keep/normalize horizontal scrolling in the log modal using the reusable pattern where practical.
- [x] 3.2 Enable horizontal scroll in the diff modal content.
- [x] 3.3 Enable horizontal scroll in markdown modal content where long code, tables, or URLs can overflow.
- [x] 3.4 Enable horizontal scroll in AI summary overlays where output can contain long log/code lines.
- [x] 3.5 Enable horizontal scroll in app/detail panes where paths, refs, ports, or log lines can overflow.
- [x] 3.6 Leave script args and script add modal value editing unchanged.

## 4. Keyboard Behavior

- [x] 4.1 Add shared helper logic for horizontal scroll keys: `h`/`l` and `←`/`→`.
- [x] 4.2 Use `h`/`l` and `←`/`→` for horizontal scroll only when the current scroll target allows horizontal keyboard scrolling.
- [x] 4.3 Move previous/next related actions to `[`/`]` and `Shift+K`/`Shift+J`.
- [x] 4.4 Update diff modal previous/next file navigation to use `[`/`]` and `Shift+K`/`Shift+J`.
- [x] 4.5 Update MR and issue pagination to use `[`/`]` and `Shift+K`/`Shift+J`.
- [x] 4.6 Restrict job stage switching to `Tab` only.
- [x] 4.7 Move issue detail label picker from `l` to `Shift+L`.
- [x] 4.8 Move branch selector branch log from `l` to `Shift+L`.
- [x] 4.9 Verify script args and script add modal key handling remains unchanged.

## 5. Help and Documentation

- [x] 5.1 Update `KEYBINDS` registry entries for all changed bindings.
- [x] 5.2 Update footer/status bar hints that mention changed bindings.
- [x] 5.3 Update TUI guide markdown files that mention old `h`/`l` behavior.
- [x] 5.4 Ensure help search reflects horizontal scroll as `h/l` and `←/→` where applicable.

## 6. Validation

- [x] 6.1 Run type-checks.
- [x] 6.2 Run the full test suite.
- [x] 6.3 Manually smoke-test horizontal scrollbars and keyboard scrolling in changed views.
- [x] 6.4 Check pi-lens issues if available.
