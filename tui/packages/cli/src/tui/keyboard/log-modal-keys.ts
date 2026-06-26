import type { KeyboardEvent, KeyboardStores, KeyboardActions, KeyboardContext } from './types';

import { isDownKey, isUpKey } from './nav-keys';
import { handleHorizontalScrollKey } from './horizontal-scroll';
/**
 * Handles keyboard events for the Log modal:
 * - AI prompt mode (type prompt, submit, dismiss)
 * - Search mode (type query, navigate matches)
 * - Visual mode (select range, copy)
 * - Line navigation (j/k/d/u/g/G)
 * - Horizontal scroll (h/l)
 * - AI overlay scroll & followup input
 */
export async function handleLogModalKeys(
  event: KeyboardEvent,
  stores: KeyboardStores,
  actions: KeyboardActions,
  ctx: KeyboardContext,
): Promise<boolean> {
  const { logStore, uiStore } = stores;
  const { appActions, logActions, utilActions } = actions;
  const { renderer } = ctx;

  if (!logStore.showLogModal()) return false;

  // ── AI prompt mode: capture typed characters into the AI prompt ───────
  if (logStore.logAiPromptMode()) {
    if (
      event.name === 'escape' ||
      event.name === 'Escape' ||
      event.name === 'esc' ||
      event.sequence === '\x1b' ||
      event.raw === '\x1b'
    ) {
      logStore.setLogAiPromptMode(false);
      logStore.setLogAiPromptText('');
      return true;
    }
    if (event.name === 'return' || event.name === 'enter') {
      logStore.setLogAiPromptMode(false);
      void logActions.runAiAnalysis();
      return true;
    }
    if (event.name === 'backspace' || event.name === 'delete') {
      logStore.setLogAiPromptText((q) => q.slice(0, -1));
      return true;
    }
    const ch = event.sequence ?? event.name ?? '';
    if (ch.length === 1 && ch >= ' ') {
      logStore.setLogAiPromptText((q) => q + ch);
      return true;
    }
    return true;
  }

  // ── Search mode: capture typed characters into the query ──────────────
  if (logStore.logSearchMode()) {
    if (
      event.name === 'escape' ||
      event.name === 'Escape' ||
      event.name === 'esc' ||
      event.sequence === '\x1b' ||
      event.raw === '\x1b'
    ) {
      logStore.setLogSearchMode(false);
      logStore.setLogSearchQuery('');
      logStore.setLogSearchMatchIndex(-1);
      return true;
    }
    if (event.name === 'return' || event.name === 'enter') {
      logStore.setLogSearchMode(false);
      const matches = logStore.logSearchMatchLinesList();
      if (matches.length > 0 && logStore.logSearchMatchIndex() < 0) {
        logStore.setLogSearchMatchIndex(0);
        logStore.setLogSelectedLine(matches[0]);
        logStore.logScrollBoxRef?.scrollTo(matches[0]);
        logActions.syncLogScroll();
      }
      return true;
    }
    if (event.name === 'backspace' || event.name === 'delete') {
      logStore.setLogSearchQuery((q) => q.slice(0, -1));
      logStore.setLogSearchMatchIndex(-1);
      return true;
    }
    const ch = event.sequence ?? event.name ?? '';
    if (ch.length === 1 && ch >= ' ') {
      logStore.setLogSearchQuery((q) => q + ch);
      logStore.setLogSearchMatchIndex(-1);
      return true;
    }
    return true; // swallow all other keys while typing
  }

  // q to quit
  if (event.name === 'q' || event.name === 'Q') {
    appActions.exitApp();
    return true;
  }

  // e — open system log file in editor (only in normal mode)
  if ((event.name === 'e' || event.sequence === 'e') && !logStore.logVisualModeActive()) {
    utilActions.openLogFileInEditor();
    return true;
  }

  // Shift+A — toggle AI overlay: re-show if state exists, else enter prompt mode directly
  if (
    (event.name === 'A' || (event.name === 'a' && event.shift)) &&
    !logStore.logSearchMode()
  ) {
    if (logStore.logAiSummary() !== null || logStore.logAiLoading() || logStore.logAiStreaming() || logStore.logAiError() !== null || logStore.logAiPromptMode()) {
      logStore.setLogAiVisible((v) => !v);
    } else {
      const visualActive = logStore.logVisualModeActive();
      if (visualActive) {
        const allLines = logStore.logs().split('\n');
        const start = Math.min(logStore.logVisualModeStart(), logStore.logSelectedLine());
        const end   = Math.max(logStore.logVisualModeStart(), logStore.logSelectedLine());
        const selectedLogs = allLines.slice(start, end + 1).join('\n');
        logStore.setLogVisualModeActive(false);
        logStore.pendingAiVisualLogs = selectedLogs;
        logStore.setLogAiPromptText('');
        logStore.setLogAiVisible(true);
        void logActions.runAiAnalysis(undefined, selectedLogs);
      } else {
        logStore.setLogAiPromptText('');
        logStore.setLogAiPromptMode(true);
        logStore.setLogAiVisible(true);
      }
    }
    return true;
  }

  // ESC — clear followup text → hide overlay (keep state) → exit visual mode → close modal
  if (
    event.name === 'escape' ||
    event.name === 'Escape' ||
    event.name === 'esc' ||
    event.sequence === '\x1b' ||
    event.raw === '\x1b'
  ) {
    if (logStore.logAiVisible() && logStore.logAiFollowupText()) {
      logStore.setLogAiFollowupText('');
    } else if (logStore.logSearchQuery()) {
      logStore.setLogSearchQuery('');
      logStore.setLogSearchMatchIndex(-1);
    } else if (logStore.logAiVisible() && (logStore.logAiSummary() !== null || logStore.logAiLoading() || logStore.logAiError() !== null || logStore.logAiPromptMode())) {
      logActions.dismissAiOverlay();
    } else if (logStore.logVisualModeActive()) {
      logStore.setLogVisualModeActive(false);
    } else {
      logActions.closeLogModal();
    }
    return true;
  }

  // AI overlay scroll keys (Ctrl+j/k/d/u/g/G)
  if (logStore.logAiVisible() && logStore.logAiSummary() !== null && logStore.logAiScrollBoxRef) {
    const aiSb = logStore.logAiScrollBoxRef;
    const name = event.name ?? '';
    if (handleHorizontalScrollKey(event, aiSb)) return true;
    if (event.ctrl && name === 'j') { logStore.logAiAtBottom = false; aiSb.scrollBy(1); logStore.logAiLastScrollTop = aiSb.scrollTop; return true; }
    if (event.ctrl && name === 'k') { logStore.logAiAtBottom = false; aiSb.scrollBy(-1); logStore.logAiLastScrollTop = aiSb.scrollTop; return true; }
    if (event.ctrl && name === 'd') { logStore.logAiAtBottom = false; aiSb.scrollBy(Math.floor((aiSb.viewport.height || 10) / 2)); logStore.logAiLastScrollTop = aiSb.scrollTop; return true; }
    if (event.ctrl && name === 'u') { logStore.logAiAtBottom = false; aiSb.scrollBy(-Math.floor((aiSb.viewport.height || 10) / 2)); logStore.logAiLastScrollTop = aiSb.scrollTop; return true; }
    if (event.ctrl && name === 'g') { logStore.logAiAtBottom = false; aiSb.scrollTo(0); logStore.logAiLastScrollTop = 0; return true; }
    if (event.ctrl && name === 'G') { logStore.logAiAtBottom = true; aiSb.scrollTo(aiSb.scrollHeight); logStore.logAiLastScrollTop = aiSb.scrollTop; return true; }
  }

  // Ctrl+O removed (was opencode session link)

  // ── Followup input: capture printable chars into the followup text field ──
  if (logStore.logAiVisible() && logStore.logAiSummary() !== null && !logStore.logAiLoading() && !logStore.logAiStreaming()) {
    if (event.name === 'return' || event.name === 'enter') {
      const q = logStore.logAiFollowupText().trim();
      if (q) {
        logStore.setLogAiFollowupText('');
        void logActions.runAiAnalysis(q);
      }
      return true;
    }
    if (event.name === 'backspace' || event.name === 'delete') {
      logStore.setLogAiFollowupText((t) => t.slice(0, -1));
      return true;
    }
    const ch = event.sequence ?? event.name ?? '';
    if (ch.length === 1 && ch >= ' ') {
      logStore.setLogAiFollowupText((t) => t + ch);
      return true;
    }
  }

  const sb = logStore.logScrollBoxRef;
  const lineCount = logStore.logs().split('\n').length;
  const maxLine = Math.max(0, lineCount - 1);

  const scrollToCenter = (line: number) => {
    if (!sb) return;
    const vpHeight = sb.viewport.height > 0 ? sb.viewport.height : renderer.height;
    const maxScrollTop = Math.max(0, lineCount - vpHeight);
    const half = Math.floor(vpHeight / 2);
    const target = Math.max(0, Math.min(line - half, maxScrollTop));
    sb.scrollTo(target);
    logActions.syncLogScroll();
  };

  // v — toggle visual mode
  if (event.name === 'v' || event.sequence === 'v') {
    if (logStore.logVisualModeActive()) {
      logStore.setLogVisualModeActive(false);
    } else {
      logStore.setLogVisualModeStart(logStore.logSelectedLine());
      logStore.setLogVisualModeActive(true);
    }
    return true;
  }

  // c — copy current line (normal mode) or selected range (visual mode)
  if (event.name === 'c' || event.sequence === 'c') {
    const logLines = logStore.logs().split('\n');
    let text: string;
    if (logStore.logVisualModeActive()) {
      const start = Math.min(logStore.logVisualModeStart(), logStore.logSelectedLine());
      const end   = Math.max(logStore.logVisualModeStart(), logStore.logSelectedLine());
      text = logLines.slice(start, end + 1).join('\n');
      logStore.setLogVisualModeActive(false);
    } else {
      text = logLines[logStore.logSelectedLine()] ?? '';
    }
    if (text) {
      try {
        const { copyToClipboard } = await import('@devenv/core');
        const base64 = Buffer.from(text).toString('base64');
        const osc52 = `\x1b]52;c;${base64}\x07`;
        const finalOsc52 = process.env.TMUX
          ? `\x1bPtmux;\x1b${osc52}\x1b\\`
          : osc52;
        process.stdout.write(finalOsc52);
        copyToClipboard(text);
        uiStore.setCopyStatus('✓ Copied');
        setTimeout(() => uiStore.setCopyStatus(null), 2000);
      } catch (error) {
        const { getLogger } = await import('@devenv/core');
        getLogger().write('ERROR', `Failed to copy log line: ${error}`);
      }
    }
    return true;
  }

  // j / Down — move cursor down, keep it centered
  if (isDownKey(event)) {
    const next = Math.min(logStore.logSelectedLine() + 1, maxLine);
    logStore.setLogSelectedLine(next);
    scrollToCenter(next);
    return true;
  }

  // k / Up — move cursor up, keep it centered
  if (isUpKey(event)) {
    const next = Math.max(logStore.logSelectedLine() - 1, 0);
    logStore.setLogSelectedLine(next);
    scrollToCenter(next);
    return true;
  }

  // d — move cursor + viewport down half page (10 lines)
  if (event.name === 'd') {
    const next = Math.min(logStore.logSelectedLine() + 10, maxLine);
    logStore.setLogSelectedLine(next);
    scrollToCenter(next);
    return true;
  }

  // u — move cursor + viewport up half page (10 lines)
  if (event.name === 'u') {
    const next = Math.max(logStore.logSelectedLine() - 10, 0);
    logStore.setLogSelectedLine(next);
    scrollToCenter(next);
    return true;
  }

  // g — go to top
  if (event.name === 'g' && !event.shift) {
    logStore.setLogSelectedLine(0);
    scrollToCenter(0);
    return true;
  }

  // G — go to bottom
  if (event.name === 'G' || (event.name === 'g' && event.shift)) {
    logStore.setLogSelectedLine(maxLine);
    scrollToCenter(maxLine);
    return true;
  }

  if (handleHorizontalScrollKey(event, sb)) return true;

  // / — enter search mode
  if (event.sequence === '/' || event.name === '/') {
    logStore.setLogSearchMode(true);
    logStore.setLogSearchQuery('');
    logStore.setLogSearchMatchIndex(-1);
    return true;
  }

  // n — jump to next search match
  if ((event.name === 'n' || event.sequence === 'n') && logStore.logSearchMatchLinesList().length > 0) {
    const matches = logStore.logSearchMatchLinesList();
    const next = (logStore.logSearchMatchIndex() + 1) % matches.length;
    logStore.setLogSearchMatchIndex(next);
    const line = matches[next];
    logStore.setLogSelectedLine(line);
    scrollToCenter(line);
    return true;
  }

  // p — jump to previous search match
  if ((event.name === 'p' || event.sequence === 'p') && logStore.logSearchMatchLinesList().length > 0) {
    const matches = logStore.logSearchMatchLinesList();
    const prev = (logStore.logSearchMatchIndex() - 1 + matches.length) % matches.length;
    logStore.setLogSearchMatchIndex(prev);
    const line = matches[prev];
    logStore.setLogSelectedLine(line);
    scrollToCenter(line);
    return true;
  }

  // Block all other keys while modal is open
  return true;
}
