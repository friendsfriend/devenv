## 1. Parser Assets

- [ ] 1.1 Choose and pin Tree-sitter parser/query versions for markdown, markdown_inline, TypeScript/TSX, JavaScript/JSX, JSON, YAML, Go, Bash, and optional diff support.
- [ ] 1.2 Add parser asset config and generated local asset imports using OpenTUI's Tree-sitter asset workflow or equivalent static imports.
- [ ] 1.3 Ensure parser assets use local file imports/paths only and contain no runtime network URLs.

## 2. Registration

- [ ] 2.1 Add an idempotent parser registration module for TUI startup.
- [ ] 2.2 Register markdown parser with injection queries and fence info-string mappings for common aliases.
- [ ] 2.3 Register language parsers with aliases for `ts`, `tsx`, `js`, `jsx`, `json`, `yaml`, `yml`, `go`, `bash`, and `sh`.
- [ ] 2.4 Call parser registration before renderer creation or before any markdown surface can render.

## 3. Markdown Integration

- [ ] 3.1 Verify existing markdown surfaces continue to use `getMarkdownSyntaxStyle()` and do not need per-component parser setup.
- [ ] 3.2 Add focused rendering or unit coverage showing fenced code labels resolve through registered filetypes.
- [ ] 3.3 Confirm markdown code highlighting works for guides, issue/change-request markdown, timeline comments, and AI overlays without changing layout.

## 4. Standalone Build

- [ ] 4.1 Update build configuration if needed so Bun standalone executables include parser WASM/query assets.
- [ ] 4.2 Run or document a targeted `bun run build:single` verification for parser asset availability in compiled output.
- [ ] 4.3 Check generated binary/runtime path handling for macOS, Linux glibc, Linux musl, and Windows targets where applicable.

## 5. Verification

- [ ] 5.1 Run `cd tui && bun test`.
- [ ] 5.2 Run `cd tui && bun run type-check`.
- [ ] 5.3 Run full project test suite and check pi-lens issues before finishing implementation.
