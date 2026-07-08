## 1. Panel key helpers

- [x] 1.1 Create `tui/packages/cli/src/tui/keyboard/panel-keys.ts` with `isNextPanelKey`, `isPrevPanelKey`, and `isReverseTabKey` helper functions
- [x] 1.2 Export new helpers from `tui/packages/cli/src/tui/keyboard/index.ts`

## 2. Shift+Tab reverse cycle in table view

- [x] 2.1 Add Shift+Tab detection in `table-keys.ts` `handleTableKeys` — reverse cycle through application/infrastructure/libraries/scripts/kubernetes when shift is held
- [x] 2.2 Add Shift+Tab detection in jobs view handler — reverse cycle through pipeline stages
- [x] 2.3 Add Shift+Tab detection in help view handler — reverse toggle between keybindings/guides tabs
- [x] 2.4 Add text-entry guard so Shift+Tab is not consumed when search/filter modal is active (already handled by existing early-return guards)

## 3. Focus state in stores

- [x] 3.1 Add `crDetailPanelIndex` signal + setter to `cr-store.ts`
- [x] 3.2 Add `issueDetailPanelIndex` signal + setter to `issue-store.ts`
- [x] 3.3 Add `appDetailPanelIndex` signal + setter to `app-detail-store.ts`
- [x] 3.4 Add `kubernetesPanelIndex` signal + setter to `app-store.ts`

## 4. Scroll ref arrays in stores

- [x] 4.1 Add `crDetailScrollBoxRefs` array to `cr-store.ts` (plain array, follows existing ref pattern)
- [x] 4.2 Add `issueDetailScrollBoxRefs` array to `issue-store.ts`
- [x] 4.3 Add `appDetailScrollBoxRefs` array to `app-detail-store.ts`
- [x] 4.4 Add `kubernetesScrollBoxRefs` array to `app-store.ts`

## 5. Keyboard handlers — panel cycling

- [x] 5.1 Extend `handleCrDetailKeys` in `cr-detail-keys.ts` to handle Shift+J/K — cycle `crDetailPanelIndex`, delegate j/k scroll to focused panel's scrollbox ref
- [x] 5.2 Extend `handleIssueDetailKeys` in `issue-detail-keys.ts` for Shift+J/K — cycle `issueDetailPanelIndex`, delegate j/k scroll
- [x] 5.3 Extend `handleAppDetailKeys` in `app-detail-keys.ts` for Shift+J/K — cycle `appDetailPanelIndex`, delegate j/k scroll
- [x] 5.4 Extend `handleTableKeys` in `table-keys.ts` for Shift+J/K when `activeTab() === 'kubernetes'` — cycle `kubernetesPanelIndex`, delegate j/k scroll

## 6. Visual focus indicator in panel components

- [x] 6.1 Add `active` prop to `DetailSection` component that switches header `backgroundColor` between `bgSurface0` (active) and `bgSurface1` (inactive)
- [x] 6.2 Pass `active` prop to each `DetailSection` in `ChangeRequestDetailView.tsx` based on `activePanelIndex` prop
- [x] 6.3 Pass `active` prop to each panel section in `IssueDetailView.tsx`
- [x] 6.4 Pass `active` prop to each panel section in `AppDetailView.tsx`
- [x] 6.5 Pass `active` prop to each panel section in `KubernetesClusterView.tsx`
- [x] 6.6 Wire up scrollbox ref callbacks in each panel view to store refs arrays for scroll delegation

## 7. Content router — forward focus props

- [x] 7.1 In `content-router.tsx`, pass `crDetailPanelIndex`/`setCrDetailPanelIndex` to `ChangeRequestDetailView`
- [x] 7.2 Pass `issueDetailPanelIndex`/`setIssueDetailPanelIndex` to `IssueDetailView`
- [x] 7.3 Pass `appDetailPanelIndex`/`setAppDetailPanelIndex` to `AppDetailView`
- [x] 7.4 Pass `kubernetesPanelIndex`/`setKubernetesPanelIndex` to `KubernetesClusterView`

## 8. Keybind registry

- [x] 8.1 Add Shift+J/K keybind entries to `registry.ts` for contexts: `changeRequestDetail`, `issueDetail`, `appDetail`, and `kubernetes`
- [x] 8.2 Add Shift+Tab keybind entries for contexts: `table`, `jobs`, `help`
- [x] 8.3 Add footer label entries for new keybinds in `FOOTER_LABELS` map
