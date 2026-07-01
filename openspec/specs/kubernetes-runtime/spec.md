# kubernetes-runtime Specification

## Purpose
TBD - created by archiving change add-kubernetes-runtime. Update Purpose after archive.
## Requirements
### Requirement: Manage a local kind cluster for Kubernetes runs
The system SHALL run Kubernetes app and infrastructure targets only against a DevEnv-managed kind cluster and SHALL NOT use the ambient current Kubernetes context.

#### Scenario: Missing kind cluster is created
- **WHEN** the user starts a Kubernetes run target and the managed kind cluster does not exist
- **THEN** the system SHALL create the kind cluster using the configured container runtime provider
- **THEN** subsequent Kubernetes and Helm commands SHALL target the managed kind context explicitly

#### Scenario: Existing managed cluster is reused
- **WHEN** the managed kind cluster already exists
- **THEN** the system SHALL reuse it instead of creating a duplicate cluster

#### Scenario: Current kube context is ignored
- **WHEN** the user's current kube context points to another cluster
- **THEN** the system SHALL still execute Kubernetes operations against the managed kind context

#### Scenario: Required tools are missing
- **WHEN** `kind`, `kubectl`, `helm`, or the selected container runtime is unavailable
- **THEN** the system SHALL fail before starting any Kubernetes target
- **THEN** the user-visible error SHALL identify the missing tool or unavailable runtime

### Requirement: Discover Helm-based Kubernetes run targets
The system SHALL discover Kubernetes app run targets from Helm chart conventions in the app checkout and from Kubernetes target configuration in the DevEnv config directory.

#### Scenario: Repository chart is discovered
- **WHEN** an app checkout contains a supported Helm chart path such as `Chart.yaml`, `chart/Chart.yaml`, `helm/Chart.yaml`, `deploy/helm/Chart.yaml`, or `charts/<name>/Chart.yaml`
- **THEN** the system SHALL expose a Kubernetes run target for each discovered chart

#### Scenario: Config directory chart is discovered
- **WHEN** `apps/k8s/my-app/` contains a Helm chart or `devenv.k8s.json` target configuration
- **THEN** the system SHALL expose a Kubernetes run target for `my-app`

#### Scenario: Multiple charts create multiple targets
- **WHEN** multiple Helm charts are discovered for one app
- **THEN** the system SHALL expose multiple Kubernetes run targets with stable distinct profiles

#### Scenario: Explicit target configuration overrides discovery defaults
- **WHEN** `devenv.k8s.json` defines profile, chart, release, namespace, values, image, secrets, ports, or dependencies
- **THEN** the system SHALL use those configured values for the Kubernetes run target

### Requirement: Explain Kubernetes run targets before execution
The system SHALL provide normalized Kubernetes target metadata so clients can show what will run before invoking the target.

#### Scenario: Target metadata includes Kubernetes details
- **WHEN** the TUI requests action targets for an app with Kubernetes run targets
- **THEN** each Kubernetes target SHALL include runtime, profile, chart path, release, namespace, values files, image configuration summary, secret key names, port-forward entries, source path, and dependency references when configured

#### Scenario: Secret values are redacted
- **WHEN** target metadata includes a Secret sourced from `.env`
- **THEN** the system SHALL include only the Secret name and key names
- **THEN** the system SHALL NOT include secret values

### Requirement: Build and load local images for Kubernetes runs
The system SHALL build configured app images with the selected Docker-compatible runtime and load them into the managed kind cluster before Helm install.

#### Scenario: Docker image is built and loaded
- **WHEN** `DEVENV_CONTAINER_RUNTIME` resolves to Docker and a Kubernetes run target has image build configuration
- **THEN** the system SHALL run `docker build` with the configured Dockerfile, context, image name, and tag
- **THEN** the system SHALL load the built image into the managed kind cluster

#### Scenario: Podman image is built and loaded
- **WHEN** `DEVENV_CONTAINER_RUNTIME` resolves to Podman and a Kubernetes run target has image build configuration
- **THEN** the system SHALL run `podman build` with the configured Dockerfile, context, image name, and tag
- **THEN** the system SHALL load the built image into the managed kind cluster using kind's Podman provider environment

#### Scenario: Helm image values are set
- **WHEN** a Kubernetes run target builds an image and declares Helm image value paths
- **THEN** the system SHALL pass the configured image repository, tag, and pull policy values to Helm as final overrides

#### Scenario: Image build failure stops run
- **WHEN** image build or image loading fails
- **THEN** the system SHALL fail the app run operation before Helm install
- **THEN** the operation log SHALL contain the failing command output without leaking secrets

### Requirement: Create Kubernetes Secrets from env allowlists
The system SHALL create or update Kubernetes Secrets from explicit target allowlists of `.env` keys before Helm install.

