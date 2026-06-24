## 1. Command and Generator Structure

- [x] 1.1 Add `devenv create-example-config` Cobra command.
- [x] 1.2 Add a small example config generator package that can be called without starting the service container.
- [x] 1.3 Reuse or extract config directory resolution so the command follows `DEVENV_CONFIG_DIR` and `~/.config/devenv` behavior.
- [x] 1.4 Resolve initial home directory from `DEVENV_HOME` or `~/devenv` for script generation.

## 2. Safety Checks

- [x] 2.1 Implement non-empty directory detection for guarded paths.
- [x] 2.2 Fail before writing files when the config directory is non-empty.
- [x] 2.3 Fail before writing files when the scripts directory is non-empty.
- [x] 2.4 Allow missing or empty config and scripts directories.

## 3. Example Config Files

- [x] 3.1 Generate `.env` with example values including `DEVENV_HOME`.
- [x] 3.2 Generate app definitions for the Go REST API and Bun/TypeScript app.
- [x] 3.3 Generate infrastructure definitions for Postgres, Redis, and Mailpit.
- [x] 3.4 Generate the Bun TypeScript library definition.
- [x] 3.5 Generate app compose files, including multiple profiles for the Bun/TypeScript app.
- [x] 3.6 Generate infrastructure compose files with a shared example network where needed.
- [x] 3.7 Generate build and test Dockerfiles for both apps and the library.

## 4. Example Scripts

- [x] 4.1 Generate executable shell script example.
- [x] 4.2 Generate executable Python script example.
- [x] 4.3 Generate executable TypeScript/Bun script example.
- [x] 4.4 Ensure generated scripts have executable permissions on Unix.

## 5. Validation

- [x] 5.1 Add unit tests for successful generation into empty temp config/home directories.
- [x] 5.2 Add unit tests for config-dir non-empty failure with no partial writes.
- [x] 5.3 Add unit tests for scripts-dir non-empty failure with no partial writes.
- [x] 5.4 Add unit tests that expected app, infra, library, compose, Dockerfile, and script files are generated.
- [x] 5.5 Run the full test suite.
- [x] 5.6 Check pi-lens issues if available.
