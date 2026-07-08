## Context

This TUI has multiple views composed of distinct content panels arranged in grid or column layouts. Currently, no view tracks which panel is "active" — keyboard input either applies globally (e.g., j/k scrolls whatever scrollbox the key handler points to) or uses ad-hoc focus states like the dependency tree focus in AppDetailView. There is no shared pattern.

Tab-based views (table, jobs, help) use Tab to switch tabs/stages but lack reverse cycling (Shift+Tab).

The existing keyboard dispatching chain checks ~18 handlers sequentially per keypress, matching on `appStore.viewMode()`. Each handler returns `true` (consumed) or `false` (pass to next handler). This is stateless — no handler tracks "which panel is focused."

The AppDetailView already has a precedent: `dependencyTreeFocused` boolean in the store that gates keyboard handling. This design extends that pattern generically.

## Goals / Non-Goals

**Goals:**
- Panel focus cycling via Shift+J/K in changeRequestDetail, issueDetail, appDetail, and the Kubernetes tab (inside table view)
- Reverse tab cycling via Shift+Tab in table, jobs, and help views
- Visual indicator showing which panel is focused (highlighted panel header)
- Scroll delegation: when a panel is focused, j/k scroll that panel
- All new keybinds registered in the keybind registry with help entries

**Non-Goals:**
- Tab as panel cycler (remains tab-switcher in tab-based views)
- Focusable panels in list-only views (providers, issues list, CR list, SSH picker, etc.)
- Nested focus (panel within panel) — only one level of panel focus
- Mouse-based panel selection (out of scope)
- Focus persistence across view switches (focus resets to first panel each time)

## Decisions

### Decision 1: Per-store focus state vs shared focus store

**Chosen: Per-store focus state in existing stores**

Each store that owns a panel-based view already holds view-specific state (CR store, issue store, app detail store, app store). Adding `activePanelIndex: () => number` and `setActivePanelIndex` to each store follows the existing pattern set by `dependencyTreeFocused` in the app detail store.

**Alternatives considered:**
- **Shared focus store** (`createFocusStore` in `stores/focus-store.ts`): Would centralize panel definitions but add an indirection layer and coupling. The views have different panel structures and names, so sharing doesn't simplify.
- **Focus as signal in the view component**: Harder to access from keyboard handlers (would need ref forwarding or context). The keyboard handlers import stores directly, so store-level state is the natural integration point.

```
┌──────────────────────────────────────────────────────────────┐
│                    FOCUS STATE MAP                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Store               │  Field               │  Used By       │
│──────────────────────┼──────────────────────┼────────────────│
│  changeRequestStore  │  crDetailPanelIndex  │  CR Detail     │
│  issueStore          │  issueDetailPanelIndex│  Issue Detail  │
│  appDetailStore      │  appDetailPanelIndex │  App Detail    │
│  appStore            │  kubernetesPanelIndex│  Kubernetes tab│
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Each store also exposes a getter for the total panel count so the keyboard handler can clamp the index.

### Decision 2: Shift+J/K detection in keyboard events

OpenTUI sends keyboard events with `name`, `sequence`, and `shift` fields. For Shift+J:

```
event.sequence === 'J' || (event.name === 'j' && event.shift)
```

For Shift+K:

```
event.sequence === 'K' || (event.name === 'k' && event.shift)
```

The existing `nav-keys.ts` helpers (`isDownKey`, `isUpKey`) explicitly strip `event.shift`. New helpers are added:

```
isNextPanelKey(event)   → event.sequence === 'J' || (event.name === 'j' && event.shift)
isPrevPanelKey(event)   → event.sequence === 'K' || (event.name === 'k' && event.shift)
isReverseTabKey(event)  → (event.name === 'tab' || event.name === 'Tab') && event.shift
```

These live in a new file `tui/packages/cli/src/tui/keyboard/panel-keys.ts` alongside `nav-keys.ts` and `horizontal-scroll.ts`.

### Decision 3: Panel definitions as constants per view

Each panel-based view defines its panel count as a constant or derived value. The keyboard handler doesn't need to know panel names — it only needs the count for index clamping.

```typescript
// Panel counts per view
const CR_DETAIL_PANEL_COUNT = 7;   // Metadata, Status, Changed Files, Jobs, Issues, Discussions, Tests
const ISSUE_DETAIL_PANEL_COUNT = 2; // Metadata, Comments
const APP_DETAIL_PANEL_COUNT = 4;   // Overview, Dep Tree, Logs, CRs
const KUBERNETES_PANEL_COUNT = 4;   // Cluster Info, Resources, Nodes, Workloads
```

The view component uses the panel index to conditionally highlight its panel headers. Pass `activePanelIndex` as a prop from the content router.

### Decision 4: Visual indicator — highlighted panel header

The active panel's header bar uses a brighter background color (`bgSurface0` instead of `bgSurface1`) to indicate focus. This avoids adding borders or extra chrome.

Implementation: Each `DetailSection` or panel container accepts an `active` prop. When true, its header background `backgroundColor` switches:

```tsx
<box
  backgroundColor={props.active ? uiColors.bgSurface0 : uiColors.bgSurface1}
  ...
