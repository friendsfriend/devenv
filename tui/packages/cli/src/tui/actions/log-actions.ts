import type { DevEnvClient } from '@devenv/core';
import type { AppStore } from '../stores/app-store';
import type { LogStore } from '../stores/log-store';

let logStreamAbortController: AbortController | null = null;

export function createLogActions(
  logStore: LogStore,
  appStore: AppStore,
  client: DevEnvClient,
  showError: (title: string, message: string) => void,
) {
  const syncLogScroll = () => {
    if (!logStore.logScrollBoxRef) return;
    logStore.setLogScrollTop(logStore.logScrollBoxRef.scrollTop);
    const h = logStore.logScrollBoxRef.viewport.height;
    if (h > 0) logStore.setLogViewportHeight(h);
  };

  const resetLogHistory = () => {
    logStore.setLogHistoryCursor(null);
    logStore.setLogHistoryHasMore(false);
    logStore.setLogHistoryLoading(false);
    logStore.setLogHistoryError(null);
  };

  const initializeHistoricalLog = async (type: 'action' | 'operation', appIdent: string, fallback: () => Promise<string>) => {
    resetLogHistory();
    const page = await client.getLogHistory(type, appIdent, undefined, 1000);
    if (page.lines.length > 0) {
      logStore.setLogLines(page.lines);
      logStore.setLogHistoryCursor(page.nextBefore);
      logStore.setLogHistoryHasMore(page.hasMore);
      return;
    }
    logStore.setLogs(await fallback());
  };

  const loadOlderLogs = async () => {
    const params = logStore.logRefreshParams();
    if ((params.type !== 'action' && params.type !== 'operation') || !params.appIdent) return;
    if (!logStore.logHistoryHasMore() || logStore.logHistoryLoading()) return;
    const before = logStore.logHistoryCursor() ?? undefined;
    const oldScrollTop = logStore.logScrollBoxRef?.scrollTop ?? 0;
    const oldCount = logStore.logLines().length;
    logStore.setLogHistoryLoading(true);
    logStore.setLogHistoryError(null);
    try {
      const page = await client.getLogHistory(params.type, params.appIdent, before, 1000);
      logStore.prependLogLines(page.lines);
      logStore.setLogHistoryCursor(page.nextBefore);
      logStore.setLogHistoryHasMore(page.hasMore);
      const added = logStore.logLines().length - oldCount;
      if (added > 0) setTimeout(() => logStore.logScrollBoxRef?.scrollTo(oldScrollTop + added), 0);
    } catch (e) {
      logStore.setLogHistoryError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      logStore.setLogHistoryLoading(false);
    }
  };

  const maybeLoadOlderLogs = () => {
    const sb = logStore.logScrollBoxRef;
    if (!sb || sb.scrollTop > 5) return;
    void loadOlderLogs();
  };

  /**
   * Set logScrollTop to the bottom of the current log content so the viewport
   * starts at the last lines. No sb.scrollTo() here — stickyScroll handles the
   * initial viewport placement. syncLogScroll() (called from onScrollBoxReady)
   * reads the actual scrollTop after the scrollbox settles.
   */
  const scrollToLogBottom = () => {
    const lineCount = logStore.logs().split('\n').length;
    const sb = logStore.logScrollBoxRef;
    const vh = (sb && sb.viewport.height > 0) ? sb.viewport.height : logStore.logViewportHeight();
    if (vh > 0) logStore.setLogViewportHeight(vh);
    logStore.setLogScrollTop(Math.max(0, lineCount - vh));
  };

  const clearAiState = () => {
    logStore.setLogAiPromptMode(false);
    logStore.setLogAiPromptText('');
    logStore.setLogAiLoading(false);
    logStore.setLogAiStreaming(false);
    logStore.setLogAiSummary(null);
    logStore.setLogAiError(null);
    logStore.setLogAiFollowupText('');
    logStore.setLogAiHistory([]);
    logStore.setLogAiVisible(false);
    logStore.logAiScrollBoxRef = undefined;
    logStore.logAiAtBottom = true;
    logStore.logAiLastScrollTop = 0;
  };

  const dismissAiOverlay = () => {
    logStore.setLogAiVisible(false);
  };

  const closeLogModal = () => {
    if (logStreamAbortController) {
      logStreamAbortController.abort();
      logStreamAbortController = null;
    }
    logStore.setShowLogModal(false);
    logStore.setLogs('');
    logStore.setLogTitle('');
    logStore.setLogType(null);
    logStore.logScrollBoxRef = undefined;
    logStore.setLogScrollTop(0);
    logStore.setLogViewportHeight(40);
    logStore.setLogSearchMode(false);
    logStore.setLogSearchQuery('');
    logStore.setLogSearchMatchIndex(-1);
    resetLogHistory();
    clearAiState();
    logStore.setLogRefreshParams({ type: null });
  };

  const getSelectedApp = () => appStore.filteredApps()[appStore.selectedIndex()];

  const loadContainerLogs = async () => {
    if (appStore.operationInProgressForApp()) {
      showError('Operation In Progress', 'Another operation is already in progress. Please wait for it to complete.');
      return;
    }
    const app = getSelectedApp();
    if (!app) return;
    if ('type' in app && app.type === 'script') {
      if (!app.logPath) {
        showError('No Script Log', `${app.displayName} is running in tmux window mode. Open the tmux window to view logs.`);
        return;
      }
      logStore.setLogs('');
      logStore.setLogTitle(`Script Logs: ${app.displayName}`);
      logStore.setLogType('operation');
      logStore.setShowLogModal(true);
      logStore.setLogRefreshParams({ type: null });
      try {
        logStore.setLogs(await client.getInfraServiceLogs(app.ident));
        scrollToLogBottom();
      } catch (e) {
        logStore.setLogs(`Error fetching script logs: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
      return;
    }
    if (('type' in app && app.type === 'kubernetes') || (typeof app.status === 'string' && (app.status.includes('pods') || app.status.startsWith('running') && !app.dockerInfo?.ContainerID))) {
      logStore.setLogs('');
      logStore.setLogTitle(`Kubernetes Logs: ${app.displayName} (live)`);
      logStore.setLogType('operation');
      logStore.setShowLogModal(true);
      logStore.setLogRefreshParams({ type: null });
      try {
        logStore.setLogs(await client.getKubernetesLogs(app.ident));
        scrollToLogBottom();
        logStore.setLogRefreshParams({ type: 'kubernetes', appIdent: app.ident });
      } catch (e) {
        logStore.setLogs(`Error fetching Kubernetes logs: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
      return;
    }
    if (!app.dockerInfo?.ContainerID) {
      logStore.setLogs(`No running container found for ${app.displayName}`);
      logStore.setLogTitle(`Container Logs: ${app.displayName}`);
      logStore.setLogType('container');
      logStore.setShowLogModal(true);
      logStore.setLogRefreshParams({ type: null });
      return;
    }
    const containerID = app.dockerInfo.ContainerID;
    logStore.setLogs('');
    logStore.setLogTitle(`Container Logs: ${app.displayName} (live)`);
    logStore.setLogType('container');
    logStore.setShowLogModal(true);
    logStore.setLogRefreshParams({ type: null });
    try {
      logStore.setLogs(await client.getContainerLogs(containerID));
      scrollToLogBottom();
      logStore.setLogRefreshParams({ type: 'container', containerID });
    } catch (e) {
      logStore.setLogs(`Error fetching container logs: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const loadOperationLogs = async () => {
    const app = appStore.tableFilteredApps()[appStore.selectedIndex()];
    if (!app) return;
    logStore.setLogs('');
    logStore.setLogTitle(`Operation Logs: ${app.displayName}`);
    logStore.setLogType('operation');
    logStore.setShowLogModal(true);
    logStore.setLogRefreshParams({ type: null });
    try {
      await initializeHistoricalLog('operation', app.ident, () => client.getOperationLogs(app.ident, 100));
      scrollToLogBottom();
      logStore.setLogTitle(`Operation Logs: ${app.displayName} (auto-refresh: 10s)`);
      logStore.setLogRefreshParams({ type: 'operation', appIdent: app.ident });
    } catch (e) {
      logStore.setLogs(`Error fetching operation logs: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const openActionLogForApp = async (appIdent: string, appName: string, titlePrefix = 'Action Log') => {
    logStore.setLogs('');
    logStore.setLogTitle(`${titlePrefix}: ${appName} (live)`);
    logStore.setLogType('action');
    logStore.setShowLogModal(true);
    logStore.setLogRefreshParams({ type: null });
    try {
      await initializeHistoricalLog('action', appIdent, () => client.getActionLog(appIdent));
      scrollToLogBottom();
      logStore.setLogRefreshParams({ type: 'action', appIdent });
    } catch (e) {
      logStore.setLogs(`Error fetching action log: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const toggleActionLogForApp = async (appIdent: string, appName: string, titlePrefix = 'Action Log') => {
    const params = logStore.logRefreshParams();
    if (logStore.showLogModal() && params.type === 'action' && params.appIdent === appIdent) {
      closeLogModal();
      return;
    }
    await openActionLogForApp(appIdent, appName, titlePrefix);
  };

  const openOperationLogsForApp = async (appIdent: string, appName: string, titlePrefix = 'Operation Logs') => {
    logStore.setLogs('');
    logStore.setLogTitle(`${titlePrefix}: ${appName} (live)`);
    logStore.setLogType('operation');
    logStore.setShowLogModal(true);
    logStore.setLogRefreshParams({ type: null });
    try {
      await initializeHistoricalLog('operation', appIdent, () => client.getOperationLogs(appIdent, 500));
      scrollToLogBottom();
      logStore.setLogRefreshParams({ type: 'operation', appIdent });
    } catch (e) {
      logStore.setLogs(`Error fetching operation logs: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const toggleOperationLogsForApp = async (appIdent: string, appName: string, titlePrefix = 'Operation Logs') => {
    const params = logStore.logRefreshParams();
    if (logStore.showLogModal() && params.type === 'operation' && params.appIdent === appIdent) {
      closeLogModal();
      return;
    }
    await openOperationLogsForApp(appIdent, appName, titlePrefix);
  };

  const loadJobLogs = async (jobId: number, jobName: string) => {
    const app = appStore.tableFilteredApps()[appStore.selectedIndex()];
    if (!app) return;
    const isGitLab = app.sourceType !== 'github';
    const refreshLabel = isGitLab ? 'live' : 'auto-refresh: 10s';
    logStore.setLogs('');
    logStore.setLogTitle(`Job Logs: ${jobName} (#${jobId})`);
    logStore.setLogType('job');
    logStore.setShowLogModal(true);
    logStore.setLogRefreshParams({ type: null });
    try {
      logStore.setLogs(await client.getJobLogs(app.ident, jobId, app.sourceType));
      scrollToLogBottom();
      logStore.setLogTitle(`Job Logs: ${jobName} (#${jobId}) (${refreshLabel})`);
      logStore.setLogRefreshParams({ type: 'job', appIdent: app.ident, jobId, sourceType: app.sourceType });
    } catch (e) {
      logStore.setLogs(`Error fetching job logs: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const runAiAnalysis = async (followupQuestion?: string, logsOverride?: string) => {
    logStore.setLogAiLoading(true);
    logStore.setLogAiStreaming(false);
    logStore.setLogAiError(null);
    logStore.setLogAiVisible(true);
    logStore.logAiAtBottom = true;
    logStore.logAiLastScrollTop = 0;
    const isFollowup = !!followupQuestion;
    if (!isFollowup) {
      logStore.setLogAiSummary(null);
    }
    const buildPrompt = (): string | undefined => {
      if (!isFollowup) return logStore.logAiPromptText() || undefined;
      const history = logStore.logAiHistory();
      const parts: string[] = [];
      for (const entry of history) parts.push(entry.role === 'user' ? `User: ${entry.content}` : `Assistant: ${entry.content}`);
      parts.push(`User: ${followupQuestion}`);
      return parts.join('\n\n');
    };
    const prompt = buildPrompt();
    let fullResponse = '';
    try {
      let firstDelta = true;
      for await (const delta of client.analyzeLogsWithAIStream(logsOverride ?? logStore.logs(), prompt)) {
        if (firstDelta) {
          logStore.setLogAiLoading(false);
          logStore.setLogAiStreaming(true);
          if (isFollowup) logStore.setLogAiSummary((prev) => (prev ?? '') + `\n\n---\n\n**${followupQuestion}**\n\n`);
          else logStore.setLogAiSummary('');
          firstDelta = false;
        }
        fullResponse += delta;
        logStore.setLogAiSummary((prev) => (prev ?? '') + delta);
        if (logStore.logAiAtBottom && logStore.logAiScrollBoxRef) {
          if (logStore.logAiScrollBoxRef.scrollTop !== logStore.logAiLastScrollTop) {
            logStore.logAiAtBottom = false;
          } else {
            logStore.logAiScrollBoxRef.scrollTo(logStore.logAiScrollBoxRef.scrollHeight);
            logStore.logAiLastScrollTop = logStore.logAiScrollBoxRef.scrollTop;
          }
        }
      }
      if (firstDelta) {
        logStore.setLogAiLoading(false);
        if (!isFollowup) logStore.setLogAiSummary('');
      }
      if (isFollowup && followupQuestion && fullResponse) {
        logStore.setLogAiHistory((h) => [...h, { role: 'user', content: followupQuestion }, { role: 'assistant', content: fullResponse }]);
      } else if (!isFollowup && fullResponse) {
        const userPrompt = logStore.logAiPromptText() || 'summarize errors and warnings';
        logStore.setLogAiHistory([{ role: 'user', content: userPrompt }, { role: 'assistant', content: fullResponse }]);
      }
    } catch (e) {
      logStore.setLogAiError(e instanceof Error ? e.message : 'AI analysis failed');
    } finally {
      logStore.setLogAiLoading(false);
      logStore.setLogAiStreaming(false);
    }
  };

  const setLogStreamAbortController = (controller: AbortController | null) => {
    logStreamAbortController = controller;
  };

  return {
    loadContainerLogs,
    loadOperationLogs,
    loadJobLogs,
    openActionLogForApp,
    toggleActionLogForApp,
    openOperationLogsForApp,
    toggleOperationLogsForApp,
    runAiAnalysis,
    dismissAiOverlay,
    clearAiState,
    closeLogModal,
    loadOlderLogs,
    maybeLoadOlderLogs,
    syncLogScroll,
    scrollToLogBottom,
    setLogStreamAbortController,
    getLogStreamAbortController: () => logStreamAbortController,
  };
}

export type LogActions = ReturnType<typeof createLogActions>;
