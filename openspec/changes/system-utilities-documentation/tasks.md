## 1. Guide Document

- [ ] 1.1 Create `tui/packages/cli/src/tui/guides/system-utilities.md` with required utilities section
- [ ] 1.2 Add optional enhanced utilities section (lazygit, lazydocker, pi)
- [ ] 1.3 Add optional advanced utilities section (kubectl, helm, kind, k9s, worktrunk, ssh)
- [ ] 1.4 Include installation commands for macOS and Linux for each tool
- [ ] 1.5 Include how DevEnv uses each tool

## 2. Guide Registration

- [ ] 2.1 Add guide entry to `tui/packages/cli/src/tui/guides/index.ts`
- [ ] 2.2 Set category to "Setup" or "Getting Started"
- [ ] 2.3 Verify guide appears in Help view Guides tab

## 3. README Update

- [ ] 3.1 Add "System Utilities" section to `README.md` under Requirements
- [ ] 3.2 List required tools with one-line descriptions
- [ ] 3.3 List optional tools with one-line descriptions
- [ ] 3.4 Link to the TUI guide for full details

## 4. Startup Utility Detection

- [ ] 4.1 Create utility detection function that checks PATH for each optional tool
- [ ] 4.2 Run detection in background on TUI startup (non-blocking)
- [ ] 4.3 Log found utilities to status log: "Found: lazygit, lazydocker"
- [ ] 4.4 Don't log missing utilities (only positive detections)

## 5. Testing

- [ ] 5.1 Verify guide renders correctly in Help view markdown modal
- [ ] 5.2 Verify guide content is accurate and installation commands work
- [ ] 5.3 Test startup detection finds installed utilities
- [ ] 5.4 Test startup detection doesn't block TUI loading
