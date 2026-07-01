## Why

DevEnv currently supports local development through Docker Compose and shell-based runtimes, but teams that run production workloads on Kubernetes cannot easily validate Helm-based application and infrastructure layouts locally. Adding a managed Kubernetes runtime lets users run production-like Helm charts locally without hand-maintaining cluster setup, image loading, secrets, and dependency orchestration.

## What Changes

- Add a `kubernetes` app run runtime backed by a DevEnv-managed `kind` cluster.
- Support Helm-only Kubernetes targets discovered from app repositories and the DevEnv config directory, with multiple targets exposed when multiple charts/configs are found.
- Build app images with the configured Docker-compatible runtime (`docker` or `podman`), load them into the managed kind cluster, and pass image values to Helm.
- Create Kubernetes Secrets from explicit `.env` key allowlists before Helm install, without logging secret values.
- Support user-defined Kubernetes infrastructure services that install/uninstall Helm releases and can be dependencies of Kubernetes app run targets.
- Keep dependency lifecycle aligned with existing Docker behavior: app stop/restart affects only the app target; infrastructure is reset only when stopped directly from the infrastructure view.
- Provide preflight validation, target explanation, basic Helm release status/log support, and optional port-forward configuration for local access.

## Capabilities

### New Capabilities
- `kubernetes-runtime`: Helm-based local Kubernetes run runtime, managed kind cluster lifecycle, image build/load, secrets, status/logs, and optional port-forwarding.

### Modified Capabilities
- `app-action-variants`: Add Kubernetes as a normalized app run target runtime discoverable from repo/config Helm targets.
- `config-driven-run-dependencies`: Allow app and infrastructure dependency references to target Kubernetes runtime/profile combinations while preserving dependency stop semantics.
- `script-infrastructure-services`: Extend infrastructure lifecycle/status concepts to include Helm-backed Kubernetes infrastructure services alongside Docker and script services.

## Impact

- Backend Go packages for action target discovery, run execution, infrastructure lifecycle, status/log collection, and new Kubernetes/kind/Helm command orchestration.
- Shared TypeScript types and TUI action pickers/status views to represent `kubernetes` targets, Helm metadata, and Kubernetes infrastructure services.
- Config repository layout and docs/guides for `apps/k8s/<ident>/`, `infrastructure/k8s/<ident>/`, `devenv.k8s.json`, `.env` secret allowlists, and kind configuration.
- External tool dependencies: `kind`, `kubectl`, and `helm`; existing Docker/Podman runtime selection remains source of container runtime behavior.
