## 1. Action Producer Foundation

- [x] 1.1 Inventory every status-log and operation-log producer/consumer with supported migration mapping
- [x] 1.2 Add reusable server action lifecycle API for non-build operations
- [x] 1.3 Add action metadata/types needed for tasks, Git, worktrees, infrastructure, Kubernetes, and utilities
- [x] 1.4 Test generic action creation, commands, output, completion, failure, and persistence

## 2. Producer Migration

- [x] 2.1 Migrate remaining build, start, stop, test, and restart operation-log writes
- [x] 2.2 Migrate infrastructure and Kubernetes lifecycle status/operation entries
- [x] 2.3 Migrate task and script execution entries with arguments, duration, output, and exit status
- [x] 2.4 Migrate Git branch, pull, push, fetch, checkout, and worktree entries
- [x] 2.5 Migrate supported utility operations and keep discovery-only messages in diagnostic logging
- [x] 2.6 Add parity tests proving each supported producer creates complete action data

## 3. Compact Main-Table Surface

- [x] 3.1 Implement reusable one-row `ActionStatusStrip` with shared semantic highlights
- [x] 3.2 Prioritize active, failed, then recent completed actions and fit segments to viewport width
- [x] 3.3 Render status glyph and action label only; truncate without increasing height
- [x] 3.4 Replace bottom `StatusLogView` allocation with one-row action strip
- [x] 3.5 Open action modal when strip is activated
- [x] 3.6 Add rendering, width, priority, and interaction tests

## 4. Action Modal Keymap

- [x] 4.1 Register discoverable uppercase `L` action-modal toggle command in table keymap layer
- [x] 4.2 Push/pop action modal through modal stack without starting action
- [x] 4.3 Update footer/help metadata and remove former status-log maximize command
- [x] 4.4 Add keymap conflict and modal-stack tests

## 5. Remove Legacy Status Log

- [x] 5.1 Remove status-log server broadcaster, file storage, cleanup, and API route
- [x] 5.2 Remove status-log client methods and shared `StatusLogEntry` types
- [x] 5.3 Remove TUI status-log signals, fetch/effects, modal, view, search, and modal keymap layer
- [x] 5.4 Remove status-log UI exports/components and associated tests

## 6. Remove Legacy Operation Logs

- [x] 6.1 Remove operation-log file creation, append, active-path, cleanup, and API routes
- [x] 6.2 Remove operation-log client methods, polling, viewer actions, and `o` bindings
- [x] 6.3 Verify action commands/output cover former operation-log diagnostics and failures
- [x] 6.4 Remove obsolete operation-log tests and replace with action assertions

## 7. Documentation and Cleanup

- [x] 7.1 Update logging, log-location, runtime, and keybinding guides for unified actions
- [x] 7.2 Update utility detection behavior and guide references
- [x] 7.3 Search repository for remaining status-log/operation-log references and classify any intentionally retained diagnostic logs
- [x] 7.4 Ensure existing legacy files are ignored but not destructively deleted

## 8. Verification

- [x] 8.1 Run full TUI and server test suites and Go vet
- [x] 8.2 Test compact strip and modal in terminal MCP at narrow and wide sizes
- [x] 8.3 Check pi-lens issues and resolve relevant findings
