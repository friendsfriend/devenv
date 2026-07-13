## Context

Current dependencies only guarantee execution order. A Kubernetes workload cannot discover a host Compose dependency through `localhost`; a host script cannot reach ClusterIP without a port forward; Docker and Podman networks are isolated. The action engine already has typed named values but runtime targets do not publish or consume endpoint values.

## Goals / Non-Goals

**Goals:**
- Declare, validate, and publish dependency endpoints.
- Bind endpoints into shell environment, Compose configuration, and Helm values.
- Support verified host↔Kubernetes and same-provider container connectivity.
- Supply isolated profile fixtures covering supported combinations.

**Non-Goals:**
- Transparently bridge Docker and Podman networks.
- Infer application protocols from arbitrary Compose or Helm charts.
- Support production ingress, remote clusters, or secret distribution beyond existing secret configuration.

## Decisions

### Endpoint contract

Targets declare exports:

```text
name, protocol, host strategy, port, readiness probe
```

Consumers declare bindings from dependency export to a named action value, environment variable, Compose interpolation value, or Helm value path. The resolved endpoint is typed and visible in action diagnostics without exposing secrets.

### Explicit exposure strategies

Supported strategies are declared rather than inferred:

| Consumer → provider | Strategy |
|---|---|
| host script → Kubernetes | managed local port-forward |
| Kubernetes → host Compose | provider-specific host gateway plus published host port |
| same Compose provider | service DNS/network alias |
| Kubernetes → Kubernetes | Kubernetes Service DNS |

Docker↔Podman direct networking is rejected unless a host-published endpoint strategy is declared.

### Validation before start

The registry validates producer/consumer protocol, provider compatibility, local port uniqueness, required exposure metadata, and binding target existence. It reports configuration errors before starting any target.

### Fixture suite

Fixture profiles use unique namespace, release, Compose project, local port, and provider identity. Each fixture contains an executable consumer probe, not merely workload readiness.

## Risks / Trade-offs

- [Host gateway names differ by provider/platform] → resolve from provider capability adapter and reject unavailable strategy.
- [Port forwards are processes] → reuse managed process lifecycle and publish port-forward output only after readiness.
- [More configuration] → provide concise profile templates and validation diagnostics.
- [Endpoint leak in logs] → mark secret-derived endpoint fields secret and redact them.

## Migration Plan

1. Add endpoint/export/binding schema and typed action values.
2. Implement same-runtime Kubernetes and Compose strategies.
3. Add host↔Kubernetes strategies with capability tests.
4. Add fixture profiles and end-to-end tests.
5. Document unsupported Docker↔Podman direct-network combination and required host exposure workaround.

## Open Questions

- Whether endpoint bindings support URL composition or only host/port primitives.
- Whether port forwards persist after consumer exit when shared by several targets.
