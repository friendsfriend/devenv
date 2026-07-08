## Why

DevEnv integrates with several external utilities (lazygit, lazydocker, pi, ssh, kubectl, helm, kind, k9s, worktrunk) but doesn't document which are required vs optional, how to install them, or how DevEnv uses them. Users discover these dependencies through error messages or trial and error.

## What Changes

- New guide: "System Utilities" covering required and optional tools
- Each tool: what it does, how DevEnv uses it, installation command
- Register guide in the help view
- Add "System Utilities" section to README

## Capabilities

### New Capabilities
- `system-utilities-guide`: Documentation guide listing required and optional system utilities with installation instructions

### Modified Capabilities

## Impact

- `tui/packages/cli/src/tui/guides/system-utilities.md` — new guide file
- `tui/packages/cli/src/tui/guides/index.ts` — register new guide
- `README.md` — add System Utilities section
