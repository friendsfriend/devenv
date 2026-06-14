## 1. Server — Discovery & Type Cleanup (Go)

- [x] 1.1 Add `resolveInterpreter(scriptPath string) (cmd string, args []string, err error)` to `resources/scripts.go` — shebang reader for Windows, returns `("", nil, nil)` on Unix to signal direct execution
- [x] 1.2 Modify `DiscoverScripts` to use executable check (Unix: `os.FileMode() & 0111`) instead of `scriptKindByExt` filter; on Windows fall back to shebang + extension detection
- [x] 1.3 Remove `ScriptKind` enum, `scriptKindByExt`, `ParseScriptParameters`, `parseKeyValueAttrs` from `resources/scripts.go`
- [x] 1.4 Remove `Kind` field from `ScriptFile` struct; add `Interpreter string` field derived from shebang (informational, not used for execution on Unix)
- [x] 1.5 Update `ScriptNode` JSON response to replace `scriptType` with `interpreter` string
- [x] 1.6 Update `resources/scripts_test.go` to test new discovery logic (executable check, Python/TS files, non-executable files ignored, Windows shebang detection)

## 2. Server — Metadata API & Caching (Go)

- [x] 2.1 Add `GET /api/scripts/metadata?path=<relativePath>` handler in `handlers_scripts.go` — returns `{ "parameters": [...] }` or `{ "parameters": [] }`
- [x] 2.2 Implement `--devenv-metadata` invocation: run `scriptPath --devenv-metadata` with 3-second timeout, capture stdout, parse JSON as `[]ScriptParameter`
- [x] 2.3 Add in-memory metadata cache with mtime invalidation (map keyed by absolute path, value = `{ parameters, fileMtime }`)
- [x] 2.4 Handle error cases: non-zero exit, invalid JSON, timeout → return empty parameters (no error to client)
- [x] 2.5 Update `server/scripts_test.go` with tests for metadata endpoint (valid schema, no support, timeout, cache behavior)

## 3. Server — Execution Simplification (Go)

- [x] 3.1 Simplify `resolveScriptExecutionPlan` to use direct execution: on Unix `exec.Command(scriptPath, extraArgs...)`, on Windows use `resolveInterpreter` to get command + args
- [x] 3.2 Update `handleExecuteScript` to use simplified execution plan; pass `runtime.GOOS` and `exec.LookPath` as before
- [x] 3.3 Remove `ScriptKind` switch cases from `resolveScriptExecutionPlan`
- [x] 3.4 Update `server/scripts_test.go` to verify execution works for any script type (Python, Bun, etc.)

## 4. Client — Types & API Client (TypeScript)

- [x] 4.1 Update `tui/packages/types/src/index.ts`: remove `ScriptKind` type, replace `App.scriptType` with `interpreter: string | null`, add `ScriptMetadataResponse` type `{ parameters: ScriptParameter[] }`
- [x] 4.2 Add `getScriptMetadata(deps, relativePath): Promise<ScriptMetadataResponse>` to `tui/packages/core/src/scripts-client.ts`
- [x] 4.3 Update `scriptNodes → scriptRowsAsApps` mapping in `app-store.ts` to use `interpreter` instead of `scriptType`

## 5. Client — Execution Simplification (TypeScript)

- [x] 5.1 Simplify `runSelectedScriptInForeground` in `util-actions.ts`: on Unix `spawnSync(scriptPath, args)`, remove hardcoded bash/pwsh interpreter resolution
- [x] 5.2 Add `resolveInterpreter` for Windows (shebang reader + extension fallback table) in `util-actions.ts`
- [x] 5.3 Remove the `resolveInterpreter` inner function that does the bash/pwsh lookup; replace with direct shebang-based logic

## 6. Client — Wire Metadata API into Flow (TypeScript)

- [x] 6.1 Update `openScriptArgsModal` in `util-actions.ts` to call `getScriptMetadata()` from the server instead of using inline `scriptParameters` from the app row
- [x] 6.2 Update `executeSelectedScript` in `app-actions.ts` (unused server path) or remove it if obsolete; ensure the foreground path is the canonical interactive path
- [x] 6.3 Verify `ScriptArgsModal` keyboard handler in `misc-modal-keys.ts` still works with metadata fetched from server

## 7. Cleanup

- [x] 7.1 Remove `@devenv:param` comment parser (`ParseScriptParameters`, `parseKeyValueAttrs`) and all related code from `resources/scripts.go`
- [x] 7.2 Update default script template in `handlers_scripts.go` to remove `@devenv:param` examples; add `--devenv-metadata` example instead
- [x] 7.3 Update `openspec/specs/script-collections/spec.md` permanently (in the specs directory, not just the change delta) to reflect new architecture
- [x] 7.4 Run full test suite (`go test ./...` and `bun test`) and fix any failures
