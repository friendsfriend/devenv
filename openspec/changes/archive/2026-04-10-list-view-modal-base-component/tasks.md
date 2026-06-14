## 1. Build ListViewModal Component

- [x] 1.1 Create `tui/packages/ui/src/components/ListViewModal.tsx` with the `ListViewModalProps<T>` interface as designed (items, selectedIndex, loading, title, helpText, widthPercent, heightPercent, estimatedItemHeight, reservedHeight, scrollIndicatorLabel, header, searchBar, emptyContent, loadingText, renderItem)
- [x] 1.2 Implement the `ListViewModal<T>` component: compute `dialogHeight` from `useTerminalDimensions` + `heightPercent`, compute `maxVisible = max(5, dialogHeight - reservedHeight)`, call `calculateVisibleItems` to get the windowed slice
- [x] 1.3 Render `GenericModal` with `title`, `helpText`, `widthPercent`, `heightPercent`
- [x] 1.4 Render the `header` slot (if provided) with `flexShrink: 0`
- [x] 1.5 Render the `searchBar` slot (if provided) with `flexShrink: 0`
- [x] 1.6 Render the list area with `<Show>` gating on `!loading && items.length > 0`, fallback showing loading state or `emptyContent`
- [x] 1.7 Render the scroll indicator below the list when `items.length > maxVisible` and the visible slice is non-empty; include `scrollIndicatorLabel` suffix when provided
- [x] 1.8 Export `ListViewModal` and `ListViewModalProps` from `tui/packages/ui/src/index.ts` (or the package barrel)

## 2. Migrate BranchSelectorView

- [x] 2.1 Remove `GenericModal` import and direct usage from `BranchSelectorView`; remove the inline `calculateVisibleItems` call and `maxVisibleBranches` / `visibleBranches` memos
- [x] 2.2 Extract the `BranchRow` rendering into a `renderItem` callback passed to `ListViewModal`; set `reservedHeight={7}` (title + current + search + scroll indicator + footer + padding)
- [x] 2.3 Pass the "Current: `{currentBranch}`" box as the `header` slot
- [x] 2.4 Pass the `<input>` box as the `searchBar` slot
- [x] 2.5 Pass the domain-specific empty/loading fallback JSX as `emptyContent` (the worktree-create variant message lives here)
- [x] 2.6 Verify the `filteredBranches` memo and `effectiveSelectedIndex` remain in `BranchSelectorView` (they are filtering logic, not list structure)
- [x] 2.7 Confirm `items={filteredBranches()}`, `selectedIndex={effectiveSelectedIndex()}` are passed correctly

## 3. Migrate WorktreeManagerModal

- [x] 3.1 Remove `GenericModal`, `calculateVisibleItems`, and inline scroll computation from `WorktreeManagerModal`
- [x] 3.2 Extract `WorktreeRow` rendering into a `renderItem` callback; set `estimatedItemHeight={2}` and `reservedHeight={4}`
- [x] 3.3 Pass `emptyContent` with the "No worktrees found" message
- [x] 3.4 Confirm modal dimensions `widthPercent={0.55}`, `heightPercent={0.6}` are preserved

## 4. Migrate SshHostPickerView

- [x] 4.1 Remove `GenericModal` and `calculateVisibleItems` from `SshHostPickerView`
- [x] 4.2 Extract `HostRow` rendering into `renderItem`; set `reservedHeight={6}`
- [x] 4.3 Pass the `<SearchBar>` component as the `searchBar` slot
- [x] 4.4 Handle the two-level empty state (no hosts at all vs. no filtered results) within `emptyContent`
- [x] 4.5 Confirm `widthPercent={0.6}`, `heightPercent={0.7}`

## 5. Migrate EditorPickerView

- [x] 5.1 Remove `GenericModal` and the manual `<For>` from `EditorPickerView`
- [x] 5.2 Pass `items={EDITOR_OPTIONS}` and extract `EditorRow` rendering into `renderItem`; set `reservedHeight={4}` (small static list, minimal chrome)
- [x] 5.3 Confirm `widthPercent={0.4}`, `heightPercent={0.3}`

## 6. Migrate ProfilePickerView

- [x] 6.1 Remove `GenericModal` and the manual `<For>` from `ProfilePickerView`
- [x] 6.2 Pass the synthesised items array (with optional "default (no profile)" entry) as `items` and extract `ProfileRow` into `renderItem`; set `reservedHeight={4}`
- [x] 6.3 Pass loading/empty fallback as `emptyContent` and the `loading` prop
- [x] 6.4 Confirm `widthPercent={0.3}`, `heightPercent={0.4}`

## 7. Migrate AgentSpaceView

- [x] 7.1 Remove `GenericModal` and `calculateVisibleItems` from `AgentSpaceView` for both steps
- [x] 7.2 Sessions step: pass `items={flatRows}` (the `FlatRow[]` built from sessions), `renderItem` calling `RowView`, `searchBar` slot for the `SearchBar`, `reservedHeight={6}`, `widthPercent={0.75}`, `heightPercent={0.75}`
- [x] 7.3 Agent picker step: pass `items={agentNames}`, same `renderItem` pattern, `reservedHeight={4}`
- [x] 7.4 The two `<ListViewModal>` instances remain inside their existing `<Show when={step === 'sessions'}>` / `<Show when={step === 'newSessionSpacePicker'}>` guards

## 8. Verification

- [x] 8.1 Build the UI package (`pnpm build` or equivalent) and confirm no TypeScript errors
- [x] 8.2 Visually verify `BranchSelectorView` renders identically (current branch header, search input, branch list, scroll indicator when long)
- [x] 8.3 Visually verify `WorktreeManagerModal` renders identically (2-line rows, correct scroll math)
- [x] 8.4 Visually verify `SshHostPickerView`, `EditorPickerView`, `ProfilePickerView`, `AgentSpaceView` render identically to pre-migration
- [x] 8.5 Confirm `ListViewModal` is importable from `@icon-tui/ui` without error
