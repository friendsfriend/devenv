## Why

The action engine resolves dependencies through a weaker inline resolver than the existing target registry. It can silently accept invalid references, lose infrastructure runtime/profile identity, and deduplicate different requested targets under one execution key. Mixed Docker, Podman, Kubernetes, and script configurations can therefore start the wrong dependency or report a no-op as success.

## What Changes

- Make action-engine dependency resolution use one canonical, strict target identity model.
- Add an explicit container provider dimension (`docker` or `podman`) separate from logical target runtime.
- Require runtime/profile/provider-compatible dependency references to resolve at registry rebuild time; reject unresolved references and cycles instead of emitting fallback no-op steps.
- Preserve complete infrastructure target metadata during dependency compilation, including Kubernetes and script runner configuration.
- Make dependency execution keys include all target identity dimensions.
- **BREAKING** Dependency configurations that omit a required target selector or rely on implicit provider selection may be rejected until made explicit.

## Capabilities

### New Capabilities
- `runtime-qualified-dependency-targets`: Canonical, provider-aware identity and strict resolution for app and infrastructure dependency targets.

### Modified Capabilities
- `config-driven-run-dependencies`: Dependencies must resolve exactly and execute the selected target rather than a generic fallback.
- `multi-runtime-execution`: Docker and Podman provider choice becomes an explicit dependency execution dimension.

## Impact

- `server/pkg/resources/dependency_graph.go`
- `server/pkg/resources/action_targets.go`
- `server/pkg/server/action_registry.go`
- `server/pkg/actionregistry/targets.go`
- Action registry validation, target configuration, dependency tests, and existing example configs.
