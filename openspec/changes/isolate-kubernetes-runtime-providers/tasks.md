## 1. Kubernetes execution identity

- [x] 1.1 Extend Kubernetes profile parsing with provider, cluster, and context identity defaults.
- [x] 1.2 Validate provider/cluster/context collisions during registry rebuild.
- [x] 1.3 Add provider-scoped kind command builder and unique action temporary artifact paths.
- [x] 1.4 Add identity and collision tests for Docker and Podman profiles.

## 2. Shared Kubernetes action plan

- [x] 2.1 Build reusable provider-aware Kubernetes action-plan compiler.
- [x] 2.2 Move Kubernetes app start/image/namespace/secrets/Helm/readiness/port-forward steps to it.
- [x] 2.3 Move Kubernetes infrastructure start/stop actions to it.
- [x] 2.4 Apply configured values, image settings, namespaces, secrets, contexts, and wait timeout consistently.
- [x] 2.5 Remove fixed cluster/context/archive assumptions.

## 3. Capability and lifecycle integration

- [x] 3.1 Extend tool capability checks for kind, kubectl, Helm, Compose commands, and provider reachability.
- [x] 3.2 Filter or mark unavailable every incomplete Kubernetes provider action.
- [x] 3.3 Update cluster view/lifecycle actions for profile-scoped provider identity.
- [x] 3.4 Add command graph tests for Docker and Podman Kubernetes app and infrastructure targets.

## 4. Verification

- [x] 4.1 Add integration coverage for distinct provider/profile clusters and concurrent image loads.
- [x] 4.2 Update example Kubernetes configuration for explicit identity where needed.
- [x] 4.3 Run full Go and TUI test suites, type-check, vet, and diff check.
