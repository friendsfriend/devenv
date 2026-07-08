## 1. Type Updates

- [x] 1.1 Add `source?: "app" | "task" | "infra"` field to `StatusLogEntry` in `tui/packages/types/src/index.ts`

## 2. Task Execution Integration

- [x] 2.1 In `tui/packages/cli/src/tui/actions/docker-actions.ts`, capture start timestamp before task execution
- [x] 2.2 After task completion, calculate duration from start/end timestamps
- [x] 2.3 Create `StatusLogEntry` with `source: "task"`, task name, args summary, status, and duration
- [x] 2.4 Push entry to `appStore.setStatusLogEntries()`

## 3. Args Summary Utility

- [x] 3.1 Create helper `formatTaskArgsSummary(args: Record<string, string>): string` that truncates long values
- [x] 3.2 Handle empty args case (show task name only, no args suffix)

## 4. Status Log View Rendering

- [x] 4.1 In `tui/packages/ui/src/components/StatusLogView.tsx`, check `entry.source` and render `[task]` prefix for task entries
- [x] 4.2 Use `uiColors.textMuted` for the `[task]` prefix
- [x] 4.3 Preserve existing rendering for app entries (no prefix)

## 5. Duration Formatting

- [x] 5.1 Create helper `formatDuration(ms: number): string` returning "Xms" or "X.Xs" or "Xm"
- [x] 5.2 Include duration in status log entry message string

## 6. Testing

- [x] 6.1 Test status log entry creation with task source
- [x] 6.2 Test args summary truncation
- [x] 6.3 Test duration formatting for various time ranges
