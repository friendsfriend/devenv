## 1. Env File Utilities

- [x] 1.1 Add `.env` upsert helper that preserves unrelated lines and comments
- [x] 1.2 Add `.env` remove helper for selected keys while preserving unrelated entries
- [x] 1.3 Add tests for loading, upserting, quoting-safe values, and removing keys

## 2. Provider Storage

- [x] 2.1 Add deterministic provider credential env key generation
- [x] 2.2 Update provider save path to write credentials into `.env` and placeholders into provider JSON
- [x] 2.3 Keep legacy raw provider files loadable through existing load path
- [x] 2.4 Update provider delete path to remove provider-owned credential env entries

## 3. Provider Update Semantics

- [x] 3.1 Preserve existing token when update request omits or sends an empty token
- [x] 3.2 Replace token only when update request includes a non-empty token
- [x] 3.3 Keep provider create/edit API and TUI payload shape unchanged

## 4. Verification

- [x] 4.1 Add provider store tests for create storing placeholders and env entries
- [x] 4.2 Add provider store tests for update preserving and replacing token
- [x] 4.3 Add provider store tests for delete removing only matching env entries
- [x] 4.4 Run full test suite
- [x] 4.5 Check pi-lens issues if available
