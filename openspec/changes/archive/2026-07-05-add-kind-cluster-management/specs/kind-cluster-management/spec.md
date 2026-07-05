## ADDED Requirements

### Requirement: Show managed kind cluster view
The system SHALL provide a Kubernetes tab that displays the status and summary of the DevEnv-managed kind cluster.

#### Scenario: Cluster is missing
- **WHEN** the managed kind cluster does not exist
- **THEN** the Kubernetes tab SHALL show the cluster as missing or stopped
- **THEN** the tab SHALL show the configured cluster name, context name, and container provider when available

#### Scenario: Cluster is running
- **WHEN** the managed kind cluster exists and the Kubernetes API is reachable
- **THEN** the Kubernetes tab SHALL show the cluster as running
- **THEN** the tab SHALL show cluster name, context name, provider, Kubernetes version when available, node readiness, namespaces, pod counts, and DevEnv-managed release summaries

#### Scenario: Cluster exists but API is unreachable
- **WHEN** the managed kind cluster exists but Kubernetes API calls fail
- **THEN** the Kubernetes tab SHALL show a degraded or unreachable state
- **THEN** cluster lifecycle actions that do not require the Kubernetes API SHALL remain available

### Requirement: Show live cluster resource usage
The system SHALL show live resource usage for the managed kind cluster in an AppDetail-style panel.

#### Scenario: Node container stats are available
- **WHEN** the managed kind cluster is running and node container stats can be read from Docker or Podman
- **THEN** the Kubernetes tab SHALL show live CPU and memory usage
- **THEN** the tab SHALL maintain sparkline history for displayed CPU and memory usage

#### Scenario: Node container stats are unavailable
- **WHEN** node container stats cannot be read
- **THEN** the Kubernetes tab SHALL continue to show cluster metadata and Kubernetes summaries
- **THEN** the resource usage panel SHALL show that live usage is unavailable without failing the whole view

### Requirement: Manage cluster lifecycle explicitly
The system SHALL allow users to create, delete, recreate, export kubeconfig for, refresh, and open k9s for the DevEnv-managed kind cluster from the TUI.

#### Scenario: Create cluster from Kubernetes tab
- **WHEN** the user invokes the Kubernetes start/create action and no managed kind cluster exists
- **THEN** the system SHALL create the managed kind cluster using the configured container runtime provider
- **THEN** the system SHALL export kubeconfig for the managed cluster
- **THEN** the Kubernetes tab SHALL refresh to show the running cluster state

#### Scenario: Create cluster when already running
- **WHEN** the user invokes the Kubernetes start/create action and the managed kind cluster already exists
- **THEN** the system SHALL reuse the existing cluster
- **THEN** the system SHALL refresh or export kubeconfig without creating a duplicate cluster

#### Scenario: Delete cluster with confirmation
- **WHEN** the user invokes the Kubernetes delete/stop action
- **THEN** the system SHALL ask for confirmation before deleting the cluster
- **THEN** the confirmation SHALL state that deleting the cluster removes all in-cluster resources

#### Scenario: Delete cluster after confirmation
- **WHEN** the user confirms cluster deletion
- **THEN** the system SHALL run `kind delete cluster` for the managed cluster name
- **THEN** the Kubernetes tab SHALL refresh to show the missing or stopped cluster state after successful deletion

#### Scenario: Recreate cluster with confirmation
- **WHEN** the user invokes the Kubernetes recreate action
- **THEN** the system SHALL ask for confirmation before deleting the existing cluster
- **THEN** the system SHALL delete the managed cluster and create a fresh managed cluster after confirmation

#### Scenario: Export kubeconfig
- **WHEN** the user invokes the export kubeconfig action and the managed kind cluster exists
- **THEN** the system SHALL export kubeconfig for the managed cluster
- **THEN** the user SHALL receive success or failure feedback

#### Scenario: Open k9s
- **WHEN** the user invokes the k9s action from the Kubernetes tab
- **THEN** the system SHALL open `k9s` against the managed kind context

### Requirement: Expose Kubernetes tab keybinds through footer and help
The system SHALL show Kubernetes cluster actions through the footer and help keybind system rather than as inline action text in the Kubernetes tab content.

#### Scenario: Kubernetes tab is active
- **WHEN** the Kubernetes tab is active
- **THEN** the footer SHALL show keybind hints for available Kubernetes cluster actions
- **THEN** the Kubernetes tab content SHALL focus on cluster state and summaries, not an action menu

#### Scenario: Help is opened from Kubernetes tab
- **WHEN** the user opens help while the Kubernetes tab is active
- **THEN** the help view SHALL include Kubernetes cluster keybinds for that context