#### Scenario: Secret is created from allowed env keys
- **WHEN** a Kubernetes target declares Secret `devenv-my-app-env` with env keys `DB_USER` and `DB_PASS`
- **THEN** the system SHALL read those keys from the DevEnv `.env` data
- **THEN** the system SHALL create or update a Kubernetes Secret named `devenv-my-app-env` in the target namespace

#### Scenario: Missing env key fails preflight
- **WHEN** a Kubernetes target declares an env key that is not present in `.env`
- **THEN** the system SHALL fail before creating or updating Helm resources
- **THEN** the user-visible error SHALL identify the missing key name

#### Scenario: Secret values are not logged
- **WHEN** the system creates or updates a Kubernetes Secret
- **THEN** logs and status messages SHALL show the Secret name and key names only
- **THEN** logs and status messages SHALL NOT show secret values

### Requirement: Execute Helm install lifecycle for app runs
The system SHALL run Kubernetes app targets by uninstalling the previous app Helm release and installing the target release fresh.

#### Scenario: App run reinstalls release
- **WHEN** the user starts a Kubernetes run target for `my-app`
- **THEN** the system SHALL uninstall the target app Helm release if it exists
- **THEN** the system SHALL install the Helm chart with configured values, namespace creation, generated image overrides, and wait timeout settings

#### Scenario: App stop uninstalls app release only
- **WHEN** the user stops a running Kubernetes app target
- **THEN** the system SHALL uninstall the app Helm release
- **THEN** the system SHALL NOT uninstall infrastructure releases or app dependencies

#### Scenario: Helm failure surfaces diagnostics
- **WHEN** Helm install fails or times out
- **THEN** the system SHALL mark the operation as failed
- **THEN** the system SHALL expose Helm output and relevant release, pod, job, or event diagnostics when available

### Requirement: Support Helm-backed Kubernetes infrastructure services
The system SHALL allow user-defined infrastructure services to run as Helm releases in the managed kind cluster.

#### Scenario: Kubernetes infrastructure service is loaded
- **WHEN** infrastructure configuration defines a Kubernetes Helm target for `postgres`
- **THEN** the system SHALL list `postgres` as an infrastructure service available for manual start and stop actions

#### Scenario: Starting stopped infrastructure installs release
- **WHEN** the user starts a stopped Kubernetes infrastructure service
- **THEN** the system SHALL ensure the managed kind cluster and namespace exist
- **THEN** the system SHALL install the configured Helm release

#### Scenario: Starting running infrastructure is skipped
- **WHEN** a Kubernetes infrastructure service is already running
- **THEN** starting it as a dependency SHALL NOT uninstall or reinstall it

#### Scenario: Stopping infrastructure uninstalls release
- **WHEN** the user stops a Kubernetes infrastructure service from the infrastructure view
- **THEN** the system SHALL uninstall that infrastructure Helm release
- **THEN** the next start SHALL install a fresh release

### Requirement: Track Kubernetes target status and logs
The system SHALL expose Kubernetes app and infrastructure status and logs using Helm release and Kubernetes workload information.

#### Scenario: Helm release status determines running state
- **WHEN** a Kubernetes target's Helm release is deployed in the managed cluster
- **THEN** the system SHALL show the target as running

#### Scenario: Missing release is stopped
- **WHEN** a Kubernetes target's Helm release is not present in the managed cluster
- **THEN** the system SHALL show the target as stopped

#### Scenario: Failed workloads surface failure
- **WHEN** pods or jobs for a Kubernetes target fail after Helm install
- **THEN** the system SHALL show failed status or diagnostics for the target when that information is available

#### Scenario: Logs use release selector
- **WHEN** the user opens logs for a Kubernetes target
- **THEN** the system SHALL fetch logs from pods associated with the Helm release using standard release labels or configured selectors

### Requirement: Manage configured port forwards
The system SHALL support optional port-forward entries for Kubernetes targets and track their lifecycle separately from Helm releases.

#### Scenario: Port forward starts after successful install
- **WHEN** a Kubernetes target declares a port-forward entry and Helm install succeeds
- **THEN** the system SHALL start a tracked `kubectl port-forward` process for the configured service and ports
- **THEN** the TUI SHALL show the local endpoint

#### Scenario: Port forward stops with app target
- **WHEN** the user stops a Kubernetes app target with active port forwards
- **THEN** the system SHALL stop the tracked port-forward processes for that app target

#### Scenario: Port-forward failure does not hide Helm status
- **WHEN** Helm install succeeds but a configured port forward fails
- **THEN** the system SHALL keep the Helm release status visible
- **THEN** the system SHALL surface the port-forward failure separately

