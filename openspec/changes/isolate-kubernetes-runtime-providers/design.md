## Context

Kubernetes app actions currently use fixed kind cluster name `devenv`, context `kind-devenv`, and archive path `/tmp/devenv-image.tar`. Docker and Podman action variants can target incompatible provider storage under the same identity. Kubernetes infrastructure compilation does not consistently carry provider environment, values, namespace creation, context, secrets, wait settings, or tool availability.

## Goals / Non-Goals

**Goals:**
- Make each Kubernetes profile provider-scoped and collision-safe.
- Use one command-plan builder for app and infrastructure Helm targets.
- Gate definitions on all required tools and provider reachability.
- Honor configured namespace, values, secrets, context, image, and timeout behavior.

**Non-Goals:**
- Support remote Kubernetes clusters in this change.
- Design application-to-runtime endpoint exchange.
- Permit Docker- and Podman-backed kind clusters to share one context identity.

## Decisions

### Kubernetes execution identity

Derive a Kubernetes execution identity from configured profile plus provider:

```text
provider: docker | podman
clusterName: configured or profile-derived
contextName: kind-<clusterName>
```

A cluster identity belongs to one provider. Registry validation rejects two profiles that claim the same cluster/context with different providers.

### One Kubernetes command-plan builder

Create a reusable plan builder accepting execution identity and target metadata. It emits:

1. provider-aware kind ensure/export;
2. image availability/load with unique temp archive path;
3. namespace ensure;
4. namespaced secret apply;
5. Helm upgrade/install with explicit kube context and values;
6. workload readiness with configured timeout;
7. run-scoped cleanup; and
8. provider-aware port forwards.

Infrastructure and app compilers consume this builder. This removes divergent command construction.

### Capability gating

Tool availability tracks `kind`, `kubectl`, `helm`, selected runtime CLI and runtime daemon/socket reachability. A provider action is omitted or marked unavailable when its complete capability set is absent. `podman-compose`/`docker-compose` availability remains a separate Compose concern.

### Unique temporary artifacts

Image archives use action run ID and target identity under system temp directory. Cleanup removes only its own archive. Fixed `/tmp/devenv-image.tar` is removed.

### Explicit context everywhere

kubectl and Helm command builders always use resolved context. No command relies on ambient current context.

## Risks / Trade-offs

- [Existing `devenv` assumptions change] → migrate current default profile to same identity values.
- [More cluster instances consume resources] → require explicit profile/provider opt-in and show cluster ownership in TUI.
- [Provider check adds startup work] → cache capability probe briefly and refresh on action launch.
- [Helm chart conventions vary] → retain configurable image value paths and workload selectors.

## Migration Plan

1. Extend Kubernetes profile schema with provider/cluster/context defaults.
2. Add execution identity parser and collision validation.
3. Implement shared plan builder with existing default identity compatibility.
4. Move app actions, then infrastructure actions, to builder.
5. Replace fixed archive paths and ambient-context commands.
6. Add Docker and Podman integration fixture coverage.

## Open Questions

- Whether same provider can host multiple DevEnv clusters concurrently by default.
- Whether cluster lifecycle UI exposes profiles individually or one selected profile at a time.
