## 1. API & Data Layer

- [ ] 1.1 Add `ActionTarget` and `DependencyRef` types to `tui/packages/types/src/index.ts` if not already present
- [ ] 1.2 Expose `getActionTargets(ident, action)` method in `tui/packages/core/src/apps-client.ts`
- [ ] 1.3 Add `actionTargets` signal to `tui/packages/cli/src/tui/stores/app-detail-store.ts`

## 2. Dependency Tree Component

- [ ] 2.1 Create `tui/packages/ui/src/components/DependencyTreeView.tsx` with tree rendering (indentation, icons, connecting lines)
- [ ] 2.2 Implement node rendering: app nodes (📦 name runtime/profile status) and infra nodes (🗄️ name status)
- [ ] 2.3 Implement expand/collapse with `Enter` key, nested children rendering
- [ ] 2.4 Add loading state for lazy-fetched child nodes
- [ ] 2.5 Handle deduplication of shared dependencies across the tree
- [ ] 2.6 Handle cycle detection display (server-side cycles prevented at start, but defensive rendering)

## 3. Integration into AppDetailView

- [ ] 3.1 Fetch action targets when `AppDetailView` opens for an app
- [ ] 3.2 Add `DependencyTreeView` section below the overview panel in `AppDetailView`
- [ ] 3.3 Wire dependency tree data from `appDetailStore.actionTargets()` and current app status signals
- [ ] 3.4 Show "No dependencies" empty state when no requires on active run target

## 4. Keyboard Navigation

- [ ] 4.1 Add `d` keybinding to focus dependency tree from app detail view
- [ ] 4.2 Implement `j`/`k` navigation between visible tree nodes
- [ ] 4.3 Implement `Enter` expand/collapse on selected node
- [ ] 4.4 Implement `Escape` to return focus to main detail view

## 5. Export & Polish

- [ ] 5.1 Export `DependencyTreeView` from `tui/packages/ui/src/index.ts`
- [ ] 5.2 Style tree with theme colors (uiColors.textPrimary, textSecondary, textMuted, positive, negative, warning)
- [ ] 5.3 Test with apps that have deep dependency chains (A→B→C→D)
- [ ] 5.4 Test with apps that have no dependencies
