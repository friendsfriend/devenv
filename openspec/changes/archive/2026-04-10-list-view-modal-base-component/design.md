## Context

The audit of all list-displaying components revealed two families:

**Modal overlays** (use `GenericModal`): `BranchSelectorView`, `WorktreeManagerModal`, `SshHostPickerView`, `EditorPickerView`, `ProfilePickerView`, `AgentSpaceView`, `AddAppModal`, `ConnectProviderModal`.

**Full-screen table views** (raw bordered boxes, no `GenericModal`): `MergeRequestView`, `ChangedFilesView`, `JobsDetailView`, `TestResultsDetailView`, `DiscussionsView`, `ProvidersView`, `StatusLogView`.

Only the modal overlay family shares the exact same structural template: `GenericModal` → optional header slot → optional search bar → virtual-scroll list → scroll indicator → empty/loading fallback. The full-screen table views have fundamentally different chrome (column headers, stage tabs, two-column master-detail) and are excluded from this change.

Of the modal overlays, `AddAppModal` and `ConnectProviderModal` are multi-step wizards where list steps are secondary — the majority of their code is form rendering. They are also excluded from this migration to keep the scope focused.

**The six target consumers**: `BranchSelectorView`, `WorktreeManagerModal`, `SshHostPickerView`, `EditorPickerView`, `ProfilePickerView`, `AgentSpaceView`.

The key divergence points across these six:
- Item height: uniformly 1 line except `WorktreeManagerModal` (2 lines) → `estimatedItemHeight` prop
- Reserved chrome height: varies 4–7 lines → `reservedHeight` prop
- Modal size: `widthPercent` and `heightPercent` differ per component
- Row rendering: fully domain-specific → `renderItem` render prop
- Search bar: present in `BranchSelectorView`, `SshHostPickerView`, `AgentSpaceView` (but in different forms) → optional `searchBar` slot
- Header above list: only `BranchSelectorView` ("Current: branch") → optional `header` slot
- Empty state message: domain-specific → `emptyContent` render prop / slot
- Loading state: most components have one → `loading` boolean prop + `loadingText`

## Goals / Non-Goals

**Goals:**
- A single `ListViewModal<T>` component owns: `GenericModal` wrapping, `calculateVisibleItems` windowing, scroll indicator rendering, and empty/loading fallback structure
- Consumers provide only: item data, `renderItem`, and slot content (`header`, `searchBar`, `emptyContent`)
- All six target consumers are migrated; their public prop interfaces are unchanged
- `ListViewModal` is exported from the package barrel

**Non-Goals:**
- Migrating full-screen table views (`MergeRequestView` etc.)
- Migrating multi-step wizard modals (`AddAppModal`, `ConnectProviderModal`)
- Changing any keyboard handler, store, or server-side code
- Introducing a keyboard event system inside `ListViewModal` (navigation stays in `table-keys.ts`)
- Abstracting the row cursor glyph or selection background (kept in each `renderItem`)

## Decisions

### D1 — Generic type parameter `<T>` with `renderItem` render prop

```ts
interface ListViewModalProps<T> {
  // Data
  items: T[];
  selectedIndex: number;
  loading?: boolean;

  // Modal shell
  title: string;
  helpText: string;
  widthPercent?: number;
  heightPercent?: number;

  // Layout budget
  estimatedItemHeight?: number;  // default: 1
  reservedHeight?: number;       // default: 6

  // Slots
  header?: JSX.Element;          // rendered above search bar and list
  searchBar?: JSX.Element;       // rendered between header and list
  emptyContent?: JSX.Element;    // rendered when items is empty and not loading
  loadingText?: string;          // default: "Loading..."

  // Row renderer
  renderItem: (item: T, isSelected: boolean, absoluteIndex: number) => JSX.Element;
}
```

`renderItem` receives the unwrapped item `T` (not the `VisibleItem<T>` wrapper) plus `isSelected` and `absoluteIndex` so the consumer can implement cursor, background, and bold logic without knowing about the virtual scroll internals.

**Alternative considered**: Passing `VisibleItem<T>` directly. Rejected — it leaks an internal type into every consumer and forces them to unwrap `.item` every time.

### D2 — `header` and `searchBar` as JSX slots, not typed prop shapes

Both slots are opaque `JSX.Element` slots. `BranchSelectorView`'s "Current:" row and `BranchSelectorView`'s `<input>` are structurally different from `SshHostPickerView`'s `SearchBar` component. Forcing a typed prop shape (e.g. `searchQuery?: string; onSearchChange?: (v: string) => void`) would either be too narrow or bloat the interface. The consumer composes and passes the slot fully formed.

### D3 — `reservedHeight` is a consumer-provided constant, not auto-computed

Auto-computing reserved height would require `ListViewModal` to measure its own slots, which is not possible synchronously in this rendering model. Instead, each consumer passes the same numeric constant it already uses today. This is an explicit, auditable parameter rather than magic. Default is `6` (the most common value across the six consumers).

### D4 — Scroll indicator label is generic ("items")

The scroll indicator text is `"Showing {first+1}–{last+1} of {total}"` without a noun suffix (vs `BranchSelectorView`'s "branches" and `WorktreeManagerModal`'s no-noun). An optional `scrollIndicatorLabel?: string` prop (default `''`) allows consumers that want a noun to add it.

### D5 — `AgentSpaceView` two-step behaviour: both steps use `ListViewModal`

`AgentSpaceView` renders two distinct lists (sessions step + agent picker step). Each step is a separate `<Show>` block that instantiates `ListViewModal` with its own `items`, `renderItem`, and `helpText`. The step-switching logic stays in the component; `ListViewModal` is stateless about steps.

## Risks / Trade-offs

- **`reservedHeight` drift** — If a consumer adds a new header row in its `header` slot without updating `reservedHeight`, the virtual scroll window will be too large and content will overflow. → Mitigation: the prop is explicit and each consumer sets it to the same value it used before; a comment in `ListViewModalProps` explains what to count.
- **`AgentSpaceView` heterogeneous rows** — `AgentSpaceView`'s `FlatRow` discriminated union renders three visually different row types. `renderItem` handles this fine since it receives `T` and can switch internally; no special handling needed in `ListViewModal`.
- **`EditorPickerView` no virtual scroll** — `EditorPickerView` has only 3 static items and no `calculateVisibleItems` today. Wrapping it in `ListViewModal` adds virtual scroll overhead but with 3 items the window always contains all items, so behaviour is identical. The simplification gain (consistent component) outweighs the negligible overhead.
