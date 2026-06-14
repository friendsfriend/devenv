## Why

The current script system supports only `.sh` (bash) and `.ps1` (PowerShell), with parameters extracted via a fragile structured-comment format (`# @devenv:param`). This prevents users from running the wide variety of scripts they naturally author — Python automation, Bun/TypeScript utilities, Deno tools, or any executable with a shebang. Adding new types requires code changes in both the Go server and TypeScript client, and the comment-based parameter format doesn't translate to other languages. We need a universal, low-friction approach that lets any executable script work in DevEnv with minimal (or zero) modification.

## What Changes

- **BREAKING**: Script discovery changes from extension-based (`.sh`, `.ps1`) to **executable-based**. Any file that is executable (Unix `+x`, or has a known extension on Windows) is treated as a script. The `scriptKindByExt` mapping is replaced by shebang detection + fallback extension table for Windows.
- **BREAKING**: Parameter extraction changes from `@devenv:param` structured comments to the **`--devenv-metadata` convention**. If a script supports this flag, DevEnv runs `script --devenv-metadata` and parses the JSON output as the parameter schema. If the flag is not supported, the script is treated as having no parameters.
- **BREAKING**: The server-side `ScriptKind` enum is reduced/removed — on Unix the OS handles interpreter selection via shebang. On Windows a lightweight shebang reader + extension fallback is used.
- The client-side `runSelectedScriptInForeground` switches from hardcoded interpreter mapping to direct execution (`spawnSync(scriptPath, args)`), letting the shebang determine the runtime.
- The server-side execution path (`POST /api/scripts/execute`) similarly switches to direct `exec.Command(scriptPath, args)` on Unix.
- Add a new `GET /api/scripts/metadata?path=<relativePath>` endpoint that runs `--devenv-metadata`, caches the result, and returns the parameter schema.
- Remove the `@devenv:param` comment parser (`ParseScriptParameters`) and the `ScriptKind` extension mapping from the Go codebase.

## Capabilities

### New Capabilities
- `devenv-metadata-protocol`: Defines the `--devenv-metadata` flag convention — the expected JSON schema format, how DevEnv discovers whether a script supports it, caching strategy, and the API endpoint for metadata retrieval.
- `multi-runtime-execution`: Defines how DevEnv discovers and executes any executable script — shebang detection, Windows fallback, the "anything executable" discovery rule, and how scripts appear in the Scripts tab regardless of language.

### Modified Capabilities
- `script-collections`: Requirements around script type detection, discovery filtering (what's "supported" changes from extension-based to executable-based), parameter extraction (comments → `--devenv-metadata`), and execution (interpreter mapping → shebang-based).

## Impact

- **Server Go code**: `resources/scripts.go` — remove `ScriptKind`, `scriptKindByExt`, `ParseScriptParameters`, `parseKeyValueAttrs`; simplify `DiscoverScripts` to check executability not extension; add shebang reader + Windows fallback. `server/handlers_scripts.go` — simplify `resolveScriptExecutionPlan` for shebang execution; add new metadata endpoint.
- **Server Go tests**: `resources/scripts_test.go`, `server/scripts_test.go` — update to match new discovery and parameter semantics.
- **Client TS code**: `util-actions.ts` — simplify `runSelectedScriptInForeground` interpreter resolution to direct execution; `buildArgsFromParameterValues` stays (flag building is still needed). `scripts-client.ts` — add metadata fetch call.
- **TUI components**: `ScriptArgsModal.tsx` — remains mostly unchanged (still renders parameters from schema). `ScriptAddModal.tsx` — may need small adjustments if default template changes.
- **Types**: `index.ts` — `ScriptKind` type may be simplified/deprecated; `ScriptParameter` stays (schema format is same).
- **Specs**: `script-collections/spec.md` — needs requirements updated (discovery, parameter extraction, execution).
- **Dependencies**: No new external dependencies. The shebang reader is a ~20-line function.
