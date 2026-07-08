## 1. Stop Routing

- [ ] 1.1 Update TUI app stop action to pass `runTargetInfo.targetId` to `client.stopApp` when present.
- [ ] 1.2 Update backend app stop lifecycle to use recorded or persisted run target info when no explicit target id is provided.
- [ ] 1.3 Ensure target-specific Docker-compatible stop commands include `-f <compose file>` and preserve existing env-file argument behavior.
- [ ] 1.4 Add safe fallback handling for missing/stale recorded target ids, including source path or default compose resolution where appropriate.

## 2. Tests

- [ ] 2.1 Add backend unit test for stopping a recorded Docker profile target with configured compose file path.
- [ ] 2.2 Add backend unit test for Podman compose stop command including `podman-compose` and `-f <config compose>`.
- [ ] 2.3 Add backend unit test for persisted run target info after service/server restart being used for stop routing.
- [ ] 2.4 Add TUI/client action test that app stop passes active `runTargetInfo.targetId` when available.
- [ ] 2.5 Add regression test proving stop does not emit unqualified `podman-compose down` for profile-picker-started apps.

## 3. Validation

- [ ] 3.1 Run targeted Go tests for build stop lifecycle and run target persistence.
- [ ] 3.2 Run targeted Bun tests for TUI stop action behavior.
- [ ] 3.3 Run full test suite.
- [ ] 3.4 Check pi-lens issues if available.
