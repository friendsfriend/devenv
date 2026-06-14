## Context

The current script system has two parallel execution paths (client-side foreground via `spawnSync`, server-side background via `exec.Command`), each with duplicated interpreter resolution logic. Script type support is hardcoded to `.sh` (bash) and `.ps1` (PowerShell) via an extension-to-kind mapping. Parameter metadata is extracted by parsing `# @devenv:param` structured comments — a fragile ad-hoc key-value mini-language that doesn't translate to Python, TypeScript, or other runtimes.

The goal is to support **any executable script** without per-type code changes, using a **universal metadata convention** that works across languages.

## Goals / Non-Goals

**Goals:**
- Support any executable script in the Scripts tab (Unix: executable bit + shebang; Windows: shebang detection + extension fallback)
- Replace `@devenv:param` comment parsing with a universal `--devenv-metadata` convention where scripts declare their parameter schema as JSON on stdout
- Unify execution to shebang-based direct execution (the OS handles interpreter selection)
- Add a server API endpoint for metadata extraction with caching
- Simplify the codebase by removing `ScriptKind`, `scriptKindByExt`, `ParseScriptParameters`, and the hardcoded interpreter mapping in both Go and TypeScript

**Non-Goals:**
- No plugin system for script types (shebang handles this implicitly)
- No sandboxing or permission model (scripts run under the user's identity, like now)
- No changes to how the Scripts tab UI renders or navigates
- No changes to the `ScriptParameter` JSON schema (it's already language-agnostic)
- No package manager integration (pip, npm, etc.)

## Decisions

### Decision 1: Shebang-based execution (Unix) + lightweight shebang reader (Windows)

**Unix**: `exec.Command(scriptPath, args...)` invokes the kernel's shebang handler. No interpreter mapping needed. This is how Unix has always run scripts.

**Windows**: Read the first line of the file. If it starts with `#!`, extract the interpreter name (e.g., `#!/usr/bin/env python3` → `python3`). Map common interpreters to Windows commands (`python3` → `python`, `bun` → `bun.exe`). Fall back to extension-based table (`.py` → `python`, `.ts` → `bun`, `.js` → `bun`) if no shebang is found or the shebang can't be parsed.

The result is a single `resolveInterpreter(scriptPath) → (cmd, args) | null` function, used by both client and server. It returns `null` on Unix (run the file directly) and a command/args pair on Windows.

**Alternatives considered:**
- *Keep current per-kind mapping*: Requires code changes for every new type. Doesn't scale.
- *Use Windows `assoc`/`ftype` associations*: `exec.Command` on Windows already uses these for `.py`, `.ps1`, etc. But they're inconsistent across machines. Shebang reading is more reliable.

### Decision 2: `--devenv-metadata` as universal parameter convention

Scripts that want parameter prompting implement `--devenv-metadata`. On invocation with this flag, the script prints a JSON array of parameter definitions to stdout and exits with code 0.

**JSON schema** (same as existing `ScriptParameter[]`):
```json
[
  {
    "name": "env",
    "type": "enum",
    "required": true,
    "description": "Target environment",
    "choices": ["dev", "test", "prod"],
    "flag": "--env"
  }
]
```

**Discovery flow:**
1. DevEnv runs `script --devenv-metadata` with a short timeout (3s)
2. If exit code 0 and stdout parses as valid `ScriptParameter[]` → use as parameter schema
3. If exit code != 0, stdout doesn't parse, or timeout → script has no parameters (cache this result)
4. Cache the result per-script, invalidated on file mtime change

**Alternatives considered:**
- *Keep only comment parsing*: Doesn't work for non-shell languages. Can't express complex types.
- *`__devenv__` dict/module export convention*: Requires importing the script, which may have side effects. Language-specific extraction logic needed for each runtime.
- *Sidecar `.meta.json` files*: Two files to maintain, can drift out of sync.

### Decision 3: Metadata cache on the server

The server maintains an in-memory cache mapping `scriptRelativePath → { parameters, cachedAt, fileMtime }`. The client calls `GET /api/scripts/metadata?path=<relativePath>` to fetch metadata. On cache miss or stale mtime, the server runs `--devenv-metadata`, populates the cache, and returns the result.

**TTL strategy:**
- Cache is invalidated when the script file's modification time changes
- Cache is also invalidated on server restart (populated on first request)
- No explicit time-based TTL needed because filesystem mtime is the source of truth

**Alternatives considered:**
- *Client-side caching*: Adds complexity to the client, and the server already has file access.
- *No caching*: Every time the user opens the args modal, the script runs. Slow for scripts with long startup times.
- *Discovery-time extraction*: Running `--devenv-metadata` on every `DiscoverScripts` call would be too slow (scripts folder may have many scripts).

### Decision 4: Execution architecture — keep both paths, simplify both

Both the client-side foreground path and the server-side background path exist, but both now use the same simple direct execution model:

**Client (foreground):**
```
spawnSync(scriptPath, args)     // Unix: shebang handles interpreter
spawnSync(interpreter, args)    // Windows: from resolveInterpreter
```
Handles: interactive stdio, tmux windows, "press any key" prompt.

**Server (background):**
```
exec.Command(scriptPath, args)  // Unix
exec.Command(interpreter, args) // Windows
```
Handles: status logging, output capture, SSE broadcast, non-interactive execution.

Both call the same `resolveInterpreter()` helper for Windows, and both default to direct file execution on Unix.

### Decision 5: Script discovery — executable check on Unix, shebang+ext on Windows

**Unix**: A file is a valid script if:
- It's a regular file (not directory, not symlink to directory)
- It's executable by the user (`os.FileMode() & 0111 != 0`)
- It has a shebang line OR is a binary (binary executables like compiled Go programs should also work)

**Windows**: A file is a valid script if:
- It has a known executable extension (`.sh`, `.ps1`, `.py`, `.ts`, `.js`, `.exe`, `.bat`, `.cmd`)
- OR it has a shebang line (read first line) with a recognized interpreter

The extension-based filter is REMOVED on Unix (replaced by the executable check). On Windows, an extension filter is still needed because Windows doesn't use executable bits.

### Decision 6: Removing ScriptKind from the Go types

The `ScriptKind` enum (`bash`, `powershell`) is removed from `ScriptFile` and the API response. The `scriptType` field in `ScriptNode` is replaced with a derived `interpreter` string (e.g., `"python3"`, `"bun"`, `"bash"`) read from the shebang. This is informational only (for the UI to show which runtime a script uses). It's not used for execution decisions on Unix.

**TUI impact**: The `ScriptKind` type in `index.ts` is replaced with `string | null` or removed entirely. The `App.scriptType` field changes similarly. The UI shows the interpreter name (e.g., "python3", "bun") instead of "bash" / "powershell" labels.

## Risks / Trade-offs

- **Windows shebang parsing is inherently fragile**: The `#!` format varies (`#!/usr/bin/env python3` vs `#!/usr/bin/python3` vs `#!python3`). Mitigation: maintain a small mapping table of common shebang patterns to Windows commands. The fallback to extension-based mapping covers cases where shebang parsing fails.
- **`--devenv-metadata` execution has a startup cost**: Every script runs briefly to extract metadata. Mitigation: caching with mtime invalidation means each script only pays this cost once per edit. The timeout (3s) prevents runaway scripts from hanging the system.
- **Scripts with side effects in the `--devenv-metadata` branch**: A poorly written script might run its main logic even when `--devenv-metadata` is passed. Mitigation: convention-based. DevEnv documents that `--devenv-metadata` MUST exit early. Also the timeout prevents infinite hangs.
- **Executable bit check is not universal**: Some filesystems or environments may not support Unix permissions. Mitigation: the fallback behavior (treat file as script if it has a shebang OR is executable) covers the common cases. Users can always force a file to be treated as a script by giving it execute permissions.
- **Client-server interpreter resolution duplication (Windows)**: The `resolveInterpreter` function exists in both Go and TypeScript. Mitigation: it's a ~20-line function, and on Unix it's a no-op. The duplication is acceptable.

## Migration Plan

1. **Phase 1** — Server-side changes (Go)
   - Add `resolveInterpreter` to `resources/scripts.go` (Windows shebang reader + extension fallback)
   - Modify `DiscoverScripts` to use executable check (Unix) / shebang+ext (Windows) instead of `scriptKindByExt`
   - Add `GET /api/scripts/metadata` endpoint
   - Simplify `resolveScriptExecutionPlan` to use direct execution
   - Keep `ParseScriptParameters` as fallback for `.sh` scripts (deprecated)
   - Remove `ScriptKind` enum and related types from API responses
   - Update tests

2. **Phase 2** — Client-side changes (TypeScript)
   - Wire `openScriptArgsModal` to call `GET /api/scripts/metadata` instead of using inline parameters from the script tree
   - Simplify `runSelectedScriptInForeground` to direct execution
   - Add `resolveInterpreter` for Windows in `util-actions.ts`
   - Update types: remove `ScriptKind`, update `App.scriptType` to `interpreter: string | null`
   - Update test files

3. **Phase 3** — Cleanup
   - Remove `ScriptKind` constants and extension mapping
   - Update documentation

**Rollback**: The metadata API endpoint is additive — the old client continues to work with the old comment-based parameters. The discovery change (executable-based) is also additive — all previously discovered scripts are still discovered. The old `handleExecuteScript` path still exists for any client that calls it directly.
