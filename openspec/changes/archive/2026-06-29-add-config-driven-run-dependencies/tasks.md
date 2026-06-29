## 1. Target Model and Discovery

- [x] 1.1 Audit current app action target discovery, target id generation, run execution, and Docker Compose dependency handling
- [x] 1.2 Extend shared runtime types to include `powershell` and `systemshell`
- [x] 1.3 Update action target ids to include app ident, action, runtime, and profile so same-profile runtimes are distinct
- [x] 1.4 Add PowerShell run target discovery from `apps/run/<ident>-<profile>.ps1`
- [x] 1.5 Add `systemshell` run target discovery with strict OS resolution: `.ps1` on Windows, `.sh` on macOS/Linux
- [x] 1.6 Add tests for Docker/shell/PowerShell/systemshell profile collisions and target ids

## 2. Dependency Metadata Parsing

- [x] 2.1 Add dependency reference types for app run dependencies and infrastructure dependencies
- [x] 2.2 Parse `devenv:requires=[...]` metadata from shell and PowerShell run scripts
- [x] 2.3 Parse top-level `x-devenv.requires` from app Docker Compose run target files
- [x] 2.4 Ensure Docker Compose `depends_on` is ignored for DevEnv dependency graph construction
- [x] 2.5 Preserve platform-specific dependency drift by reading dependencies only from the resolved `systemshell` source file
- [x] 2.6 Add parser tests for valid refs, missing runtime/profile, malformed metadata, and platform drift

## 3. Dependency Graph Resolver

- [x] 3.1 Implement target registry abstraction for app run targets and infrastructure services
- [x] 3.2 Resolve object dependency refs to canonical internal target ids
- [x] 3.3 Validate unknown app targets, unknown infrastructure services, missing runtime, and missing profile before starting
- [x] 3.4 Detect dependency cycles and produce user-visible cycle chains
- [x] 3.5 Topologically sort dependencies with stable deterministic order
- [x] 3.6 Add resolver tests for nested deps, shared deps, already-running deps, missing deps, and cycles

## 4. Execution Orchestration

- [x] 4.1 Update app run start flow to resolve dependency graph before launching requested target
- [x] 4.2 Start missing dependencies before requested target and skip already-running dependencies
- [x] 4.3 Execute PowerShell run targets with correct working directory, logging, and status handling
- [x] 4.4 Execute `systemshell` targets through resolved shell/PowerShell runner and fail clearly when platform script is missing
- [x] 4.5 Update restart flow to stop only requested target, then resolve/start missing dependencies before relaunch
- [x] 4.6 Ensure stop flow stops only requested app run target and leaves dependencies running
- [x] 4.7 Add integration tests for start ordering, strict `systemshell`, stop semantics, and dependency failure behavior

## 5. API and TUI

- [x] 5.1 Include parsed dependency refs and runtime-specific ids in action target API responses
- [x] 5.2 Update TUI target picker to distinguish same-profile runtimes such as Docker `dev` and `systemshell` `dev`
- [x] 5.3 Show dependency validation/start errors in TUI with missing target or cycle details
- [x] 5.4 Optionally display dependency start plan during run start without requiring confirmation unless existing UX pattern requires it
- [x] 5.5 Ensure touched list views keep standard `/` search, `F` filter, and `O` sort where applicable or document why not

## 6. Documentation and Validation

- [x] 6.1 Update adding-apps guide with `devenv:requires`, `x-devenv.requires`, `systemshell`, and same-profile runtime examples
- [x] 6.2 Update adding-infrastructure guide with dependency reference examples for Docker and script infrastructure services
- [x] 6.3 Document breaking change: no backwards compatibility, no migration, users manually migrate configs from Compose `depends_on`
- [x] 6.4 Update example config generation to use new metadata format where run dependencies are demonstrated
- [x] 6.5 Run targeted backend and TUI tests during implementation
- [x] 6.6 Run full test suite before finishing feature
- [x] 6.7 Check pi-lens issues if available before finishing feature
