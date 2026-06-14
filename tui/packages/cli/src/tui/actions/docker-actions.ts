import type { DevEnvClient } from '@devenv/core';
import type { App, InfraService } from '@devenv/types';
import type { AppStore } from '../stores/app-store';

export function createDockerActions(
  appStore: AppStore,
  client: DevEnvClient,
  showError: (title: string, message: string) => void,
) {
  const getSelectedApp = () => appStore.filteredApps()[appStore.selectedIndex()];

  const performDockerOperation = async (action: 'start' | 'stop' | 'restart', app: App | InfraService, profile?: string) => {
    const appIdent = app.ident;
    appStore.setOperationInProgressForApp(appIdent);
    appStore.setError(null);
    appStore.setApps(appStore.apps().map((a) =>
      a.ident === appIdent
        ? { ...a, operationStatus: { operation: action as 'start' | 'stop', status: 'active', message: `${action.charAt(0).toUpperCase() + action.slice(1)}ing...` } }
        : a,
    ));
    appStore.setInfraServices((prev) => prev.map((svc) =>
      svc.ident === appIdent
        ? { ...svc, operationStatus: { operation: action as 'start' | 'stop', status: 'active', message: `${action.charAt(0).toUpperCase() + action.slice(1)}ing...` } }
        : svc,
    ));

    try {
      if (action === 'start') {
        await client.startApp(appIdent, profile || '');
      } else if (action === 'stop') {
        const containerID = app.dockerInfo?.ContainerID || app.containerBaseName;
        if (!containerID) throw new Error('No container identifier available for stop operation');
        await client.stopContainer(containerID, appIdent);
      } else {
        const containerID = app.dockerInfo?.ContainerID || app.containerBaseName;
        if (!containerID) throw new Error('No container identifier available for restart operation');
        await client.restartContainer(containerID, appIdent);
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      const appName = appStore.apps().find((a) => a.ident === appIdent)?.displayName || 'Unknown App';
      showError(`Docker ${action.charAt(0).toUpperCase() + action.slice(1)} Failed`, `Failed to ${action} ${appName}.\n\nError: ${errorMsg}`);
      appStore.setApps(appStore.apps().map((a) =>
        a.ident === appIdent
          ? { ...a, operationStatus: { operation: action as 'start' | 'stop', status: 'failed', message: `${action.charAt(0).toUpperCase() + action.slice(1)} failed` } }
          : a,
      ));
      appStore.setInfraServices((prev) => prev.map((svc) =>
        svc.ident === appIdent
          ? { ...svc, operationStatus: { operation: action as 'start' | 'stop', status: 'failed', message: `${action.charAt(0).toUpperCase() + action.slice(1)} failed` } }
          : svc,
      ));
      setTimeout(() => {
        appStore.setApps(appStore.apps().map((a) => (a.ident === appIdent ? { ...a, operationStatus: undefined } : a)));
        appStore.setInfraServices((prev) => prev.map((svc) => (svc.ident === appIdent ? { ...svc, operationStatus: undefined } : svc)));
      }, 3000);
    } finally {
      appStore.setOperationInProgressForApp(null);
    }
  };

  const requestDockerOperation = (action: 'start' | 'stop' | 'restart') => {
    const app = getSelectedApp();
    if (!app) {
      showError('No Application Selected', 'Please select an application before performing this operation.');
      return;
    }
    if (appStore.operationInProgressForApp()) {
      showError('Operation In Progress', 'Another operation is already in progress. Please wait for it to complete.');
      return;
    }
    void performDockerOperation(action, app);
  };

  const performBuild = async () => {
    if (appStore.operationInProgressForApp()) {
      showError('Operation In Progress', 'Another operation is already in progress. Please wait for it to complete.');
      return;
    }
    const app = appStore.tableFilteredApps()[appStore.selectedIndex()];
    if (!app) return;
    const appIdent = app.ident;
    appStore.setOperationInProgressForApp(appIdent);
    appStore.setError(null);
    appStore.setApps(appStore.apps().map((a) =>
      a.ident === appIdent ? { ...a, operationStatus: { operation: 'build', status: 'active', message: 'Building...' } } : a,
    ));
    try {
      await client.buildApp(appIdent);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      const appName = appStore.apps().find((a) => a.ident === appIdent)?.displayName || 'Unknown App';
      showError('Build Failed', `Failed to build ${appName}.\n\nError: ${errorMsg}`);
      appStore.setApps(appStore.apps().map((a) =>
        a.ident === appIdent ? { ...a, operationStatus: { operation: 'build', status: 'failed', message: 'Build failed' } } : a,
      ));
      setTimeout(() => {
        appStore.setApps(appStore.apps().map((a) => (a.ident === appIdent ? { ...a, operationStatus: undefined } : a)));
      }, 3000);
    } finally {
      appStore.setOperationInProgressForApp(null);
    }
  };

  return { requestDockerOperation, performDockerOperation, performBuild };
}

export type DockerActions = ReturnType<typeof createDockerActions>;
