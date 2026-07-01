## Context

DevEnv currently discovers app build/test/run targets from config repository resources and app checkout conventions, then executes Docker Compose, Dockerfile, shell, PowerShell, and systemshell targets. Run dependencies are resolved before execution and stopped independently, so stopping an app does not tear down shared infrastructure.

Kubernetes local development needs a production-like workflow without asking users to manage cluster setup manually. The chosen scope is Helm-only on a DevEnv-managed `kind` cluster. DevEnv will not support arbitrary BYO Kubernetes contexts for this feature; it will always target its managed kind context to avoid destructive operations against real clusters.

## Goals / Non-Goals

**Goals:**
- Add `kubernetes` as a normalized app run runtime.
- Discover Helm run targets from app repositories and config repository Kubernetes directories.
- Manage one local kind cluster using the selected Docker-compatible runtime (`docker` or `podman`).
- Build app images through the existing container runtime integration, load them into kind, and pass chart image values to Helm.
- Create Kubernetes Secrets from explicit `.env` key allowlists.
- Support user-defined Helm-backed infrastructure services and preserve existing dependency lifecycle semantics.
- Provide clear preflight errors, target explanation, status/log visibility, and optional port-forward entries.

**Non-Goals:**
- Supporting raw manifests, Kustomize, ArgoCD, or non-Helm deployment engines.
- Supporting BYO Kubernetes contexts or remote clusters.
- Generating Helm charts from Docker Compose or app definitions.
- Auto-creating infrastructure catalogs; Kubernetes infrastructure remains user-defined.
- Auto-wiring arbitrary charts to consume generated Secrets beyond creating the Secret and passing configured Helm values.

## Decisions

### Managed kind only

DevEnv will create and use a fixed managed kind cluster, defaulting to cluster name `devenv` and context `kind-devenv`. Kubernetes commands will pass explicit context/cluster arguments and will not depend on the ambient current kube context.

Alternatives considered:
- BYO contexts: rejected because local `run` performs uninstall/install operations and can be destructive.
- Multiple managed providers: rejected for v1 to keep support/debugging focused. Users needing another cluster type can keep using Docker Compose or shell runtimes.

### Helm-only Kubernetes targets

Kubernetes run and infrastructure targets will be Helm releases. Target discovery may find multiple charts and expose multiple `kubernetes` run profiles. Explicit `devenv.k8s.json` files can override discovery defaults.

Alternatives considered:
- Raw manifests/Kustomize: rejected to keep lifecycle/status/rollback semantics consistent through Helm releases.
- ArgoCD: rejected because local Argo controller management is a separate product concern.

### Config overlays repository values

Helm values will be ordered so repository-owned chart defaults and values are applied first, then DevEnv config-directory values, then DevEnv-generated `--set-string` values for image and optional secret wiring. This lets shared config override repository defaults for local development.

### Docker/Podman image build and kind load

Kubernetes app runs may build a local image using the selected container runtime command and load it into kind before Helm install. For Docker, DevEnv runs normal kind commands. For Podman, DevEnv sets `KIND_EXPERIMENTAL_PROVIDER=podman` for kind create/load operations.

The target config defines image name/tag, build context, Dockerfile path, and Helm image value paths. Defaults come from the app ident and existing build Dockerfile conventions when possible.

### Explicit Secret allowlists

Targets declare which `.env` keys become a Kubernetes Secret. DevEnv validates missing keys before Helm execution, creates or updates the Secret in the target namespace, and redacts secret values from logs/status messages. Charts remain responsible for referencing the Secret through values/templates.

### Infrastructure lifecycle mirrors Docker behavior

Kubernetes infrastructure services are user-defined Helm releases. App run dependency startup installs missing infrastructure but does not reset already-running infrastructure. Stopping an app uninstalls only the app release. Stopping an infrastructure service from the infrastructure view uninstalls that infra release, so next start is fresh.

### Port-forwarding is target metadata

Targets can declare port-forward entries for services. DevEnv can start/stop tracked `kubectl port-forward` processes and show local URLs, but ingress/controller management remains out of scope for MVP.

## Risks / Trade-offs

- kind with Podman is host-sensitive → add preflight validation for `kind`, selected runtime, and provider compatibility with actionable errors.
- Helm charts expose image values differently → require configurable Helm value paths and document chart expectations.
- Secrets can leak through logs or rendered files → avoid rendering secrets to files, redact status/log output, and only create Secrets from explicit allowlists.
- Discovery can overproduce targets when repositories contain several charts → expose multiple stable profiles and prefer explicit `devenv.k8s.json` for polished setups.
- Helm `--wait` may not surface all failures clearly → collect release status, pods, jobs, and recent events for failed installs when possible.
- App image rebuild/load can be slow → keep behavior configurable and show progress in operation status/logs.
