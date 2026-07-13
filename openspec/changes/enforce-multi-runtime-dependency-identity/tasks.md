## 1. Canonical target catalog

- [x] 1.1 Define canonical app/infrastructure target identity with logical runtime, profile, and provider.
- [x] 1.2 Extend dependency reference parsing and validation for provider selectors and deterministic defaults.
- [x] 1.3 Build one catalog containing app run, Compose provider, script runner, and Kubernetes infrastructure targets.
- [x] 1.4 Add catalog tests for exact app/infra runtime-profile-provider resolution and ambiguity diagnostics.

## 2. Action graph resolution

- [x] 2.1 Replace inline action-registry resolver with canonical catalog resolution.
- [x] 2.2 Preserve complete resolved target metadata in recursive dependency compilation.
- [x] 2.3 Remove generic unresolved dependency fallback and surface registry rebuild diagnostics.
- [x] 2.4 Detect cycles during registry rebuild and test reported cycle chains.
- [x] 2.5 Use canonical target identity for shared execution keys and coordinator claims.

## 3. Variant consistency

- [x] 3.1 Refactor shell, PowerShell, system shell, and tmux variants to share dependency graph compilation.
- [x] 3.2 Make Compose dependency command selection use resolved provider rather than parent action runtime.
- [x] 3.3 Preserve configured script runner, command, environment, and working directory in resolved targets.
- [x] 3.4 Route remaining legacy start-plan users through the canonical catalog or remove duplicate resolution.

## 4. Migration and verification

- [x] 4.1 Add migration diagnostics for ambiguous existing dependency configurations.
- [x] 4.2 Update example configuration to explicit provider/profile selectors where needed.
- [x] 4.3 Add action-registry integration tests for Docker, Podman, Kubernetes, shell, PowerShell, and tmux dependency graphs.
- [x] 4.4 Run full Go and TUI test suites, type-check, vet, and diff check.
