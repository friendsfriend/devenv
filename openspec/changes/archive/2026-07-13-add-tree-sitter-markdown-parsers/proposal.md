## Why

Markdown-heavy TUI surfaces render guides, issue descriptions, AI output, and review text, but fenced code highlighting is only reliable when OpenTUI's default Tree-sitter setup happens to include needed parsers. Standalone builds should have deterministic offline syntax highlighting for common DevEnv content.

## What Changes

- Add local Tree-sitter parser/query assets for markdown code fences and common DevEnv languages.
- Register parsers during TUI startup before markdown/code renderers need them.
- Ensure standalone executable builds include parser assets and keep worker/native paths compatible.
- Keep existing markdown visual styling from shared theme syntax styles.
- Add tests proving parser registration exists and markdown fenced-code filetype mappings cover expected labels.

## Capabilities

### New Capabilities
- `markdown-code-highlighting`: Deterministic Tree-sitter parser registration for markdown and common fenced-code languages in TUI markdown surfaces.

### Modified Capabilities

## Impact

- TUI startup: parser registration before OpenTUI renderers use markdown/code highlighting.
- UI markdown surfaces: `MarkdownModal`, issue/change-request markdown, timeline comments, AI overlays.
- Build pipeline: parser assets included in standalone compiled executables.
- Dependencies/assets: local Tree-sitter WASM/query files or generated parser asset imports managed by OpenTUI tooling.
