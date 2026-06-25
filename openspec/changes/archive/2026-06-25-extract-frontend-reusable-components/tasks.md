## 1. Inventory

- [x] 1.1 Inspect `Table`, `ScrollableList`, `ListViewModal`, `GenericModal`, and `statusUtils` for reuse before adding new code
- [x] 1.2 Identify first refactor targets among `IssueView`, `MergeRequestView`, `ChangedFilesView`, `JobsDetailView`, and `TestResultsDetailView`

## 2. Shared Components

- [x] 2.1 Add a minimal centered state component for loading, error, and empty messages
- [x] 2.2 Add a minimal search header component for `searchMode` and `searchQuery`
- [x] 2.3 Add a minimal detail section component for repeated bordered detail panels
- [x] 2.4 Export new reusable components only where needed

## 3. Shared Utilities

- [x] 3.1 Move duplicate date/status/truncation helpers into existing shared utilities where possible
- [x] 3.2 Replace inline duplicate helper logic in at least two current callers

## 4. Refactor Views

- [x] 4.1 Refactor list views to use the shared centered state component
- [x] 4.2 Refactor searchable table/list headers to use the shared search header
- [x] 4.3 Refactor repeated detail panels to use the shared detail section where it reduces code
- [x] 4.4 Confirm reusable components do not register keyboard handlers

## 5. Validation

- [x] 5.1 Run frontend typecheck/build checks
- [x] 5.2 Run the full test suite
- [x] 5.3 Check pi-lens issues if available
