## Context

Compose files follow the naming convention: `{appIdent}-compose.yml` (default) and `{appIdent}-{profile}-compose.yml` (profile variants). Profile discovery already exists in the server's `DiscoverActionTargets` which scans for matching filenames. The TUI already has an `EditorPickerView` that opens files in the user's configured editor.

The flow is: profile picker modal → user selects profile → open compose file in editor via existing `EditorPickerView`.

## Goals / Non-Goals

**Goals:**
- List all discovered profiles for the selected app
- Allow opening any profile's compose file in the user's editor
- Allow creating a new profile (enter name → create file → open in editor)
- Show file path for each profile

**Non-Goals:**
- In-TUI compose file editing (use external editor)
- Compose file syntax validation
- Deleting compose profiles

## Decisions

### 1. Server-side profile discovery endpoint

New `GET /api/apps/{ident}/compose-profiles` endpoint returns discovered profiles with their file paths. This reuses the existing file scanning logic from `DiscoverActionTargets`.

**Alternative considered:** Client-side directory scan. Rejected because the config directory path is server-managed and the TUI doesn't have direct filesystem access.

### 2. Reuse EditorPickerView for opening files

After profile selection, open the compose file via the existing `EditorPickerView` flow. No new editor integration needed.

### 3. New profile creation via modal prompt

"Create new profile" shows a small text input modal for the profile name, then creates the file from a minimal template, then opens in editor.

## Risks / Trade-offs

- **[Risk] User creates profile with invalid name** → Validate: alphanumeric + hyphens only, no spaces
- **[Trade-off] File created with minimal template** → User gets an empty-ish compose file; acceptable since they'll edit it anyway
