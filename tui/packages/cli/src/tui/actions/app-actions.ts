import { getLogger } from '@devenv/core';
import type { DevEnvClient } from '@devenv/core';
import type { StatusLogEntry } from '@devenv/types';
import type { AppStore } from '../stores/app-store';
import type { AppDetailStore } from '../stores/app-detail-store';
import type { UiStore } from '../stores/ui-store';
import { exitApp } from '../exit';

let appDetailAbortController: AbortController | null = null;

export function createAppActions(
  appStore: AppStore,
  appDetailStore: AppDetailStore,
  uiStore: UiStore,
  client: DevEnvClient,
  showError: (title: string, message: string) => void,
) {
  const getSelectedApp = () => appStore.filteredApps()[appStore.selectedIndex()];

  const fetchStatus = async () => {
    try {
      const statuses = await client.getStatus();
      appStore.setApps((prevApps) =>
        prevApps.map((app) => {
          const status = statuses.find((s) => s.ident === app.ident);
          if (!status) return app;
          const updated: typeof app = {
            ...app,
            dockerInfo: status.dockerInfo,
            branch: status.branch || app.branch,
            gitStatus: status.gitStatus,
            operationStatus: status.operationStatus,
          };
          if (status.activeWorktree) updated.activeWorktree = status.activeWorktree;
          else delete updated.activeWorktree;
          if ('runTargetInfo' in status) {
            if (status.runTargetInfo == null) delete updated.runTargetInfo;
            else updated.runTargetInfo = status.runTargetInfo;
          }
          return updated;
        }),
      );
    } catch (e) {
      console.error('Failed to fetch status:', e);
    }
  };

  const subscribeToUpdates = async (signal?: AbortSignal) => {
    try {
      appStore.setLiveUpdatesActive(true);
      getLogger().write('INFO', 'Starting SSE subscription...');
      for await (const event of client.subscribeToEvents(signal)) {
        if (event.type === 'connection.established') {
          appStore.setLiveUpdatesActive(true);
          continue;
        }

        if (event.type === 'status.updated') {
          const { ident, dockerInfo, branch, gitStatus, operationStatus, activeWorktree, status, logPath, runTargetInfo } = event.properties;
          appStore.setLastUpdateTime(new Date());
          appStore.setApps((prevApps) =>
            prevApps.map((app) => {
              if (app.ident !== ident) return app;
              const updated: typeof app = { ...app, dockerInfo: dockerInfo ?? app.dockerInfo, branch: branch || app.branch };
              if ('status' in event.properties) updated.status = status;
              if ('gitStatus' in event.properties) updated.gitStatus = gitStatus;
              if ('activeWorktree' in event.properties) {
                if (activeWorktree == null) delete updated.activeWorktree;
                else updated.activeWorktree = activeWorktree;
              }
              if ('operationStatus' in event.properties) {
                if (operationStatus == null) delete updated.operationStatus;
                else updated.operationStatus = operationStatus;
              }
              if ('runTargetInfo' in event.properties) {
                if (runTargetInfo == null) delete updated.runTargetInfo;
                else updated.runTargetInfo = runTargetInfo;
              }
              return updated;
            }),
          );
          appStore.setInfraServices((prev) =>
            prev.map((svc) => {
              if (svc.ident !== ident) return svc;
              const { executionHandle } = event.properties;
              const updated: typeof svc = { ...svc, dockerInfo: dockerInfo ?? svc.dockerInfo };
              if ('status' in event.properties) updated.status = status;
              if ('logPath' in event.properties) updated.logPath = logPath;
              if ('executionHandle' in event.properties) {
                if (executionHandle == null) delete updated.executionHandle;
                else updated.executionHandle = executionHandle;
              }
              if ('operationStatus' in event.properties) {
                if (operationStatus == null) delete updated.operationStatus;
                else updated.operationStatus = operationStatus;
              }
              return updated;
            }),
          );
        }

        if (event.type === 'operation.status.changed') {
          const { appIdent, operation, status, message } = event.properties;
          appStore.setApps((prevApps) =>
            prevApps.map((app) => (app.ident === appIdent ? { ...app, operationStatus: { operation, status, message } } : app)),
          );
        }

        if (event.type === 'operation.status.cleared') {
          const { appIdent } = event.properties;
          appStore.setApps((prevApps) =>
            prevApps.map((app) => {
              if (app.ident !== appIdent) return app;
              const { operationStatus: _op, ...rest } = app;
              return rest;
            }),
          );
          appStore.setInfraServices((prev) =>
            prev.map((svc) => {
              if (svc.ident !== appIdent) return svc;
              const { operationStatus: _op, ...rest } = svc;
              return rest;
            }),
          );
        }

        if (event.type === 'kubernetes.cluster.refreshed') {
          const cStatus = event.properties as unknown as import('@devenv/types').KubernetesClusterStatus;
          if (cStatus && cStatus.clusterName) {
            appStore.setKubernetesClusterStatus(cStatus);
            appStore.setKubernetesClusterError(null);
            if (cStatus.stats) {
              appStore.setKubernetesCPUHistory((h) => [...h.slice(-29), cStatus.stats!.cpuPercent]);
              appStore.setKubernetesMemoryHistory((h) => [...h.slice(-29), cStatus.stats!.memoryPercent]);
            }

          }
          continue;
        }

        if (event.type === 'kubernetes.cluster.deleted') {
          appStore.setKubernetesCPUHistory([]);
          appStore.setKubernetesMemoryHistory([]);
          continue;
        }

        if (event.type === 'statuslog.entry') {
          const { timestamp, appIdent, appName, operation, status, message } = event.properties;
          const entry: StatusLogEntry = {
            Timestamp: timestamp,
            AppIdent: appIdent,
            AppName: appName,
            Operation: operation,
            Status: status,
            Message: message,
          };
          appStore.setStatusLogEntries((prev) => [...prev, entry].slice(-50));
        }
      }
    } catch (e) {
      appStore.setLiveUpdatesActive(false);
      getLogger().write('ERROR', `SSE error: ${e instanceof Error ? e.message : String(e)}`);
      console.error('SSE error:', e);
    }
  };

  const fetchStatusLog = async () => {
    try {
      appStore.setStatusLogEntries(await client.getStatusLog(50));
    } catch (e) {
      console.error('Failed to fetch status log:', e);
    }
  };

  const normalizeScriptRelativePath = (value: string) => value.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/g, '');

  const parentScriptPath = (value: string) => {
    const normalized = normalizeScriptRelativePath(value);
    if (!normalized) return '';
    const parts = normalized.split('/');
    if (parts.length <= 1) return '';
    parts.pop();
    return parts.join('/');
  };

  const loadScripts = async (focusRelativePath?: string) => {
    try {
      const data = await client.getScripts();
      appStore.setScriptsTree(data.scripts || []);
      appStore.setAllScriptFoldersExpanded();

      if (!focusRelativePath) return;
      const normalizedFocus = normalizeScriptRelativePath(focusRelativePath);
      const rows = appStore.tableFilteredApps();
      let targetPath = normalizedFocus;
      let idx = rows.findIndex((row) => row.scriptRelativePath === targetPath);
      while (idx < 0 && targetPath.includes('/')) {
        targetPath = parentScriptPath(targetPath);
        idx = rows.findIndex((row) => row.scriptRelativePath === targetPath);
      }
      if (idx >= 0) appStore.setSelectedIndex(idx);
    } catch (e) {
      showError('Failed to Load Tasks', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const openAddTaskModal = () => {
    if (appStore.activeTab() !== 'scripts') return;

    const selected = appStore.tableFilteredApps()[appStore.selectedIndex()];
    let prefill = '';
    if (selected?.resourceType === 'script-folder') {
      prefill = normalizeScriptRelativePath(selected.scriptRelativePath || '');
    } else if (selected?.resourceType === 'script-file') {
      prefill = parentScriptPath(selected.scriptRelativePath || '');
    }

    uiStore.setTaskAddMode('create');
    uiStore.setTaskAddTargetPath(prefill);
    uiStore.setTaskAddSourcePath('');
    uiStore.setTaskAddSelectedField(1);
    uiStore.setTaskAddError(null);
    uiStore.setShowTaskAddModal(true);
  };

  const closeAddTaskModal = () => {
    uiStore.setShowTaskAddModal(false);
    uiStore.setTaskAddError(null);
    uiStore.setTaskAddSelectedField(0);
  };

  const submitAddTask = async () => {
    const targetPath = uiStore.taskAddTargetPath().trim();
    const mode = uiStore.taskAddMode();

    if (!targetPath) {
      uiStore.setTaskAddError('Target name/path is required.');
      return;
    }

    if (mode === 'link' && !uiStore.taskAddSourcePath().trim()) {
      uiStore.setTaskAddError('Source task file path is required for "Use existing task file".');
      return;
    }

    try {
      const result = mode === 'create'
        ? await client.createScript(targetPath)
        : await client.linkScript(targetPath, uiStore.taskAddSourcePath().trim());

      closeAddTaskModal();
      await loadScripts(result.relativePath);
      getLogger().write('INFO', `Task ${result.operation} succeeded: ${result.relativePath}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      uiStore.setTaskAddError(message);
      getLogger().write('WARN', `Task add failed: ${message}`);
    }
  };

  const toggleScriptFolder = () => {
    const row = appStore.tableFilteredApps()[appStore.selectedIndex()];
    if (!row || row.resourceType !== 'script-folder' || !row.scriptRelativePath) return;

    appStore.setExpandedScriptFolders((prev) => {
      const next = new Set(prev);
      if (next.has(row.scriptRelativePath!)) next.delete(row.scriptRelativePath!);
      else next.add(row.scriptRelativePath!);
      return next;
    });
  };

  // executeSelectedScript was removed — the foreground path (runSelectedScriptInForeground)
  // is the canonical interactive path. Use utilActions.runSelectedScriptInForeground() instead.

  const openAppDetail = async () => {
    const app = getSelectedApp();
    if (!app) return;
    const kind = appStore.activeTab() === 'infrastructure' ? 'infra' : app.appType === 'LIB' ? 'library' : 'app';
    appDetailStore.setAppDetailKind(kind);
    appDetailStore.setAppDetailApp(app as any);
    appDetailStore.setAppDetailLoading(true);
    appDetailStore.setAppDetailGitInfo(undefined);
    appDetailStore.setAppDetailCRs([]);
    appDetailStore.setAppDetailCRsLoading(kind !== 'infra');
    appDetailStore.setAppDetailLogs('');
    appDetailStore.setAppDetailStatsHistory([]);
    appDetailStore.setAppDetailMemHistory([]);
    appDetailStore.setAppDetailLatestStats(undefined);
    appStore.setViewMode('appDetail');

    if (kind !== 'infra') {
      try {
        appDetailStore.setAppDetailGitInfo(await client.getGitInfo(app.ident));
      } catch {
        appDetailStore.setAppDetailGitInfo({ branch: app.branch || '?', status: 'unknown' });
      }

      try {
        const result = await client.getChangeRequests(app.ident, 'opened', 'current', app.sourceType);
        if (result.items.length > 0) appDetailStore.setAppDetailCRs(result.items.slice(0, 5));
        else appDetailStore.setAppDetailCRs((await client.getChangeRequests(app.ident, 'opened', 'all', app.sourceType)).items.slice(0, 5));
      } catch {
        try {
          appDetailStore.setAppDetailCRs((await client.getChangeRequests(app.ident, 'opened', 'all', app.sourceType)).items.slice(0, 5));
        } catch {
          appDetailStore.setAppDetailCRs([]);
        }
      }
      appDetailStore.setAppDetailCRsLoading(false);
    }

    appDetailStore.setAppDetailLoading(false);
    const containerID = app.dockerInfo?.ContainerID;
    if (!containerID) return;

    appDetailAbortController = new AbortController();
    const signal = appDetailAbortController.signal;
    void client.streamContainerLogs(containerID, signal, (line) => {
      appDetailStore.setAppDetailLogs((prev) => {
        const updated = prev ? `${prev}\n${line}` : line;
        const lines = updated.split('\n');
        return lines.length > 500 ? lines.slice(-500).join('\n') : updated;
      });
    });
    void client.streamContainerStats(containerID, signal, (stats) => {
      appDetailStore.setAppDetailLatestStats(stats);
      appDetailStore.setAppDetailStatsHistory((prev) => {
        const next = [...prev, stats.cpuPercent];
        return next.length > 200 ? next.slice(-200) : next;
      });
      appDetailStore.setAppDetailMemHistory((prev) => {
        const next = [...prev, stats.memoryPercent];
        return next.length > 200 ? next.slice(-200) : next;
      });
    });
  };

  const closeAppDetail = () => {
    if (appDetailAbortController) {
      appDetailAbortController.abort();
      appDetailAbortController = null;
    }
    appStore.setViewMode('table');
  };



  const performRemoveTaskTarget = async (relativePath: string) => {
    try {
      const result = await client.deleteScript(relativePath);
      await loadScripts(parentScriptPath(result.relativePath));
      getLogger().write('INFO', `Task target deleted: ${result.relativePath}`);
    } catch (e) {
      showError('Delete Task Failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const requestRemoveTask = () => {
    if (appStore.activeTab() !== 'scripts') return;
    const selected = appStore.tableFilteredApps()[appStore.selectedIndex()];
    if (!selected || !selected.scriptRelativePath) return;

    if (selected.resourceType === 'script-file') {
      uiStore.setConfirmDialogTitle('Delete Task');
      uiStore.setConfirmDialogMessage(
        `Delete task "${selected.displayName}" (${selected.scriptRelativePath})? This cannot be undone.`,
      );
    } else if (selected.resourceType === 'script-folder') {
      uiStore.setConfirmDialogTitle('Delete Task Folder');
      uiStore.setConfirmDialogMessage(
        `Delete folder "${selected.displayName}" (${selected.scriptRelativePath}) and all nested task files? This cannot be undone.`,
      );
    } else {
      return;
    }

    uiStore.setConfirmDialogAction(() => () => void performRemoveTaskTarget(selected.scriptRelativePath!));
    uiStore.setShowConfirmDialog(true);
  };

  const performRemoveApp = async (ident: string) => {
    try {
      await client.deleteApp(ident);
      appStore.setApps(await client.getApps());
    } catch (e) {
      showError('Remove Repository Failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const requestRemoveApp = () => {
    const app = getSelectedApp();
    if (!app || appStore.activeTab() === 'scripts') return;
    uiStore.setConfirmDialogTitle('Remove Selected Item');
    uiStore.setConfirmDialogMessage(
      `Remove "${app.displayName}" (${app.ident})? This will delete the local directory and remove it from the configuration.`,
    );
    uiStore.setConfirmDialogAction(() => () => void performRemoveApp(app.ident));
    uiStore.setShowConfirmDialog(true);
  };

  const createExampleConfig = async () => {
    appStore.setExampleConfigLoading(true);
    appStore.setExampleConfigMessage('Creating example config...');
    try {
      await client.createExampleConfig();
      appStore.setApps(await client.getApps());
      appStore.setInfraServices(await client.getInfraServices());
      await loadScripts();
      appStore.setExampleConfigMessage('Example config created.');
    } catch (e) {
      appStore.setExampleConfigMessage(e instanceof Error ? e.message : 'Failed to create example config');
    } finally {
      appStore.setExampleConfigLoading(false);
    }
  };

  return {
    fetchStatus,
    subscribeToUpdates,
    fetchStatusLog,
    loadScripts,
    openAddTaskModal,
    closeAddTaskModal,
    submitAddTask,
    toggleScriptFolder,
    openAppDetail,
    closeAppDetail,
    exitApp,
    requestRemoveTask,
    performRemoveTaskTarget,
    requestRemoveApp,
    performRemoveApp,
    createExampleConfig,
  };
}

export type AppActions = ReturnType<typeof createAppActions>;
