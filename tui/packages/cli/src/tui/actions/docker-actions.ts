import type { DevEnvClient } from '@devenv/core';
import type { ActionTarget, App, AppAction, InfraService } from '@devenv/types';
import type { AppStore } from '../stores/app-store';
import type { UiStore } from '../stores/ui-store';

export function createDockerActions(
  appStore: AppStore,
  uiStore: UiStore,
  client: DevEnvClient,
  showError: (title: string, message: string) => void,
) {
  const getSelectedApp = () => appStore.filteredApps()[appStore.selectedIndex()];

  const performDockerOperation = async (action: 'start' | 'stop' | 'restart', app: App | InfraService, profile?: string, targetId?: string, runner?: 'shell' | 'powershell') => {
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
      const isScriptInfra = 'type' in app && app.type === 'script';
      if (isScriptInfra && action === 'start') {
        if (app.shellPath && app.powerShellPath && !app.defaultRunner && !runner) {
          uiStore.setActionTargetPickerTargets([
            { id: 'infra:runner:shell', action: 'run', runtime: 'shell', label: 'Shell', sourcePath: app.shellPath },
            { id: 'infra:runner:powershell', action: 'run', runtime: 'powershell', label: 'PowerShell', sourcePath: app.powerShellPath },
          ]);
          uiStore.setActionTargetPickerSelectedIndex(0);
          uiStore.setActionTargetPickerAppIdent(app.ident);
          uiStore.setActionTargetPickerAction('run');
          uiStore.setShowActionTargetPicker(true);
          return;
        }
        await client.startInfraService(appIdent, runner);
      } else if (isScriptInfra && action === 'stop') {
        await client.stopInfraService(appIdent);
      } else if (action === 'start') {
        if ('type' in app) await client.startInfraService(appIdent);
        else await client.startApp(appIdent, profile || '', targetId);
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

  const setActionStatus = (appIdent: string, action: AppAction, message: string) => {
    appStore.setApps(appStore.apps().map((a) =>
      a.ident === appIdent ? { ...a, operationStatus: { operation: action, status: 'active', message } } : a,
    ));
  };

  const createShellTarget = async (app: App, action: AppAction) => {
    const profile = action === 'run' ? 'dev' : undefined;
    const runtime = process.platform === 'win32' ? 'powershell' : 'shell';
    try {
      const result = await client.createShellActionScript({ ident: app.ident, action, profile, runtime });
      showError('Shell Target Created', `Created ${action} ${runtime} target for ${app.displayName}:\n${result.path}\n\nEdit this file in your config repository, then run the action again.`);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      showError('Create Shell Target Failed', `Failed to create shell ${action} target for ${app.displayName}.\n\nError: ${errorMsg}`);
    }
  };

  const showNoTargets = (action: AppAction, app: App) => {
    const ext = process.platform === 'win32' ? '.ps1' : '.sh';
    const path = action === 'run'
      ? `apps/run/${app.ident}-dev${ext}`
      : `apps/build/${app.ident}-${action}${ext}`;
    uiStore.setConfirmDialogTitle('No Target Configured');
    uiStore.setConfirmDialogMessage(`No ${action} target is configured for ${app.displayName}.\n\nCreate script ${path}?`);
    uiStore.setConfirmDialogAction(() => () => { void createShellTarget(app, action); });
    uiStore.setShowConfirmDialog(true);
  };

  const runSelectedTarget = async (app: App, action: AppAction, target: ActionTarget) => {
    const appIdent = app.ident;
    appStore.setOperationInProgressForApp(appIdent);
    appStore.setError(null);
    setActionStatus(appIdent, action, `${action.charAt(0).toUpperCase() + action.slice(1)}ing ${target.label}...`);
    try {
      if (action === 'build') await client.buildApp(appIdent, target.id);
      else if (action === 'test') await client.testApp(appIdent, target.id);
      else await client.runApp(appIdent, target.profile || '', target.id);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      showError(`${action.charAt(0).toUpperCase() + action.slice(1)} Failed`, `Failed to ${action} ${app.displayName}.\n\nError: ${errorMsg}`);
      appStore.setApps(appStore.apps().map((a) =>
        a.ident === appIdent ? { ...a, operationStatus: { operation: action, status: 'failed', message: `${action} failed` } } : a,
      ));
      setTimeout(() => {
        appStore.setApps(appStore.apps().map((a) => (a.ident === appIdent ? { ...a, operationStatus: undefined } : a)));
      }, 3000);
    } finally {
      appStore.setOperationInProgressForApp(null);
    }
  };

  const openActionTargetPicker = (app: App, action: AppAction, targets: ActionTarget[]) => {
    uiStore.setActionTargetPickerTargets(targets);
    uiStore.setActionTargetPickerSelectedIndex(0);
    uiStore.setActionTargetPickerAppIdent(app.ident);
    uiStore.setActionTargetPickerAction(action);
    uiStore.setShowActionTargetPicker(true);
  };

  const performAppAction = async (action: AppAction) => {
    const app = appStore.tableFilteredApps()[appStore.selectedIndex()];
    if (!app) return;

    const currentApp = appStore.apps().find((a) => a.ident === app.ident) ?? app;
    if (currentApp.operationStatus?.status === 'active') {
      showError('Operation In Progress', 'Another operation is already in progress. Please wait for it to complete.');
      return;
    }
    if (appStore.operationInProgressForApp()) {
      showError('Operation In Progress', 'Another operation is already in progress. Please wait for it to complete.');
      return;
    }

    uiStore.setActionTargetPickerLoading(true);
    try {
      const targets = await client.getActionTargets(app.ident, action);
      if (targets.length === 0) {
        showNoTargets(action, app);
        return;
      }
      if (targets.length === 1) {
        await runSelectedTarget(app, action, targets[0]);
        return;
      }
      openActionTargetPicker(app, action, targets);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      showError('Target Discovery Failed', `Failed to load ${action} targets for ${app.displayName}.\n\nError: ${errorMsg}`);
    } finally {
      uiStore.setActionTargetPickerLoading(false);
    }
  };

  const performBuild = async () => {
    await performAppAction('build');
  };

  const performTest = async () => {
    await performAppAction('test');
  };

  return { requestDockerOperation, performDockerOperation, performBuild, performTest, performAppAction, runSelectedTarget };
}

export type DockerActions = ReturnType<typeof createDockerActions>;
