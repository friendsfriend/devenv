## ADDED Requirements

### Requirement: Kubernetes app and infrastructure use one execution plan
The system SHALL apply provider, context, namespace, values files, secrets, image settings, and wait configuration consistently to Kubernetes app and infrastructure targets.

#### Scenario: Kubernetes infrastructure with values
- **WHEN** Kubernetes infrastructure config declares values files and namespace
- **THEN** its Helm action SHALL use the resolved context, namespace, and every declared values file

#### Scenario: Kubernetes secret uses target namespace
- **WHEN** a Kubernetes target declares a secret and namespace `apps`
- **THEN** secret deletion and creation SHALL execute in namespace `apps`

### Requirement: Kubernetes actions require complete capabilities
The system SHALL omit or mark unavailable a Kubernetes provider action when required kind, kubectl, Helm, provider CLI, or provider daemon capability is unavailable.

#### Scenario: Helm unavailable
- **WHEN** Helm is unavailable
- **THEN** Kubernetes actions requiring Helm SHALL not be executable
- **THEN** availability feedback SHALL identify Helm
