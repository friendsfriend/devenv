## Why

Multi-panel views (CR detail, issue detail, app detail, Kubernetes) have content areas that users navigate manually with scroll — no way to focus a specific panel and delegate keyboard input to it. Tab-only navigation for tab-based views is also one-directional with no reverse cycle.

## What Changes

- **Panel focus system**: Views with multiple content panels gain focus-state tracking. Tab cycles panels in tab-based views (unchanged). Shift+J/K cycles active panel in panel-based views.
- **Shift+Tab reverse cycle**: Shift+Tab cycles tabs in reverse direction in all tab-based views (table, jobs, help).
- **Visual indicator**: Active panel gets a visual cue (border color change or highlighted header).
- **Scroll delegation**: When a panel is focused, j/k scroll that panel's content.
- **Keybind registry**: New keybinds registered in the registry with help entries and footer hints.
- **BREAKING**: Shift+J/K currently mean page next/prev in issue and CR list views and file next/prev in diff modal — those remain unchanged since they're different view contexts.

## Capabilities

### New Capabilities
- `panel-focus-navigation`: Cycling focus between content panels in multi-panel detail views (CR detail, issue detail, app detail, Kubernetes) via Shift+J/K, with visual focus indicator and scroll delegation.
- `reverse-tab-cycling`: Shift+Tab to cycle tabs in reverse direction in tab-based views (table, jobs, help).

### Modified Capabilities
- `keybind-registry`: Register new keybinds (Shift+Tab, Shift+J, Shift+K) with help entries and footer hints for each affected view context.

## Impact

- **`tui/packages/ui/src/components/`**: ChangeRequestDetailView, IssueDetailView, AppDetailView, KubernetesClusterView gain focus state props and focus indicators.
- **`tui/packages/cli/src/tui/keyboard/`**: New handler functions or extended handlers for Shift+Tab in table/jobs/help, Shift+J/K for panel cycling in detail views.
- **`tui/packages/cli/src/tui/stores/`**: Focus state (active panel index, panel definitions) added to relevant stores (appDetailStore, changeRequestStore, issueStore) or a shared focus store.
- **`tui/packages/cli/src/tui/views/content-router.tsx`**: Focus state props forwarded to panel-based views.
- **`tui/packages/cli/src/tui/keyboard/registry.ts`**: New keybind definitions added.
- No changes to backend or data layer.
