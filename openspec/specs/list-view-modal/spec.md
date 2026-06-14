## ADDED Requirements

### Requirement: ListViewModal renders a virtual-scroll list inside a GenericModal shell
`ListViewModal<T>` SHALL wrap `GenericModal` and render a windowed slice of `items` using `calculateVisibleItems`, calling `renderItem` for each visible item.

#### Scenario: Renders only the visible window of items
- **WHEN** `items` contains more entries than fit in the visible height
- **THEN** only the windowed slice centred on `selectedIndex` is rendered
- **AND** items outside the window are not mounted

#### Scenario: Window recentres when selectedIndex changes
- **WHEN** `selectedIndex` changes to an item outside the current window
- **THEN** the visible window shifts so the selected item is visible

#### Scenario: All items visible when list is short
- **WHEN** `items.length` is less than or equal to the computed `maxVisible`
- **THEN** all items are rendered without windowing

### Requirement: ListViewModal passes absoluteIndex and isSelected to renderItem
Each call to `renderItem` SHALL receive the unwrapped item of type `T`, a boolean `isSelected` (true when `absoluteIndex === selectedIndex`), and the `absoluteIndex` of that item within the full `items` array.

#### Scenario: isSelected is true only for the selected item
- **WHEN** `selectedIndex` is 2
- **THEN** `renderItem` is called with `isSelected: true` only for the item at absolute index 2
- **AND** all other visible items receive `isSelected: false`

#### Scenario: absoluteIndex reflects position in full items array, not the slice
- **WHEN** the visible window starts at item index 5
- **THEN** the first rendered item receives `absoluteIndex: 5`, not `absoluteIndex: 0`

### Requirement: ListViewModal shows a scroll indicator when the list is truncated
A scroll indicator SHALL be shown below the list when `items.length` exceeds `maxVisible` and the visible slice is non-empty.

#### Scenario: Scroll indicator shown when list overflows
- **WHEN** `items.length > maxVisible`
- **THEN** a text row is rendered below the list: `"Showing {first+1}–{last+1} of {total}"`

#### Scenario: Scroll indicator hidden when all items fit
- **WHEN** `items.length <= maxVisible`
- **THEN** no scroll indicator is rendered

#### Scenario: scrollIndicatorLabel appended when provided
- **WHEN** `scrollIndicatorLabel` prop is set to a non-empty string (e.g. `"branches"`)
- **THEN** the scroll indicator reads `"Showing {first+1}–{last+1} of {total} branches"`

### Requirement: ListViewModal renders a loading state when loading is true
When the `loading` prop is `true`, `ListViewModal` SHALL render the `loadingText` string (default `"Loading..."`) in place of the list.

#### Scenario: Loading state replaces list content
- **WHEN** `loading` is `true`
- **THEN** the list and scroll indicator are not rendered
- **AND** `loadingText` is displayed centered in the content area

### Requirement: ListViewModal renders emptyContent when items is empty and not loading
When `items` is empty and `loading` is `false`, `ListViewModal` SHALL render the `emptyContent` slot in place of the list.

#### Scenario: Empty state shown when no items
- **WHEN** `items.length === 0` and `loading` is `false`
- **THEN** the `emptyContent` slot is rendered centered in the content area

#### Scenario: Empty state not shown while loading
- **WHEN** `loading` is `true` and `items.length === 0`
- **THEN** the loading state is rendered, not `emptyContent`

### Requirement: ListViewModal renders optional header and searchBar slots above the list
The `header` slot SHALL be rendered above the `searchBar` slot, which is rendered above the list content. Both are optional.

#### Scenario: Header slot rendered above search bar
- **WHEN** both `header` and `searchBar` props are provided
- **THEN** `header` appears first, then `searchBar`, then the list
- **AND** both have `flexShrink: 0` to prevent compression

#### Scenario: Slots omitted when not provided
- **WHEN** `header` and `searchBar` are not provided
- **THEN** no extra boxes are rendered above the list

### Requirement: ListViewModal accepts reservedHeight to tune the visible window budget
The `reservedHeight` prop SHALL be subtracted from the computed dialog height to determine `maxVisible`. Default is `6`.

#### Scenario: reservedHeight controls maxVisible
- **WHEN** `heightPercent` is `0.7` and the terminal height is 40 rows
- **AND** `reservedHeight` is `7`
- **THEN** `maxVisible = max(5, floor(40 * 0.7) - 7)` = `max(5, 28 - 7)` = `21`

### Requirement: All six target consumers are migrated to use ListViewModal
`BranchSelectorView`, `WorktreeManagerModal`, `SshHostPickerView`, `EditorPickerView`, `ProfilePickerView`, and `AgentSpaceView` SHALL each use `ListViewModal` as their structural base. Their public prop interfaces SHALL remain unchanged.

#### Scenario: BranchSelectorView public API unchanged after migration
- **WHEN** `BranchSelectorView` is rendered with the same props as before
- **THEN** it renders identically to the pre-migration version

#### Scenario: WorktreeManagerModal public API unchanged after migration
- **WHEN** `WorktreeManagerModal` is rendered with the same props as before
- **THEN** it renders identically to the pre-migration version

#### Scenario: SshHostPickerView public API unchanged after migration
- **WHEN** `SshHostPickerView` is rendered with the same props as before
- **THEN** it renders identically to the pre-migration version

#### Scenario: EditorPickerView public API unchanged after migration
- **WHEN** `EditorPickerView` is rendered with the same props as before
- **THEN** it renders identically to the pre-migration version

#### Scenario: ProfilePickerView public API unchanged after migration
- **WHEN** `ProfilePickerView` is rendered with the same props as before
- **THEN** it renders identically to the pre-migration version

#### Scenario: AgentSpaceView public API unchanged after migration
- **WHEN** `AgentSpaceView` is rendered with the same props as before
- **THEN** it renders identically to the pre-migration version

### Requirement: ListViewModal is exported from the UI package barrel
`ListViewModal` and `ListViewModalProps` SHALL be re-exported from the package's public index so consumers outside `@icon-tui/ui` can use the component directly.

#### Scenario: ListViewModal importable from package root
- **WHEN** a consumer imports `{ ListViewModal }` from `@icon-tui/ui`
- **THEN** the import resolves without error
