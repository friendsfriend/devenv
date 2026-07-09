import { describe, expect, test } from 'bun:test';
import { createDockerActions } from './docker-actions';

function createStores(app: any) {
  let apps = [app];
  let operationInProgressForApp: string | null = null;
  const appStore = {
    filteredApps: () => apps,
    selectedIndex: () => 0,
    operationInProgressForApp: () => operationInProgressForApp,
    setOperationInProgressForApp: (ident: string | null) => { operationInProgressForApp = ident; },
    setError: () => {},
    apps: () => apps,
    setApps: (next: any[] | ((prev: any[]) => any[])) => { apps = typeof next === 'function' ? next(apps) : next; },
    infraServices: () => [],
    setInfraServices: () => {},
  };
  const uiStore = {
    setNotification: () => {},
    setActionTargetPickerTargets: () => {},
    setActionTargetPickerSelectedIndex: () => {},
    setActionTargetPickerAppIdent: () => {},
    setActionTargetPickerAction: () => {},
    setShowActionTargetPicker: () => {},
  };
  return { appStore, uiStore };
}

describe('docker actions', () => {
  test('app stop passes active run target id', async () => {
    const app = {
      ident: 'web',
      displayName: 'Web',
      runTargetInfo: { targetId: 'app/web/run/docker/redis' },
    };
    const { appStore, uiStore } = createStores(app);
    const calls: Array<[string, string | undefined]> = [];
    const client = {
      stopApp: async (appIdent: string, targetId?: string) => { calls.push([appIdent, targetId]); },
    };
    const actions = createDockerActions(appStore as any, uiStore as any, client as any, () => {});

    await actions.performDockerOperation('stop', app as any);

    expect(calls).toEqual([['web', 'app/web/run/docker/redis']]);
  });
});
