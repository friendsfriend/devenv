import { createMemo, createSignal } from 'solid-js';
import { stripAnsi } from '@devenv/ui';

export function createLogStore() {
  const [logs, setLogs] = createSignal<string>('');
  const [logTitle, setLogTitle] = createSignal<string>('');
  const [showLogModal, setShowLogModal] = createSignal(false);
  const [logScrollTop, setLogScrollTop] = createSignal(0);
  const [logViewportHeight, setLogViewportHeight] = createSignal(40);
  const [logSearchMode, setLogSearchMode] = createSignal(false);
  const [logSearchQuery, setLogSearchQuery] = createSignal('');
  const [logSearchMatchIndex, setLogSearchMatchIndex] = createSignal(-1);
  const [logAiPromptMode, setLogAiPromptMode] = createSignal(false);
  const [logAiPromptText, setLogAiPromptText] = createSignal('');
  const [logAiLoading, setLogAiLoading] = createSignal(false);
  const [logAiStreaming, setLogAiStreaming] = createSignal(false);
  const [logAiSummary, setLogAiSummary] = createSignal<string | null>(null);
  const [logAiError, setLogAiError] = createSignal<string | null>(null);
  const [logAiFollowupText, setLogAiFollowupText] = createSignal('');
  const [logAiHistory, setLogAiHistory] = createSignal<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [logAiVisible, setLogAiVisible] = createSignal(false);
  const [logType, setLogType] = createSignal<'container' | 'operation' | 'action' | 'job' | null>(null);
  const [logRefreshParams, setLogRefreshParams] = createSignal<{
    type: 'container' | 'operation' | 'action' | 'job' | null;
    containerID?: string;
    appIdent?: string;
    jobId?: number;
    sourceType?: string;
  }>({ type: null });

  const logSearchMatchLinesList = createMemo<number[]>(() => {
    const q = logSearchQuery().toLowerCase();
    if (!q) return [];
    return logs().split('\n').reduce<number[]>((acc, line, i) => {
      if (stripAnsi(line).toLowerCase().includes(q)) acc.push(i);
      return acc;
    }, []);
  });

  const logSearchMatchLines = createMemo(() => new Set(logSearchMatchLinesList()));

  let logScrollBoxRef: import('@opentui/core').ScrollBoxRenderable | undefined;
  let logAiScrollBoxRef: import('@opentui/core').ScrollBoxRenderable | undefined;
  let logAiAtBottom = true;
  let logAiLastScrollTop = 0;

  return {
    logs,
    setLogs,
    logTitle,
    setLogTitle,
    showLogModal,
    setShowLogModal,
    logScrollTop,
    setLogScrollTop,
    logViewportHeight,
    setLogViewportHeight,
    // logSelectedLine, logVisualModeActive, logVisualModeStart removed —
    // no cursor line / visual mode; viewport scrolls directly.
    logSearchMode,
    setLogSearchMode,
    logSearchQuery,
    setLogSearchQuery,
    logSearchMatchIndex,
    setLogSearchMatchIndex,
    logAiPromptMode,
    setLogAiPromptMode,
    logAiPromptText,
    setLogAiPromptText,
    logAiLoading,
    setLogAiLoading,
    logAiStreaming,
    setLogAiStreaming,
    logAiSummary,
    setLogAiSummary,
    logAiError,
    setLogAiError,
    logAiFollowupText,
    setLogAiFollowupText,
    logAiHistory,
    setLogAiHistory,
    logAiVisible,
    setLogAiVisible,
    logType,
    setLogType,
    logRefreshParams,
    setLogRefreshParams,
    logSearchMatchLinesList,
    logSearchMatchLines,
    get logScrollBoxRef() {
      return logScrollBoxRef;
    },
    set logScrollBoxRef(value: import('@opentui/core').ScrollBoxRenderable | undefined) {
      logScrollBoxRef = value;
    },
    get logAiScrollBoxRef() {
      return logAiScrollBoxRef;
    },
    set logAiScrollBoxRef(value: import('@opentui/core').ScrollBoxRenderable | undefined) {
      logAiScrollBoxRef = value;
    },
    get logAiAtBottom() {
      return logAiAtBottom;
    },
    set logAiAtBottom(value: boolean) {
      logAiAtBottom = value;
    },
    get logAiLastScrollTop() {
      return logAiLastScrollTop;
    },
    set logAiLastScrollTop(value: number) {
      logAiLastScrollTop = value;
    },

  };
}

export type LogStore = ReturnType<typeof createLogStore>;
