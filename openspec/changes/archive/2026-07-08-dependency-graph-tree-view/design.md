## Context

The server already resolves dependency graphs via `TargetRegistry.ResolveStartPlan()` and exposes `ActionTarget.requires` (`DependencyRef[]`) through the action targets API. The TUI fetches action targets when the user picks a run profile (via `ActionTargetPickerView`), but this data is discarded after selection — it's never stored or rendered elsewhere.

The `AppDetailView` currently shows: overview (status, branch, provider), container stats (CPU/memory charts), and container logs. There's no dependency visualization.

## Goals / Non-Goals

**Goals:**
- Show the full dependency tree for the currently viewed app's active run target
- Render apps and infrastructure as distinct node types with visual differentiation
- Show runtime status (running/stopped/unknown) per node
- Support recursive expansion for app→app dependencies

**Non-Goals:**
- Interactive dependency editing (users edit config files directly)
- Starting/stopping individual dependencies from the tree
- Cycle detection visualization (server already handles this at start time)

## Decisions

### 1. Fetch action targets on app detail view entry

When `AppDetailView` opens for an app, fetch its action targets via the existing `GET /api/apps/{ident}/action-targets?action=run` endpoint. Filter to the currently active run target's `requires` and recursively fetch action targets for dependent apps.

**Alternative considered:** Store all action targets in `appStore` on startup. Rejected because action targets are per-app and would bloat the global store with data only needed in detail view.

### 2. Tree component as new `DependencyTreeView`

Create a dedicated `DependencyTreeView` component rather than inlining tree logic into `AppDetailView`. This keeps the detail view compose clean and makes the tree reusable.

**Alternative considered:** Extend `PropertiesList` with tree support. Rejected because `PropertiesList` is a flat key-value renderer; tree nesting would require significant rework.

### 3. Lazy loading of nested dependencies

Fetch action targets for each app node on-demand when the tree node is expanded, rather than pre-fetching the entire graph. This avoids N+1 API calls at open time and handles deep graphs gracefully.

**Alternative considered:** Eager recursive fetch. Rejected because deep dependency chains (A→B→C→D) would cascade API calls before the user even expands nodes.

### 4. Status via existing SSE events

App status (running/stopped) already streams via `container.status` SSE events. The tree reads from the same `appStore.apps()` / `appStore.infraServices()` signals used by the main table — no new status mechanism needed.

## Risks / Trade-offs

- **[Risk] Deep dependency chains could make tree very tall** → Mitigate with collapsed-by-default nodes; only root app expanded initially
- **[Risk] Missing action targets for some apps** → Show "no dependencies" empty state; tree is optional, not blocking
- **[Trade-off] Extra API call per expanded app node** → Acceptable for on-demand loading; could add caching later if needed
