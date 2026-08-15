## Why

Kubernetes actions hardcode one kind cluster, context, and image archive while offering Docker and Podman variants. Kubernetes infrastructure actions do not consistently use the selected provider, values, namespace setup, or required tool checks. Concurrent profiles can collide or operate against an unintended cluster.

## What Changes

- Model a Kubernetes execution target with explicit kind provider, cluster name, context, namespace, and unique temporary artifact paths.
- Generate only provider variants supported by available Docker/Podman, kind, kubectl, and Helm capabilities.
- Make Kubernetes app and infrastructure actions use one provider-aware command builder.
- Apply configured Helm values, namespace creation, context, secrets, wait timeout, and provider environment consistently to infrastructure and app actions.
- Reject cluster/context/release/port collisions during registry rebuild or action launch.
- **BREAKING** Kubernetes profile configurations may require explicit provider/cluster identity where implicit defaults are ambiguous.

## Capabilities

### New Capabilities
- `kubernetes-provider-isolation`: Provider-scoped kind execution and collision-safe Kubernetes action resources.

### Modified Capabilities
- `kubernetes-runtime`: Kubernetes application and infrastructure actions consistently honor profile configuration and real tool availability.
- `kind-cluster-management`: Cluster lifecycle actions use provider-scoped cluster/context identity.
- `multi-runtime-execution`: Kubernetes provider variants are capability-gated and do not cross Docker/Podman storage.

## Impact

- `server/pkg/kubernetes/*`
- `server/pkg/actionregistry/kubernetes.go`, `targets.go`, `infrastructure.go`, `toolcheck.go`
- Kubernetes config/resource parsing, action registry rebuild, cluster management, and integration tests.
