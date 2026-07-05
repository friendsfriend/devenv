## ADDED Requirements

### Requirement: Registry covers Kubernetes cluster management keybinds
The keybind registry SHALL include footer and help entries for Kubernetes cluster management actions.

#### Scenario: Kubernetes cluster view keybinds are registered
- **WHEN** the registry is built
- **THEN** it SHALL include entries for Kubernetes cluster create/start, delete/stop, recreate, refresh, export kubeconfig, open k9s, help, and quit/back behavior
- **THEN** each entry SHALL use the view context that the footer and help system use while the Kubernetes tab is active

#### Scenario: Kubernetes footer shows cluster actions
- **WHEN** the Kubernetes tab is active
- **THEN** the footer SHALL show Kubernetes cluster keybind hints from the registry
- **THEN** unrelated table actions SHALL NOT displace the Kubernetes cluster lifecycle hints

#### Scenario: Kubernetes help shows cluster actions
- **WHEN** help is opened from the Kubernetes tab
- **THEN** help content SHALL include the registered Kubernetes cluster management keybinds
