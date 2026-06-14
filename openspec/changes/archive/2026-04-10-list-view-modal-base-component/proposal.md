## Why

Every list-displaying modal in the UI package reimplements the same structural pattern independently: wrap `GenericModal`, compute a virtual-scroll window with `calculateVisibleItems`, render a cursor row, display a scroll indicator, and handle empty/loading states. This duplication means bugs and improvements must be fixed in N places. A generic `ListViewModal<T>` base component extracts the shared structure so each consumer only provides what is unique: its data type, row renderer, and domain-specific header slots.

## What Changes

- A new `ListViewModal<T>` component is created in `tui/packages/ui/src/components/ListViewModal.tsx`
- `BranchSelectorView` is refactored to use `ListViewModal` as its structural base
- `WorktreeManagerModal` is refactored to use `ListViewModal` as its structural base
- `SshHostPickerView` is refactored to use `ListViewModal` as its structural base
- `EditorPickerView` is refactored to use `ListViewModal` as its structural base
- `ProfilePickerView` is refactored to use `ListViewModal` as its structural base
- `AgentSpaceView` is refactored to use `ListViewModal` as its structural base
- The public API surface of each consumer component remains unchanged (no prop renames)
- `ListViewModal` is exported from the package's public index

## Capabilities

### New Capabilities
- `list-view-modal`: Generic list modal base component that handles virtual scrolling, scroll indicator, empty/loading state, and optional search bar rendering — parameterised over item type `T`.

### Modified Capabilities

## Impact

- `tui/packages/ui/src/components/ListViewModal.tsx` — new file
- `tui/packages/ui/src/components/BranchSelectorView.tsx` — refactored internals, no public API change
- `tui/packages/ui/src/components/WorktreeManagerModal.tsx` — refactored internals, no public API change
- `tui/packages/ui/src/components/SshHostPickerView.tsx` — refactored internals, no public API change
- `tui/packages/ui/src/components/EditorPickerView.tsx` — refactored internals, no public API change
- `tui/packages/ui/src/components/ProfilePickerView.tsx` — refactored internals, no public API change
- `tui/packages/ui/src/components/AgentSpaceView.tsx` — refactored internals, no public API change
- `tui/packages/ui/src/index.ts` (or barrel) — `ListViewModal` added to exports
- No changes to keyboard handlers, stores, or server-side code
