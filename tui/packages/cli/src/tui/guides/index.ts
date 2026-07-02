export interface Guide {
  key: string;
  title: string;
  description: string;
  import: () => Promise<string>;
}

// ponytail: flat registry, extend by adding entries. Switch to file‑system
// scan if guides ever exceed ~20.
export const guides: Guide[] = [
  {
    key: "config-repository",
    title: "Configuration Repository",
    description: "Share DevEnv config across machines or with a team",
    import: () => import("./config-repository.md", { with: { type: "text" } }).then((m) => m.default),
  },
  {
    key: "container-runtime",
    title: "Container Runtime",
    description: "Choose Docker or Podman via DEVENV_CONTAINER_RUNTIME",
    import: () => import("./container-runtime.md", { with: { type: "text" } }).then((m) => m.default),
  },
  {
    key: "kubernetes-runtime",
    title: "Kubernetes Runtime",
    description: "Run Helm app and infrastructure targets on managed kind",
    import: () => import("./kubernetes-runtime.md", { with: { type: "text" } }).then((m) => m.default),
  },
  {
    key: "choosing-runtime",
    title: "Choosing a Runtime",
    description: "When to use Docker Compose, Kubernetes, shell, or script infrastructure",
    import: () => import("./choosing-runtime.md", { with: { type: "text" } }).then((m) => m.default),
  },
  {
    key: "effective-docker-builds",
    title: "Effective Docker Builds",
    description: "Write fast Dockerfiles for Docker and Podman build targets",
    import: () => import("./effective-docker-builds.md", { with: { type: "text" } }).then((m) => m.default),
  },
  {
    key: "adding-apps",
    title: "Adding an App",
    description: "App definitions, Dockerfiles, Compose config, and infra linking",
    import: () => import("./adding-apps.md", { with: { type: "text" } }).then((m) => m.default),
  },
  {
    key: "adding-scripts",
    title: "Adding a Script",
    description: "Script discovery, --devenv-metadata convention, parameter types",
    import: () => import("./adding-scripts.md", { with: { type: "text" } }).then((m) => m.default),
  },
  {
    key: "adding-infrastructure",
    title: "Adding Infrastructure",
    description: "Infra definitions, Compose placement, sharing between apps",
    import: () => import("./adding-infrastructure.md", { with: { type: "text" } }).then((m) => m.default),
  },
  {
    key: "adding-libraries",
    title: "Adding Libraries",
    description: "Library definitions, appType: LIB, build and test Dockerfiles",
    import: () => import("./adding-libraries.md", { with: { type: "text" } }).then((m) => m.default),
  },
  {
    key: "using-worktrees",
    title: "Using Worktrees",
    description: "Single checkout vs worktrees, worktrunk, IDE setup",
    import: () => import("./using-worktrees.md", { with: { type: "text" } }).then((m) => m.default),
  },
  {
    key: "custom-themes",
    title: "Custom Themes",
    description: "Create OpenCode-compatible themes in ~/.config/devenv/themes",
    import: () => import("./custom-themes.md", { with: { type: "text" } }).then((m) => m.default),
  },
  {
    key: "using-ai-features",
    title: "Using AI Features",
    description: "AI agent view, sessions, pi agent integration",
    import: () => import("./using-ai-features.md", { with: { type: "text" } }).then((m) => m.default),
  },
  {
    key: "using-git-integrations",
    title: "Using Git Integrations",
    description: "Providers, MR/PR browsing, diff, discussions, approvals, AI review, pipelines, test results",
    import: () => import("./using-git-integrations.md", { with: { type: "text" } }).then((m) => m.default),
  },
  {
    key: "using-log-viewer",
    title: "Using the Log Viewer",
    description: "Container logs, operation logs, search, viewport scrolling, keyboard shortcuts",
    import: () => import("./using-log-viewer.md", { with: { type: "text" } }).then((m) => m.default),
  },
  {
    key: "finding-logs",
    title: "Finding Logs",
    description: "Log directory structure, status log format, per-app logs, server log",
    import: () => import("./finding-logs.md", { with: { type: "text" } }).then((m) => m.default),
  },
];

export function getGuide(key: string): Guide | undefined {
  return guides.find((g) => g.key === key);
}
