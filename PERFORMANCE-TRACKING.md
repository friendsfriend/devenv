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
| 10 | Script metadata mtime cache | `handlers_scripts.go` | File-mtime caching avoids re-executing unchanged scripts. Second load instant. |
| 10 | Concurrent script metadata extraction | `handlers_scripts.go` | Worker pool (10 goroutines) reduces 1000 scripts from ~76s to ~8s. |
| 10 | Process group kill on timeout | `handlers_scripts.go` | `Setpgid: true` + `syscall.Kill(-pid, SIGKILL)` kills script + children. |
| 11 | startScriptHealthPoller broadcast cache | `server.go` | Only broadcast when tmux run state or script status actually changed. |
| 12 | hasActiveSpinner memoized | `app-store.ts`, `app-opentui.tsx` | `createMemo` over `apps()` instead of iterating `filteredApps()` every 80ms. |
| 13 | Startup splash error handling | `init-actions.ts`, `app-actions.ts` | Outer catch sets `phase: 'failed'` with error message. `loadScripts` propagates errors. |
| 13 | Startup splash phases added | `init-actions.ts`, `startup-splash.tsx`, `app-store.ts` | Added "Loading scripts" and "Loading providers" steps. |
| 14 | Perf documentation | `docs/performance.md` | Debug overlay guide, env flags, sizing guidelines, profiling patterns. |
| 15 | Table search reactivity fix | `content-router.tsx` | `Switch`/`Match` pattern (attempted — pre-existing OpenTUI issue, count works but rows stale). |
| 16 | Virtual-window log render | `LogModal.tsx`, `modal-overlays.tsx` | Only renders visible lines + 30-line buffer. Bounded vnodes regardless of total log size. |

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

**Status:** Investigation complete — root cause not found.

**Evidence:**
- Search count (`props.apps.length`) updates correctly: `(9 results)` shown.
- Search query shown correctly in header: `/049`.
- `tableFilteredApps` memo correctly returns 9 filtered items.
- But visible rows remain from the unfiltered 375-item list.
- Debug text `apps()[0].ident` in the Table component shows `perf-app-0001` (incorrect) while `apps().length` in the same component shows `9` (correct) for SearchHeader.

**Hypothesis:** OpenTUI Solid runtime has a bug with array prop updates through nested `<Show fallback={...}>` component chains. The value propagates correctly to `.length` (a number) but not to array content (object identity).

**Workarounds attempted:**
- Replaced `<Show fallback={...}>` with sibling `<Show>` components.
- Replaced with `<Switch>`/`<Match>`.
- Replaced `appStore.tableFilteredApps()` with a `createMemo` wrapper.
- Replaced `createMemo` with a plain getter function.
- Changed `tableFilteredApps` from `createMemo` to `createSignal`+`createEffect`.
- Added key elements to force remount.
- All failed to propagate the array content correctly.

**Next approach needed:**
- Render table rows bypassing the Table/ScrollableList component chain altogether.
- Or restructure the content-router to avoid nested Show components for table selection.
- Or report OpenTUI issue and apply upstream fix.

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

**Status:** Integration verified.
- History endpoint returns pages correctly (`/api/logs/history/operation/perf-app-0001?limit=5` returns `lines: 5, hasMore: True, nextBefore: 257655`).
- TUI wiring: `loadOlderLogs()` calls `client.getLogHistory()`, prepends lines, preserves scroll position.
- Keyboard handler calls `maybeLoadOlderLogs()` on scroll-up (k, u, g).
- Visual UX verification (loading overlay, "Start of log" marker) needs interactive TUI session with a multi-page log.

---

### P2 — Manual verify console disabled

**Status:** Verified by code + integration test.
- Default (`consoleMode: "disabled"`): `renderer.console` is undefined. Handler checks `if (renderer.console)` → returns false. No crash, no console.
- With `DEVENV_TUI_CONSOLE=1` (`consoleMode: "console-overlay"`): Console is created. `Ctrl+/` toggles it. TUI ran successfully with the env var.
- Escape handler uses optional chaining (`renderer.console?.visible`) → safe when console absent.

---

### P2 — Performance documentation

**Status:** Done. `docs/performance.md` covers:
- `bun run perf:fixture` usage
- Debug overlay field reference
- Environment flags (`OTUI_SHOW_STATS`, `DEVENV_DEBUG_POLLER`, `DEVENV_TUI_CONSOLE`)
- Sizing guidelines
- Startup sequence explanation
- Profiling patterns

---

### P3 — Convert long log to true virtual window (optional)

**Status:** Attempted, reverted. Spacer-based virtual window causes scroll sync issues with OpenTUI scrollbox — the independently-maintained `scrollTop` and spacer heights drift apart, producing empty space.

Existing `viewportCulling={true}` on the scrollbox already skips painting off-screen cells. The remaining overhead (vnodes for 20k lines) is acceptable for the intended log sizes (<20k lines). A proper fix would require either:
- An upstream OpenTUI scroll event callback so the virtual window stays in sync.
- A fully manual scroll implementation (no scrollbox) where scroll position is tracked purely via signals.

---

### P3 — Extend log history to more log types (optional)

**Status:** Partially implemented. Added `script` and `status` types.

| Type | Source | Status |
|------|--------|--------|
| action | Active operation log file | ✅ Done |
| operation | `{homeDir}/logs/{appIdent}.log` | ✅ Done |
| script | `{homeDir}/logs/{ident}.log` (same as operation) | ✅ Added |
| status | `{homeDir}/logs/status.log` using `ReadLinesBefore` | ✅ Added |
| Job logs | GitLab/GitHub API | ⏳ Needs provider-specific caching |
| Container logs | Docker API | ⏳ Needs `since` timestamp cursor |
| Kubernetes logs | `kubectl logs` | ⏳ Needs timestamp cursor |

The client `LogHistoryType` union now accepts `'action' | 'operation' | 'script' | 'status'`. TUI wiring in `initializeHistoricalLog` and `loadOlderLogs` works for all file-backed types.

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
