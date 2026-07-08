## 1. API & Data Layer

- [x] 1.1 Add `ActionTarget` and `DependencyRef` types to `tui/packages/types/src/index.ts` if not already present
- [x] 1.2 Expose `getActionTargets(ident, action)` method in `tui/packages/core/src/apps-client.ts`
- [x] 1.3 Add `actionTargets` signal to `tui/packages/cli/src/tui/stores/app-detail-store.ts`

## 2. Dependency Tree Component

- [x] 2.1 Create `tui/packages/ui/src/components/DependencyTreeView.tsx` with tree rendering (indentation, icons, connecting lines)
- [x] 2.2 Implement node rendering: app nodes (📦 name runtime/profile status) and infra nodes (🗄️ name status)
- [x] 2.3 Implement expand/collapse with `Enter` key, nested children rendering
- [x] 2.4 Add loading state for lazy-fetched child nodes
- [x] 2.5 Handle deduplication of shared dependencies across the tree
- [x] 2.6 Handle cycle detection display (server-side cycles prevented at start, but defensive rendering)

## 3. Integration into AppDetailView

- [x] 3.1 Fetch action targets when `AppDetailView` opens for an app
- [x] 3.2 Add `DependencyTreeView` section below the overview panel in `AppDetailView`
- [x] 3.3 Wire dependency tree data from `appDetailStore.actionTargets()` and current app status signals
- [x] 3.4 Show "No dependencies" empty state when no requires on active run target

## 4. Keyboard Navigation

- [x] 4.1 Add `d` keybinding to focus dependency tree from app detail view
- [x] 4.2 Implement `j`/`k` navigation between visible tree nodes
- [x] 4.3 Implement `Enter` expand/collapse on selected node
- [x] 4.4 Implement `Escape` to return focus to main detail view

## 5. Export & Polish

- [x] 5.1 Export `DependencyTreeView` from `tui/packages/ui/src/index.ts`
- [x] 5.2 Style tree with theme colors (uiColors.textPrimary, textSecondary, textMuted, positive, negative, warning)
- [x] 5.3 Test with apps that have deep dependency chains (A→B→C→D)
- [x] 5.4 Test with apps that have no dependencies
