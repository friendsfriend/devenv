## Context

DevEnv renders Markdown in multiple TUI surfaces: help/guides, issue and change request descriptions, timeline comments, log AI output, and MR AI review output. These surfaces already pass `getMarkdownSyntaxStyle()` so theme colors are centralized, but parser registration is not explicit. OpenTUI supports Tree-sitter parser registration via local assets and recommends local imports for standalone builds.

The build already embeds OpenTUI native assets and the Go server into standalone binaries. Parser assets need the same deterministic, offline behavior.

## Goals / Non-Goals

**Goals:**
- Register Tree-sitter parsers for markdown plus common DevEnv code fences before markdown surfaces render.
- Use local assets so standalone binaries work offline.
- Keep current markdown theme styling and semantic colors.
- Cover common labels: `ts`, `tsx`, `js`, `jsx`, `json`, `yaml`, `yml`, `go`, `bash`, `sh`, and `diff`.
- Add tests for registration/mapping logic and build asset references.

**Non-Goals:**
- Redesign markdown rendering layout or colors.
- Add user-configurable parser management.
- Fetch parser assets at runtime.
- Implement every language supported by Tree-sitter.

## Decisions

### Use generated local parser asset imports

Use OpenTUI's Tree-sitter asset workflow or equivalent checked-in generated imports for parser WASM/query assets under the TUI source tree. Register them with `addDefaultParsers()` before renderer creation or before first markdown render.

Alternatives considered:
- Runtime URL downloads: simpler setup, but breaks offline and standalone reliability.
- Rely on OpenTUI defaults: less code, but not deterministic for required languages or compiled binaries.

### Centralize parser registration in a small TUI startup module

Create a module such as `tui/packages/cli/src/tui/tree-sitter-parsers.ts` or a UI-shared equivalent that owns parser definitions, alias mappings, and idempotent registration. Call it from `startTUI()` before `createCliRenderer()` or before markdown surfaces mount.

Alternatives considered:
- Register parsers inside each markdown component: duplicates setup and risks inconsistent aliases.
- Register in `@devenv/ui`: possible, but the CLI owns runtime/bootstrap concerns and standalone build paths.

### Register markdown injections for fenced code blocks

The markdown parser configuration should include injection queries and map common fence aliases to registered filetypes. Alias and `infoStringMap` handling should cover short and canonical labels (`ts` → `typescript`, `tsx` → `typescriptreact`, etc.).

Alternatives considered:
- Only register language parsers without markdown injections: code renderers could work, but markdown code fences would not reliably highlight.
- Parse fence labels manually in UI components: duplicates OpenTUI parser resolution logic.

### Preserve existing syntax style API

Keep `getMarkdownSyntaxStyle()` as the source of theme colors. Parser registration changes what tokens are recognized, not how colors are chosen.

Alternatives considered:
- Add per-language theme styles: more precise but larger design scope and higher maintenance.

## Risks / Trade-offs

- Parser WASM/query assets increase binary size → Limit initial language set to common DevEnv content and revisit after measuring build size.
- Parser asset versions can drift from query compatibility → Pin versions in parser config and regenerate together.
- Standalone builds may miss asset imports if paths are dynamic → Use static file imports or generated import module that Bun can analyze.
- Tree-sitter initialization may add startup cost → Register definitions early but rely on OpenTUI client lazy/cache behavior where possible.

## Migration Plan

1. Add parser asset config and generated asset module.
2. Add idempotent parser registration function.
3. Call registration during TUI startup before rendering.
4. Add tests for aliases, parser definitions, and no network URLs.
5. Verify `bun run build:single` or targeted build includes assets.
6. Rollback by removing registration call and parser assets; markdown still renders with existing unparsed styling.

## Open Questions

- Exact parser asset versions to pin for markdown and each language.
- Whether `diff` should use a Tree-sitter parser if available or remain plain styled text initially.
- Whether parser assets should live under `packages/cli/src/tui/parsers` or shared `packages/ui/src/parsers` for future reuse.
