# Kubernetes Runtime

DevEnv can run app and infrastructure targets as Helm releases on one managed local `kind` cluster.

## Prerequisites

Install:

- `kind`
- `kubectl`
- `helm`
- selected container runtime: `docker` or `podman`

Set runtime with `DEVENV_CONTAINER_RUNTIME=docker` or `DEVENV_CONTAINER_RUNTIME=podman`. Podman uses kind's `KIND_EXPERIMENTAL_PROVIDER=podman` environment for cluster and image-load commands.

DevEnv always targets managed context `kind-devenv`. It never uses your current kube context.

## App target discovery

DevEnv discovers Helm charts from app checkout paths:

- `Chart.yaml`
- `chart/Chart.yaml`
- `helm/Chart.yaml`
- `deploy/helm/Chart.yaml`
- `charts/*/Chart.yaml`

Config directory targets live under:

```text
apps/k8s/<app-ident>/devenv.k8s.json
apps/k8s/<app-ident>/values.yaml
```

Config values override repository defaults. Helm install order is: chart values, config values, generated `--set-string` image values.

## `devenv.k8s.json`

Example:

```json
{
  "targets": [
    {
      "profile": "local",
      "chart": { "path": "$APP/helm", "values": ["$APP/helm/values.yaml"] },
      "values": ["$CONFIG/apps/k8s/my-app/values.yaml"],
      "release": "my-app-local",
      "namespace": "apps",
      "image": {
        "repository": "my-app",
        "tag": "dev",
        "pullPolicy": "IfNotPresent",
        "build": { "context": "$APP", "dockerfile": "$APP/Dockerfile" },
        "valuePaths": {
          "repository": "image.repository",
          "tag": "image.tag",
          "pullPolicy": "image.pullPolicy"
        }
      },
      "secrets": [{ "name": "my-app-env", "keys": ["DB_USER", "DB_PASS"] }],
      "ports": [{ "name": "http", "resource": "svc/my-app", "localPort": 8080, "remotePort": 80 }],
      "requires": [{ "infra": "postgres", "runtime": "kubernetes", "profile": "local" }],
      "wait": { "timeout": "5m" }
    }
  ]
}
```

Path variables:

- `$APP`: app checkout directory
- `$CONFIG`: DevEnv config directory

Secrets use explicit `.env` key allowlists. DevEnv validates keys before Helm install and logs only Secret names/key names, never values.

## Kubernetes infrastructure

Define Helm-backed infrastructure in `infrastructure/definitions/<ident>.json`:

```json
{
  "ident": "postgres",
  "displayName": "Postgres (Kubernetes)",
  "type": "kubernetes",
  "kubernetes": {
    "profile": "local",
    "chartPath": "$CONFIG/infrastructure/k8s/postgres",
    "release": "postgres-local",
    "namespace": "infra",
    "values": ["$CONFIG/infrastructure/k8s/postgres/values.yaml"],
    "wait": true,
    "timeout": "5m"
  }
}
```

Manual start installs release when stopped. Dependency startup skips already-running infrastructure. Manual stop uninstalls release, so next start is fresh.

## Troubleshooting

- Missing tool: install `kind`, `kubectl`, `helm`, Docker, or Podman.
- Podman cluster issues: verify Podman machine/socket and `DEVENV_CONTAINER_RUNTIME=podman`.
- Helm timeout: check operation log, pods, jobs, and events for release namespace.
- Image not used: verify chart image value paths match chart templates.
- Missing Secret key: add key to config `.env` or remove it from allowlist.
