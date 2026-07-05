## Why

DevEnv already creates and uses a managed local kind cluster for Kubernetes app and infrastructure runs, but cluster lifecycle is hidden as a side effect. Users need first-class control and visibility for the local cluster without replacing k9s for detailed Kubernetes inspection.

## What Changes

- Add a Kubernetes tab that shows the managed kind cluster status, basic cluster metadata, node/workload summaries, and live resource usage in an AppDetail-style layout.
- Show Kubernetes tab actions through the footer/help keybind system, not inside the tab body.
- Add explicit cluster lifecycle actions: create/start, delete/stop, recreate, export kubeconfig, refresh, and open k9s.
- Preserve lazy cluster creation when starting Kubernetes app or infrastructure targets and no managed kind cluster exists.
- Treat stop/delete as `kind delete cluster --name devenv`, removing all in-cluster resources.
- After successful cluster deletion, clear Kubernetes app/infrastructure statuses and stop tracked Kubernetes port-forwards.
- Keep detailed Kubernetes resource management delegated to k9s.
- Defer custom kind config and resource setup controls to a later proposal.

## Capabilities

### New Capabilities
- `kind-cluster-management`: First-class management and live status view for the DevEnv-managed local kind cluster.

### Modified Capabilities
- `kubernetes-runtime`: Clarifies explicit cluster delete semantics, lazy create behavior, and status/port-forward cleanup after cluster deletion.
- `keybind-registry`: Adds Kubernetes tab footer/help keybinds for cluster actions.

## Impact

- Server: new cluster management API/service around existing Kubernetes runner commands and Docker/Podman stats collection.
- TUI: new Kubernetes tab, live cluster view, footer keybind context, confirmation flows for destructive actions.
- Types/core client: cluster status/action DTOs and client methods.
- Existing Kubernetes runtime paths: reuse the same cluster creation/export behavior and clear Kubernetes runtime state after deletion.
- Docs/guides: update Kubernetes runtime guide and keybind/help text.
