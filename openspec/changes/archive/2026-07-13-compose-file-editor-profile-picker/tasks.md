## 1. Server-Side Profile Discovery

- [ ] 1.1 Add `GET /api/apps/{ident}/compose-profiles` endpoint to `server/pkg/server/handlers.go`
- [ ] 1.2 Scan `{configDir}/apps/compose/` for `{ident}-*-compose.yml` and `{ident}-compose.yml` files
- [ ] 1.3 Return `{ profiles: [{ name, path, fileName }] }` response

## 2. New Profile Creation Endpoint

- [ ] 2.1 Add `POST /api/apps/{ident}/compose-profiles` endpoint accepting `{ name: string }`
- [ ] 2.2 Validate profile name: alphanumeric + hyphens only
- [ ] 2.3 Create file at `{configDir}/apps/compose/{ident}-{name}-compose.yml` with minimal template
- [ ] 2.4 Return the created file path

## 3. TUI Client Layer

- [ ] 3.1 Add `getComposeProfiles(ident)` method to `tui/packages/core/src/apps-client.ts`
- [ ] 3.2 Add `createComposeProfile(ident, name)` method to `tui/packages/core/src/apps-client.ts`
- [ ] 3.3 Add `ComposeProfile` type to `tui/packages/types/src/index.ts`

## 4. UI Store Signals

- [ ] 4.1 Add `showComposeProfilePicker`, `composeProfilePickerProfiles`, `composeProfilePickerAppIdent`, `composeProfilePickerSelectedIndex` signals to `ui-store.ts`
- [ ] 4.2 Add `showNewProfileModal`, `newProfileName`, `newProfileError`, `newProfileAppIdent` signals

## 5. ComposeProfilePickerView Component

- [ ] 5.1 Create `tui/packages/ui/src/components/ComposeProfilePickerView.tsx`
- [ ] 5.2 Render profile list with `j`/`k` navigation
- [ ] 5.3 Show profile name and file path for each entry
- [ ] 5.4 Add "Default (no profile)" option for the default compose file
- [ ] 5.5 `Enter` selects profile and closes modal
- [ ] 5.6 `n` opens new profile name input
- [ ] 5.7 `Escape` closes modal

## 6. New Profile Name Modal

- [ ] 6.1 Create text input modal for new profile name
- [ ] 6.2 Validate name on confirm: alphanumeric + hyphens only
- [ ] 6.3 Show error message for invalid names
- [ ] 6.4 On valid name: call API to create file, then open in editor

## 7. Keyboard Integration

- [ ] 7.1 Add `E` keybinding in table key handler to open compose profile picker
- [ ] 7.2 Wire `E` in app detail key handler as well
- [ ] 7.3 Create keyboard handler file for compose profile picker modal

## 8. Editor Integration

- [ ] 8.1 After profile selection, open compose file via existing `EditorPickerView` flow
- [ ] 8.2 Pass the compose file path as the target path

## 9. Export & Polish

- [ ] 9.1 Export `ComposeProfilePickerView` from `tui/packages/ui/src/index.ts`
- [ ] 9.2 Style with theme colors
- [ ] 9.3 Test with app that has multiple profiles
- [ ] 9.4 Test with app that has no compose files
