## Why

Dependencies currently establish order only. They do not describe how a Kubernetes pod reaches a Docker/Podman service, how a host process reaches a Kubernetes service, or how endpoint values enter app commands and Helm values. Mixed-runtime profiles cannot be made portable or verified without an explicit connectivity contract.

## What Changes

- Add declared dependency endpoint outputs with host, port, protocol, and exposure semantics.
- Add target input bindings that inject dependency endpoints into shell environments, Compose configuration, and Helm values.
- Define provider-aware exposure strategies for host-to-Kubernetes, Kubernetes-to-host-container, and same-provider container connectivity.
- Validate endpoint compatibility and local-port/release/network conflicts before execution.
- Add reusable multi-runtime fixture profiles covering supported Docker, Podman, Kubernetes, shell, and application-to-application combinations.
- Add end-to-end verification that checks both dependency readiness and actual consumer connectivity.

## Capabilities

### New Capabilities
- `cross-runtime-endpoint-contracts`: Declarative endpoint exchange and connectivity validation across runtime boundaries.
- `multi-runtime-profile-fixtures`: Isolated profile fixtures that exercise supported mixed-runtime dependency combinations.

### Modified Capabilities
- `config-driven-run-dependencies`: Dependencies provide consumable endpoint values, not only start ordering.
- `kubernetes-runtime`: Kubernetes targets consume and expose configured cross-runtime endpoints.
- `multi-runtime-execution`: Runtime/provider-specific exposure behavior is validated before launch.

## Impact

- Resource schemas and config expansion
- `server/pkg/actiondef` typed value flow
- Action registry compilation, endpoint probes, Helm/Compose/script adapters
- Example config workspace and integration test fixtures.
