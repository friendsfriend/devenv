# Performance Tracking

## Work completed

| # | Change | Files | Impact |
|---|--------|-------|--------|
| 0 | Perf fixture generator | `scripts/create-perf-config.ts` | Reproducible large-config performance testing with `bun run perf:fixture` |
| 0 | Renderer stats enabled | `app-opentui.tsx` | Debug overlay with FPS, frame times, memory via `OTUI_SHOW_STATS=true` |
| 0 | Perf fixture doc in AGENTS.md | `AGENTS.md` | Team knows how to spin up perf tests |
| 1 | Backend status dedupe | `server/pkg/server/server.go` | Repeated identical status payloads suppressed. Server log: 6405 → 27 lines |
| 1 | Git poller log gated | `server/pkg/server/server.go` | Per-app poller logs behind `DEVENV_DEBUG_POLLER=1` |
| 2 | Backend paged log history endpoint | `server/pkg/logging/logger.go`, `server/pkg/logging/history_test.go`, `server/pkg/server/handlers_apps.go` | `GET /api/logs/history/{action,operation}/{appIdent}?before=&limit=` with byte-offset backward reader |
| 2 | TUI log store `logLines[]` + capped append + prepend | `log-store.ts`, `log-actions.ts`, `log-modal-keys.ts`, `LogModal.tsx`, `log-effects.ts` | O(n²) string growth eliminated, memory bounded (20k cap). Older logs prepended, streaming lines appended |
| 2 | Log polling dedupe + inflight guard | `log-effects.ts` | No overlapping poll fetches, unchanged payloads skipped |
| 3 | Diff comment pre-indexed | `DiffViewModal.tsx` | O(lines × discussions) → O(1) lookup. Bench: 51ms → 4ms |
| 4 | Table search optimized | `app-store.ts` | `Object.values(app).some(String…` replaced with targeted field search. Single sort pipeline. Bench: spike 14ms → reduced |
| 4 | Table search reactive | `content-router.tsx` | Eager IIFE replaced with reactive nested `<Show>` branches |
| 5 | Spinner interval only when active | `app-opentui.tsx` | 80ms not 40ms, ticks only during loading/operations |
| 5 | Running text interval reactive | `app-opentui.tsx` | Only exists while `runningTextEnabled()` |
| 6 | Test/CR memo cleanup | `cr-store.ts` | Test sorting memoised independently from selection. Filter counts avoid redundant sort |
| 6 | Timeline metadata precomputed | `TimelineView.tsx` | Single-pass metadata, numeric sort, memoised heights, single-pass stats |
| 7 | Log polling merge logic | `log-effects.ts` | Overlap matching so prepended history + live poll don't duplicate |
| 8 | Console disabled by default | `app-opentui.tsx`, `global-keys.ts` | `consoleMode: "disabled"` unless `DEVENV_TUI_CONSOLE=1` |
| 8 | Console access optional-safe | `global-keys.ts` | Optional chaining on `renderer.console` prevents crash |
| 9 | JSX pragma on all UI components | `packages/ui/src/components/*.tsx` | `bun test` green: **39 pass, 0 fail** |

## Remaining issues from perf re-run (2026-07-07)

### Baseline results

**500 apps fixture** — table loaded successfully.

| Metric | Value |
|--------|-------|
| Server log size | 27 lines, 4.0K |
| Overall avg | ~2.5ms |
| Render avg | ~0.07ms |
| Output avg | ~0.15ms |
| Frame callback avg | ~0.14ms |
| Memory | ~179MB / 259MB / 9.7MB |

**2000 apps + 1000 scripts** — TUI still stuck:

```
Loading infrastructure services...
```

Last server log: `GET /api/scripts` — no completion. Script loading is bottleneck.

### Search staleness

Search `/perf-app-049` shows header `(8 results)` but visible rows remain unfiltered. Count updates, rows stale. Reactivity chain broken.

## Next steps

### P0 — Fix table search row staleness

**Problem:** `ScrollableList` visible items memo depends on `props.items`, but the table's render path creates a stale closure.

**Investigation:**
- Does `ScrollableList`/`visibleItems` memo re-run when `props.items` changes?
- Are `props.items` passed correctly through content-router → Table → ScrollableList?
- Does Solid `<Show fallback={...}>` or `<For>` capture stale arrays?

**Approach:**
1. Verify `appStore.tableFilteredApps()` signal is tracked at every level.
2. Replace local-variable aliases with direct signal calls.
3. Use `createMemo` in content-router so all consumers read the signal reactively.
4. Test with 500+ app fixture.

---

### P0 — Profile script loading bottleneck

