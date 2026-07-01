## Context

DevEnv currently discovers app action variants from Docker files and shell scripts. Infrastructure is Docker Compose based today, with script infrastructure proposed in `add-script-infrastructure-services`. Dependency behavior relies on Docker Compose conventions, which cannot express native app run dependencies, script infrastructure, platform-specific runners, or same-profile targets where only runtime differs.

This change makes DevEnv own dependency orchestration. Docker Compose remains an execution runtime, not the source of cross-DevEnv dependency truth. No backwards compatibility or migration logic is required; users manually move dependency declarations into DevEnv metadata.

## Goals / Non-Goals

**Goals:**
- Add `systemshell` runtime: PowerShell on Windows, shell on macOS/Linux, strict with no fallback.
- Discover shell, PowerShell, Docker, and `systemshell` run targets with stable runtime-specific identities.
- Parse dependencies from run script metadata and Docker Compose `x-devenv.requires` metadata.
- Support dependencies from app run targets to other app run targets and infrastructure services.
- Resolve, validate, topologically sort, and start dependencies before requested target.
- Stop only the requested app run target; leave dependencies running.
- Allow `.sh` and `.ps1` files for same `systemshell` profile to declare different dependencies.

**Non-Goals:**
- Automatic config migration from Docker Compose `depends_on`.
- Backwards compatibility for old dependency conventions.
- Automatic stop of dependency trees or reference counting.
- Health checks beyond running/started state.
- Build/test dependency orchestration.
- Central dependency graph file or named stack/session ownership.

## Decisions

1. **Use target registry as orchestration boundary.**
   - Each runnable thing registers a target with id, app/infra identity, runtime, profile, source path, dependencies, status, start, stop, and logs.
   - App run targets and infrastructure services become graph nodes.
   - Rationale: dependency resolver should not know Docker/script internals.
   - Alternative considered: special-case Docker Compose and scripts in resolver. Rejected because it keeps current coupling.

2. **Use object dependency refs in config.**
   - App dependency shape: `{ "app": "backend", "runtime": "systemshell", "profile": "dev" }`.
   - Infra dependency shape: `{ "infra": "postgres" }`.
   - App refs always mean run targets; no `action` field.
   - Rationale: avoids ambiguous strings and gives clear validation errors.
   - Alternative considered: canonical strings like `app/backend/run/systemshell/dev`. Rejected for user-authored config but still useful internally.

3. **Keep runtime in target identity.**
   - Same app/profile can expose multiple targets: `docker`, `shell`, `powershell`, `systemshell`.
   - Internal canonical ids include action even if config refs omit it, e.g. `app/backend/run/systemshell/dev`.
   - Rationale: Docker `dev` and script `dev` are distinct runnable targets.

4. **Treat `systemshell` as declared runtime, not alias identity.**
   - `systemshell` resolves to PowerShell on Windows and shell on macOS/Linux at execution/discovery time.
   - Missing required platform script fails; no fallback to other runtime.
   - Rationale: portable configs need deterministic behavior and should not silently execute a non-native runtime.

5. **Read dependencies from resolved run source.**
   - Shell/PowerShell scripts use metadata comments, initially single-line JSON: `devenv:requires=[...]`.
   - Docker Compose uses top-level `x-devenv.requires`.
   - For `systemshell`, only current platform source is used. `.sh` and `.ps1` dependencies may drift intentionally.
   - Rationale: dependencies can differ per profile, runtime, and platform.

6. **Auto-start dependencies, stop requested target only.**
   - Start operation resolves graph, skips already-running nodes, starts missing dependencies before requested target.
   - Stop operation stops only selected target; dependencies remain running and shared.
   - Rationale: dependencies are often shared between apps, so automatic recursive stop is unsafe.

## Risks / Trade-offs

- **Platform-specific dependency drift can hide differences** → Show resolved dependencies for current OS and document drift as intentional.
- **No health checks means started may not mean ready** → Use running state for v1 and leave explicit health checks for later.
- **Manual migration can break existing configs** → Document required metadata format and provide clear validation errors; no code migration.
- **Cycles across app dependencies can block starts** → Detect cycles before starting anything and show dependency chain.
- **Metadata in comments can become hard to read** → Use single-line JSON for v1; consider YAML metadata block later.

## Migration Plan

No automated migration and no backwards compatibility are required. Users manually add `devenv:requires` metadata to scripts and `x-devenv.requires` to Compose files, and stop relying on Compose `depends_on` for DevEnv-level dependencies.

## Open Questions

- Whether start plan preview should require confirmation or only display while starting can be decided during TUI implementation.
- Whether dependency metadata should also support multi-line format later remains out of scope for v1.
