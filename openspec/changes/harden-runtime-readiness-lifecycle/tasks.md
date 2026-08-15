## 1. Readiness contracts

- [x] 1.1 Define typed readiness descriptors and evidence reporting for process, Compose, Kubernetes, and external targets.
- [x] 1.2 Implement Kubernetes workload readiness using resolved context, namespace, selector/release, and timeout.
- [x] 1.3 Implement Compose container/health inspection with explicit stabilization fallback.
- [x] 1.4 Implement script process/tmux survival readiness using captured handles.
- [x] 1.5 Add readiness adapter unit and command integration tests.

## 2. Safe cleanup

- [x] 2.1 Add run-scoped outputs for created or upgraded Helm releases and other managed resources.
- [x] 2.2 Gate Kubernetes failed-release cleanup on current-run resource output.
- [x] 2.3 Preserve failed-run diagnostics without deleting pre-existing releases.
- [x] 2.4 Add regression tests for image/dependency failure before Helm and readiness failure after Helm.

## 3. Dependency lifecycle policy

- [x] 3.1 Parse and validate `shared`, `owned`, and `external` dependency lifecycle modes.
- [x] 3.2 Track owned dependency leases by canonical target identity and reconcile them after restart.
- [x] 3.3 Implement stop/restart behavior for lifecycle modes and active-dependent protection.
- [x] 3.4 Preserve script infrastructure runner, env, working directory, and handle metadata in dependency starts.

## 4. Verification

- [x] 4.1 Add cross-runtime readiness/lifecycle graph tests.
- [x] 4.2 Update dependency and Kubernetes specifications/tests for timeout and cleanup behavior.
- [x] 4.3 Run full Go and TUI test suites, type-check, vet, and diff check.
