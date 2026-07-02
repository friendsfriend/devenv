## 1. Types and Config Model

- [x] 1.1 Add `kubernetes` to backend action runtime constants and shared TypeScript `ActionRuntime` types.
- [x] 1.2 Define backend structs for Kubernetes run target config, Helm chart settings, image build/load config, Secret allowlists, wait settings, and port-forward entries.
- [x] 1.3 Define backend structs for Kubernetes infrastructure service targets and runtime/profile-addressable infrastructure dependencies.
- [x] 1.4 Add JSON parsing and path expansion for `devenv.k8s.json`, `$APP`, `$CONFIG`, config-dir values files, and app checkout chart paths.

## 2. Target Discovery

- [x] 2.1 Implement Helm chart discovery for app checkout conventions (`Chart.yaml`, `chart/`, `helm/`, `deploy/helm/`, `charts/*`).
- [x] 2.2 Implement config-dir Kubernetes app discovery under `apps/k8s/<ident>/` with config values overriding repository defaults.
- [x] 2.3 Expose multiple Kubernetes run targets with stable profiles and normalized target ids.
- [x] 2.4 Include Kubernetes target explanation metadata in action target responses without exposing secret values.
- [x] 2.5 Add backend tests for single chart discovery, multiple chart discovery, config overrides, and target id stability.

## 3. Managed Kind Runtime

- [x] 3.1 Add Kubernetes runtime service/package for `kind`, `kubectl`, and `helm` command orchestration.
- [x] 3.2 Implement preflight validation for required tools and selected Docker/Podman runtime availability.
- [x] 3.3 Implement managed kind cluster detection and creation with Docker provider.
- [x] 3.4 Implement managed kind cluster detection and creation with Podman provider using kind's Podman environment.
- [x] 3.5 Ensure all Kubernetes and Helm commands target `kind-devenv` explicitly and never depend on ambient current context.
- [x] 3.6 Add unit tests for command construction, preflight failures, Docker provider env, and Podman provider env.

## 4. Image Build and Load

- [x] 4.1 Resolve image build configuration from target config and existing Dockerfile conventions.
- [x] 4.2 Build images with `docker build` or `podman build` using configured Dockerfile, context, image name, and tag.
- [x] 4.3 Load built images into the managed kind cluster using provider-appropriate kind commands.
- [x] 4.4 Pass configured Helm image value paths as final `--set-string` overrides.
- [x] 4.5 Add tests for Docker build command generation, Podman build command generation, kind load command generation, and Helm image override generation.

## 5. Secrets

- [x] 5.1 Read explicit Secret env allowlists from Kubernetes target config.
- [x] 5.2 Validate required `.env` keys before Helm execution and fail with clear missing-key errors.
- [x] 5.3 Create or update Kubernetes Secrets in the target namespace without logging secret values.
- [x] 5.4 Add tests for Secret validation, redaction, and `kubectl` command/input generation.

## 6. Helm App Lifecycle

- [x] 6.1 Route selected app run targets with runtime `kubernetes` to the Kubernetes runtime executor.
- [x] 6.2 Implement app run lifecycle: ensure cluster, start dependencies, build/load image, create Secrets, uninstall existing app release, install Helm release with values and wait settings.
- [x] 6.3 Implement app stop lifecycle: uninstall only the app Helm release and stop tracked app port-forwards.
- [x] 6.4 Surface Helm install/uninstall progress and failures through existing operation status and app logs.
- [x] 6.5 Add tests for app run ordering, fresh reinstall behavior, app-only stop behavior, and Helm failure handling.

## 7. Kubernetes Infrastructure Lifecycle

- [x] 7.1 Load user-defined Kubernetes infrastructure services from config and expose them in infrastructure lists.
- [x] 7.2 Implement manual Kubernetes infrastructure start as Helm install when not already running.
- [x] 7.3 Implement manual Kubernetes infrastructure stop as Helm uninstall, resetting that infrastructure for next start.
- [x] 7.4 Ensure dependency startup skips already-running Kubernetes infrastructure and does not reset it.
- [x] 7.5 Add tests for Kubernetes infrastructure loading, start/stop status, already-running skip, and dependency startup.

## 8. Dependency Graph Updates

- [x] 8.1 Extend dependency reference resolution so infrastructure dependencies can include runtime/profile for Kubernetes targets.
- [x] 8.2 Preserve existing bare infrastructure dependency behavior for Docker/script infrastructure services.
- [x] 8.3 Add dependency graph tests for Kubernetes app dependencies, Kubernetes infrastructure dependencies, missing dependency errors, cycles, and stop semantics.

## 9. Status, Logs, and Port Forwards

- [x] 9.1 Determine Kubernetes app and infrastructure status from Helm release state and workload diagnostics.
- [x] 9.2 Fetch Kubernetes logs from pods associated with the Helm release or configured selectors.
- [x] 9.3 Implement optional tracked `kubectl port-forward` start/stop for configured target ports.
- [x] 9.4 Add tests for status mapping, log command construction, and port-forward lifecycle tracking.

## 10. TUI Integration

- [x] 10.1 Update run target picker labels/details to show Kubernetes runtime, chart, release, namespace, image, secrets, dependencies, and ports.
- [x] 10.2 Update app status and logs actions to handle Kubernetes run targets.
- [x] 10.3 Update infrastructure views/actions to display and control Kubernetes infrastructure services alongside Docker and script services.
- [x] 10.4 Ensure list views touched by this change keep standard search/filter/order controls or document why not applicable.
- [x] 10.5 Add/update TUI tests or type checks for Kubernetes target and infrastructure data.

## 11. Documentation and Examples

- [x] 11.1 Add user guide for Kubernetes local development with managed kind, Helm chart discovery, image build/load, and target explanation.
- [x] 11.2 Document `devenv.k8s.json` fields, config-dir override order, Secret allowlists, and port-forward config.
- [x] 11.3 Update example config generation with at least one app Kubernetes target and one user-defined Kubernetes infrastructure service.
- [x] 11.4 Document kind, kubectl, helm, Docker/Podman prerequisites and common troubleshooting errors.

## 12. Validation

- [x] 12.1 Run Go tests for backend packages touched by this change.
- [x] 12.2 Run TUI type-checks with `bun run type-check`.
- [x] 12.3 Run the full test suite before marking implementation complete.
- [x] 12.4 Check pi-lens issues if available before finishing the feature.
