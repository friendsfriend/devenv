## 1. Type Updates

- [ ] 1.1 Add `source?: "app" | "task" | "infra"` field to `StatusLogEntry` in `tui/packages/types/src/index.ts`

## 2. Task Execution Integration

- [ ] 2.1 In `tui/packages/cli/src/tui/actions/docker-actions.ts`, capture start timestamp before task execution
- [ ] 2.2 After task completion, calculate duration from start/end timestamps
- [ ] 2.3 Create `StatusLogEntry` with `source: "task"`, task name, args summary, status, and duration
- [ ] 2.4 Push entry to `appStore.setStatusLogEntries()`

## 3. Args Summary Utility

- [ ] 3.1 Create helper `formatTaskArgsSummary(args: Record<string, string>): string` that truncates long values
- [ ] 3.2 Handle empty args case (show task name only, no args suffix)

## 4. Status Log View Rendering

- [ ] 4.1 In `tui/packages/ui/src/components/StatusLogView.tsx`, check `entry.source` and render `[task]` prefix for task entries
- [ ] 4.2 Use `uiColors.textMuted` for the `[task]` prefix
- [ ] 4.3 Preserve existing rendering for app entries (no prefix)

## 5. Duration Formatting

- [ ] 5.1 Create helper `formatDuration(ms: number): string` returning "Xms" or "X.Xs" or "Xm"
- [ ] 5.2 Include duration in status log entry message string

## 6. Testing

- [ ] 6.1 Test status log entry creation with task source
- [ ] 6.2 Test args summary truncation
- [ ] 6.3 Test duration formatting for various time ranges