**Problem:** `GET /api/scripts` with 1000 scripts never responds.

**Diagnostics needed:**
- Add server-log timing around `/api/scripts` handler.
- Does it crawl filesystem? (likely `os.ReadDir` / `fs.WalkDir`)
- Add timeout or cancellation in TUI client.
- Consider lazy/paginated script loading for large script directories.

**Fix candidates:**
- `GET /api/scripts` with pagination params.
- Client loads scripts in chunks.
- Directory reading capped per page.

---

### P1 — Verify table search fix with re-run

After fixing search row reactivity:
1. Deploy fix.
2. Re-run 500-app fixture.
3. Search `/perf-app-049`.
4. Confirm 8 visible rows, not 375.
5. Cycle apps/libs/infra/scripts tabs.
6. Verify selected index clamped correctly on filter.

---

### P1 — Re-run 2000+1000 fixture

After fixing script loading:
1. Fresh fixture generate: `bun run perf:fixture -- --apps 2000 --scripts 1000`.
2. Run TUI with stats overlay.
3. Record metrics:

   | Metric | Target |
   |--------|--------|
   | Startup time | <10s |
   | Memory | <200MB |
   | Overall avg | <5ms |
   | Output avg | <1ms |
4. Search, tab switch, open logs — all responsive.

---

### P1 — Manual verify older log loading

Requires long-running action/operation log during fixture session:
1. Start script infra or action that writes ~100k lines.
2. Open log modal.
3. Scroll up near top.
4. Confirm "Loading older logs…" indicator.
5. Older chunks prepended, scroll anchor stable.
6. "Start of log" shown when exhausted.

---

### P2 — Manual verify console disabled

1. Run TUI with no env var.
2. `Ctrl+/` — no crash, no console overlay.
3. Run TUI with `DEVENV_TUI_CONSOLE=1`.
4. `Ctrl+/` — console overlay toggles.

---

### P2 — Add performance documentation

Create `docs/performance.md` covering:

- `bun run perf:fixture` introduction.
- `OTUI_SHOW_STATS=true` — debug overlay fields explained.
- `DEVENV_DEBUG_POLLER=1` — verbose poller diagnostics.
- `DEVENV_TUI_CONSOLE=1` — enable console overlay when needed.
- Common perf investigation patterns.
- Recommended fixture sizes: 500 (smoke), 2000+1000 (stress).

---

### P3 — Convert long log to true virtual window (optional)

Currently `LogModal` renders all lines via `<For each={lines()}>`. OpenTUI viewport culling helps, but for 100k+ lines JSX still creates all virtual elements.

**Approach:**
1. Keep only visible window + small buffer in JSX.
2. Render placeholder/spacer rows for off-screen segments.
3. ScrollBox + file cursor for seamless infinite scroll.
4. Prepend/append history as buffer shifts.

**Cost:** medium. Benefit: large for 100k+ log sessions.

---

### P3 — Extend log history to more log types (optional)

Currently covers action + operation (file-backed `.log` files). Candidates:

| Type | Source | Cursor approach |
|------|--------|----------------|
| Script infra logs | File-backed | Byte offset |
| Job logs | GitLab/GitHub API | Timestamp / page number |
| Container logs | Docker API | `since` timestamp |
| Kubernetes logs | `kubectl logs` | Timestamps |
| Status logs | `status.log` file | Byte offset |

**Approach:**
- Each source implements `LogHistoryProvider` interface.
- TUI abstracts cursor as `string|number`.
- Clients use same prepend/scroll/merge logic.

---

### P3 — OpenSpec archive/verify (if tied to change workflow)

If this perf work derives from an approved change proposal:
- Archive as completed spec change.
- Or create new proposal for remaining items.

---

## Running perf checks

### Fixture generation

```sh
# 500 apps (quick smoke)
bun run perf:fixture -- --apps 500

# 2000 apps + 1000 scripts (stress)
bun run perf:fixture -- --apps 2000 --scripts 1000

# Custom paths
bun run perf:fixture -- --config-dir /tmp/my-perf --home-dir /tmp/my-perf-home --apps 500
```

### Running TUI with perf tooling

```sh
DEVENV_CONFIG_DIR=/tmp/devenv-perf-config \
DEVENV_HOME=/tmp/devenv-perf-home \
OTUI_SHOW_STATS=true \
bun run dev -p 4061
```

### Environment flags

| Flag | Purpose |
|------|---------|
| `OTUI_SHOW_STATS=true` | Enable debug overlay at startup |
| `DEVENV_DEBUG_POLLER=1` | Verbose poller change logs |
| `DEVENV_TUI_CONSOLE=1` | Enable OpenTUI console overlay |
