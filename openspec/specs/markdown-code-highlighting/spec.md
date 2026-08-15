# markdown-code-highlighting Specification

## Purpose
TBD - created by archiving change add-tree-sitter-markdown-parsers. Update Purpose after archive.
## Requirements
### Requirement: Markdown surfaces register Tree-sitter parsers
The system SHALL register local Tree-sitter parsers for markdown and common fenced-code languages before TUI markdown surfaces render content.

#### Scenario: TUI starts with parser registration
- **WHEN** the TUI starts
- **THEN** Tree-sitter parsers are registered before markdown modal, issue, change-request, timeline, log AI, or review AI markdown content renders

#### Scenario: Common code fence languages are supported
- **WHEN** markdown content includes code fences labeled `ts`, `tsx`, `js`, `jsx`, `json`, `yaml`, `yml`, `go`, `bash`, `sh`, or `diff`
- **THEN** the system maps each label to a registered Tree-sitter filetype for syntax highlighting

### Requirement: Parser assets are local and standalone-safe
The system SHALL use local parser WASM/query assets that are bundled into standalone executable builds without network access at runtime.

#### Scenario: Standalone build includes parser assets
- **WHEN** a standalone DevEnv binary is built
- **THEN** the binary has access to the parser assets needed for registered filetypes without downloading files from the network

#### Scenario: Runtime has no network access
- **WHEN** the TUI renders markdown code fences while offline
- **THEN** syntax highlighting uses bundled parser assets and does not attempt remote parser downloads

### Requirement: Markdown theme styling remains unchanged
The system SHALL preserve existing markdown syntax style colors and semantic theme integration while adding parser-backed highlighting.

#### Scenario: Markdown renderer receives theme syntax style
- **WHEN** markdown content renders after parser registration
- **THEN** the renderer continues using the existing shared markdown syntax style derived from the active theme

