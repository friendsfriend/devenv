## Context

The legacy build service validates dependencies through `resources.TargetRegistry`, while backend action definitions recursively resolve dependencies through a separate inline resolver. The latter drops Kubernetes infrastructure metadata, ignores infrastructure runtime/profile selectors, chooses container provider from the parent action, and converts unresolved references into generic operation steps. Docker and Podman are action variants of one logical Docker target, so `DependencyRef.Runtime` cannot name the required provider.

## Goals / Non-Goals

**Goals:**
- Define one canonical identity for every runnable app and infrastructure target.
- Resolve every dependency exactly before any action execution begins.
- Represent logical runtime separately from container provider.
- Carry selected target metadata unchanged into compiled dependency steps.
- Use canonical target identity for recursion, cycle detection, and shared execution.

**Non-Goals:**
- Define network connectivity or endpoint injection; that belongs to `add-cross-runtime-endpoint-contracts`.
- Change runtime-specific readiness policy; that belongs to `harden-runtime-readiness-lifecycle`.
- Support arbitrary external cluster providers; that belongs to Kubernetes provider isolation.

## Decisions

### Canonical target identity

Create a shared resolved-target model used by both registry validation and action compilation:

```text
kind: app | infrastructure
ident
logicalRuntime: docker | kubernetes | shell | systemshell | powershell
profile
provider: docker | podman | host | none
```

`provider` is required only where a runtime has provider variants. It prevents overloading `runtime: docker` to mean both Compose target type and Docker engine.

Alternative: encode provider into `runtime`. Rejected because it makes one logical Compose target appear as unrelated target types and breaks existing target discovery semantics.

### Strict resolution before graph publication

Build a complete target catalog during action-registry rebuild. Resolve all `requires` references against it before publishing definitions. A missing selector, unknown target, incompatible provider, or cycle fails rebuild with an actionable diagnostic. No fallback operation step is generated.

Reuse or replace `resources.TargetRegistry` so the legacy and action-engine paths cannot disagree. The action registry becomes the source of executable graphs; legacy-only orchestration is removed or adapted to the same catalog.

### Provider inheritance is prohibited

A dependency either declares a provider or uses a deterministic target-level default. The parent action provider never silently changes a dependency provider. A Kubernetes action can require Podman Compose while itself uses a Podman-backed kind cluster only when configuration selects that provider explicitly.

### Preserve target metadata

Resolved targets retain Kubernetes chart/release/image metadata, script runner/environment metadata, Compose path/profile, and checkout directory. Dependency compilation consumes this target directly rather than constructing synthetic partial targets.

### Canonical execution keys

Shared dependency claims use canonical target identity, including provider and profile. Two consumers share a dependency only when they request the exact same target. Different providers/profiles execute independently.

### Script variants compile one graph

Tmux, shell, system shell, and PowerShell variants share a target graph builder; only the terminal execution leaf differs. This prevents tmux from bypassing dependencies and prevents PowerShell from losing the Compose command.

## Risks / Trade-offs

- [Existing ambiguous configs fail rebuild] → Provide diagnostics naming required selector fields and migrate example configs first.
- [More actions in registry] → Deduplicate by canonical identity and retain immutable definitions.
- [Provider migration is breaking] → Accept a temporary target-level default during migration, warn when it is used, then require explicit provider in a later major change.
- [Legacy callers depend on permissive behavior] → Route legacy callers through the canonical catalog before removing old resolver code.

## Migration Plan

1. Add canonical identity/catalog alongside existing resolver.
2. Validate and log migration diagnostics without changing execution.
3. Move action registry compilation to canonical resolved targets and remove no-op fallback.
4. Move legacy start-plan callers to same catalog.
5. Update configs/tests to explicit provider selectors where required.
6. Roll back by retaining old action registry path behind a temporary feature flag if rebuild diagnostics prove incompatible.

## Open Questions

- Whether provider defaults remain allowed indefinitely for single-provider installations.
- Whether infrastructure should support several named profiles under one service ident or require separate idents.
