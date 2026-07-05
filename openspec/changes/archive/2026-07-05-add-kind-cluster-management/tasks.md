## 1. Server Cluster Management

- [x] 1.1 Add kind runner command support for deleting the managed cluster and any missing reusable create/export helpers.
- [x] 1.2 Add server-side cluster status model covering cluster name, context, provider, existence, reachability, version, nodes, namespaces, pod counts, DevEnv releases, and resource stats.
- [x] 1.3 Implement cluster status collection using kind/kubectl plus Docker/Podman node container stats with partial/degraded results when some probes fail.
- [x] 1.4 Implement cluster create, delete, recreate, and export kubeconfig operations using the existing Kubernetes runner/provider behavior.
- [x] 1.5 Add post-delete cleanup that stops all Kubernetes port-forwards, clears cached Kubernetes run state, refreshes infra/app statuses, and broadcasts updates.
- [x] 1.6 Add HTTP API handlers/routes for cluster status and lifecycle actions with consistent error responses and operation logging.

## 2. Client Types and API

- [x] 2.1 Add shared TypeScript types for Kubernetes cluster status, node summaries, workload/release summaries, and live stats.
- [x] 2.2 Add core client methods for fetching cluster status and invoking create, delete, recreate, export kubeconfig, and refresh flows.
- [x] 2.3 Ensure client methods surface server errors for destructive or failed lifecycle actions.

## 3. Kubernetes TUI View

- [x] 3.1 Add a Kubernetes table tab or equivalent tab entry that renders a dedicated cluster view instead of repository/infrastructure/task rows.
- [x] 3.2 Build an AppDetail-style Kubernetes cluster component using ContentFrame/DetailSection/ScrollableContent patterns.
- [x] 3.3 Show missing, running, and degraded cluster states with cluster metadata and Kubernetes summaries.
- [x] 3.4 Show live CPU and memory sparkline history from cluster node stats, with fallback text when stats are unavailable.
- [x] 3.5 Show node summary and DevEnv workload/release summary without embedding action instructions in the tab body.
- [x] 3.6 Add polling or refresh wiring so the Kubernetes tab updates live while active and resets stats history after deletion.

## 4. Keyboard, Footer, and Confirmation UX

- [x] 4.1 Register Kubernetes tab keybinds for start/create, delete/stop, recreate, refresh, export kubeconfig, open k9s, help, and quit/back behavior.
- [x] 4.2 Update footer keybind selection so Kubernetes tab shows cluster action hints and does not show unrelated table lifecycle hints.
- [x] 4.3 Add keyboard handlers for Kubernetes tab actions using existing mnemonic keys: `s`, `S`, `R`, `r`, `e`, and `9`.
- [x] 4.4 Add confirmation modal flow for delete and recreate with explicit wording that all in-cluster resources are removed.
- [x] 4.5 Reuse existing k9s launch behavior against `kind-devenv` from the Kubernetes tab.

## 5. Docs and Guides

- [x] 5.1 Update Kubernetes runtime guide to document explicit cluster management, lazy create behavior, destructive delete semantics, and status cleanup.
- [x] 5.2 Update help/keybind documentation through the keybind registry so footer/help show Kubernetes cluster controls.
- [x] 5.3 Document that custom kind config/resource setup is not part of this change and remains future work.

## 6. Tests and Verification

- [x] 6.1 Add Go tests for cluster command construction, status parsing, lifecycle operations, and post-delete cleanup behavior.
- [x] 6.2 Add TypeScript tests for cluster client methods, store/view state, footer keybind filtering, and confirmation-triggered actions.
- [x] 6.3 Add component/render tests or snapshots for missing, running, degraded, and stats-unavailable Kubernetes tab states.
- [x] 6.4 Run the full test suite and record results.
- [x] 6.5 Check pi-lens issues if available before finishing implementation.