>
```

This works with any theme and doesn't require modifying the `DetailSection` component's internal layout. For panels that use `PanelHeader` or `SearchHeader`, the same color swap applies.

### Decision 5: Scroll delegation — wiring j/k to focused panel

Currently, keyboard handlers for detail views either scroll a single scrollbox ref (e.g., `issueStore.issueDetailScrollBoxRef`) or ignore scroll entirely.

With panel focus, each panel that supports scrolling exposes a `ScrollBoxRenderable` ref. The store holds an array of refs, and the keyboard handler delegates scroll operations to `refs[activePanelIndex]`.

```typescript
// In issueStore
issueDetailScrollBoxRefs: () => (ScrollBoxRenderable | undefined)[]
setIssueDetailScrollBoxRefs: (refs: (ScrollBoxRenderable | undefined)[]) => void
```

The keyboard handler:

```typescript
if (isDownKey(event)) {
  const refs = issueStore.issueDetailScrollBoxRefs();
  const ref = refs[issueStore.issueDetailPanelIndex()];
  ref?.scrollBy(1);
  return true;
}
```

This is only wired for views where panels have scrollable content (CR detail's Metadata/Changed Files/Jobs panels, issue detail's Metadata panel, app detail's Logs panel). Fixed-height summary panels (Status, Discussions summary, Linked Issues) have no scrollbox ref — j/k falls through or is a no-op.

### Decision 6: Shift+Tab integration — modifier check in existing Tab handlers

The existing Tab handlers in `table-keys.ts`, handler-for-jobs, and handler-for-help check `event.name === 'tab'` or `event.sequence === '\t'`. Adding `event.shift` direction inversion is minimal:

```typescript
// Before (table-keys.ts)
case "tab":
case "\t":
  appStore.setActiveTab((tab) => {
    if (tab === "applications") return "infrastructure";
    // ... forward cycle
  });
  break;

// After
case "tab":
case "\t":
  if (event.shift) {
    appStore.setActiveTab((tab) => {
      if (tab === "applications") return "kubernetes";
      // ... reverse cycle
    });
  } else {
    appStore.setActiveTab((tab) => {
      // ... forward cycle (same as before)
    });
  }
  break;
```

The same pattern applies to jobs (stage cycling) and help (tab toggling).

### Decision 7: Kubernetes tab handling — mixed mode

The Kubernetes tab is inside the table view (`viewMode() === "table"` + `activeTab() === "kubernetes"`). Tab remains "switch outer tab." Shift+J/K cycle the 4 Kubernetes panels.

In the table keyboard handler, the existing `activeTab() === "kubernetes"` guard gets extended:

```typescript
if (appStore.activeTab() === "kubernetes") {
  if (isNextPanelKey(event)) {
    appStore.setKubernetesPanelIndex(cycleForward);
    return true;
  }
  if (isPrevPanelKey(event)) {
    appStore.setKubernetesPanelIndex(cycleReverse);
    return true;
  }
  // existing k8s action keys...
}
```

The KubernetesClusterView receives `activePanelIndex` as a prop and renders the focus indicator accordingly.

## Risks / Trade-offs

- **Scroll ref array management**: Panels that appear/disappear dynamically (e.g., Comments panel only shows when comments exist) must maintain correct ref array alignment.  → The panel count and ref array adjust dynamically; the keyboard handler clamps the active index when panel count decreases.
- **j/k ambiguity when panel is focused**: Some panels have their own j/k meaning (e.g., Changed Files list uses j/k to navigate files). When such a panel is focused, j/k should navigate the list, not scroll.  → This is handled naturally — the existing list navigation keys in the handler already consume j/k. The scroll delegation only fires for panels that don't consume j/k themselves.
- **Shift+Tab in terminal**: Some terminals intercept Shift+Tab before it reaches the TUI.  → Document this limitation. The app still works without Shift+Tab (Tab still cycles forward). Keybind registry notes the potential terminal interception.
- **No focus visible in screenshots/recordings**: The bgSurface0/bgSurface1 difference is subtle.  → Acceptable for v1. A more prominent indicator (border, pointer) can be added later if needed.

## Open Questions

- None currently. The per-store focus state pattern is well-understood from the existing `dependencyTreeFocused` precedent.
