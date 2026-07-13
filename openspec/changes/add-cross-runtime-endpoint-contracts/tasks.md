## 1. Endpoint schema and values

- [x] 1.1 Define endpoint export and binding configuration schema with validation.
- [x] 1.2 Add typed endpoint values to action definitions and run context with secret redaction support.
- [x] 1.3 Validate producer existence, protocol, binding destination, exposure strategy, and local-port conflicts.
- [x] 1.4 Add schema and action-value unit tests.

## 2. Runtime adapters

- [x] 2.1 Implement Kubernetes Service DNS and managed host port-forward endpoint exports.
- [x] 2.2 Implement same-provider Compose service-DNS endpoint exports.
- [x] 2.3 Implement provider-aware host-published endpoint strategy for Kubernetes consumers.
- [x] 2.4 Bind endpoints into shell environment, Compose interpolation, and Helm value paths.
- [x] 2.5 Reject unsupported direct Docker-to-Podman network bindings.

## 3. Fixture profiles

- [x] 3.1 Create isolated Docker and Podman Compose app/infrastructure fixtures.
- [x] 3.2 Create isolated Kubernetes app/infrastructure fixtures for each supported provider.
- [x] 3.3 Create host-to-Kubernetes and Kubernetes-to-host-container consumer fixtures.
- [x] 3.4 Create invalid provider/network/port fixture configurations with expected validation errors.
- [x] 3.5 Add fixture manifest parsing and endpoint validation coverage; live provider probes remain environment-gated.

## 4. Verification

- [x] 4.1 Document supported and unsupported cross-runtime exposure strategies.
- [x] 4.2 Run fixture manifest matrix; live Docker/Podman execution is environment-gated.
- [x] 4.3 Run full Go and TUI test suites, type-check, vet, and diff check.
