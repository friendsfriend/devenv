## Context

DevEnv already owns a fixed local kind cluster contract: cluster `devenv`, context `kind-devenv`, Docker/Podman provider integration, lazy creation during Kubernetes app/infra runs, and explicit `kubectl`/`helm` context targeting. Users can inspect details through `k9s`, but cannot see or control the cluster lifecycle directly from DevEnv.

The new work should make the managed cluster visible and controllable without turning DevEnv into a full Kubernetes dashboard. Detailed pod/resource operations stay in `k9s`; DevEnv provides lifecycle, summary, and live health/resource information.

## Goals / Non-Goals

**Goals:**
- Add a Kubernetes tab with an AppDetail-style live cluster view.
- Show footer/help keybinds for Kubernetes actions instead of embedding action instructions in the tab body.
- Expose server APIs for cluster status, create, delete, recreate, export kubeconfig, and refresh-driven state.
- Preserve existing lazy cluster creation during Kubernetes app/infra runs.
- Use Docker/Podman node container stats for live CPU/memory sparkline data, with Kubernetes API summaries for nodes, namespaces, pods, and DevEnv releases.
- Stop Kubernetes port-forwards and clear Kubernetes app/infra status after successful cluster deletion.

**Non-Goals:**
- No custom kind config, node sizing, registry mirror, or cluster resource setup UI in this change.
- No detailed Kubernetes object CRUD; users should open `k9s` for that.
- No support for arbitrary kube contexts or non-DevEnv clusters.
- No replacement for Helm-based app/infra lifecycle.

## Decisions

### Use a dedicated Kubernetes tab

A new table tab named `Kubernetes` will host the managed cluster view. The cluster is substrate for Kubernetes apps and infrastructure, not an infrastructure service itself, so representing it as an infra row would blur dependency and lifecycle semantics.

Alternative considered: infrastructure pseudo-row. Rejected because the cluster is implicitly required by all Kubernetes runs, has no app-level profile, and deleting it affects every in-cluster workload.

### Keep keybinds in footer/help only

The Kubernetes tab content will focus on state and live data. Actions are discoverable through the existing keybind registry, footer hints, and help view. This matches the project direction that keybinds come from a central registry and avoids stale inline action text.

### Reuse existing mnemonic lifecycle keys

The Kubernetes tab should use `s` for start/create, `S` for stop/delete, `R` for recreate, `r` for refresh, `e` for export kubeconfig, and `9` for k9s. These mirror existing start/stop/restart/refresh/k9s patterns while being scoped to the Kubernetes tab.

### Use existing Runner as command source

Cluster actions should be implemented around `server/pkg/kubernetes.Runner` so command construction, cluster/context names, and Podman provider env stay consistent with existing app/infra lifecycle. Any helper added for delete/recreate should live near the runner instead of duplicating command arrays in handlers.

### Use Docker/Podman node stats for live usage

Kind does not install metrics-server by default, so `kubectl top` cannot be a hard dependency. The live CPU/memory panel should read container runtime stats for the kind node container(s), starting with `devenv-control-plane`, and aggregate if multiple managed node containers are discovered later. Kubernetes API calls provide readiness, version, namespace, pod, and release summaries.

Alternative considered: require metrics-server. Rejected because it changes cluster setup and makes the MVP depend on an optional add-on.

### Delete means kind delete cluster

Stop/delete uses `kind delete cluster --name devenv`. This is destructive and removes all in-cluster resources, so both delete and recreate require confirmation. Successful deletion triggers local runtime cleanup: stop Kubernetes port-forwards, clear cached Kubernetes targets/status, and broadcast status refresh to the TUI.

## Risks / Trade-offs

- **Runtime stats differ between Docker and Podman** → Keep stats parsing isolated behind a cluster stats helper and return partial status when stats are unavailable.
- **Cluster delete is destructive** → Use confirmation modal with explicit data-loss wording before delete/recreate.
- **Kubernetes API unavailable while kind exists** → Surface `unreachable` or degraded status and still allow delete/recreate where possible.
- **Footer context clashes with table context** → Use tab-aware footer/keybind filtering or a distinct Kubernetes view context so Kubernetes actions appear only when relevant.
- **Status cleanup may miss in-memory state** → Centralize post-delete cleanup in the server-side cluster service and reuse existing port-forward stop helpers.
