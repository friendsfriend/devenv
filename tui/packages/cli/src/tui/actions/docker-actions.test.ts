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
    pushModal: () => {},
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
  test('selected build starts backend action id', async () => {
    const app = { ident: 'web', displayName: 'Web' };
    const target = { id: 'app/web/build/docker/with-redis', action: 'build', runtime: 'docker', label: 'with-redis', profile: 'with-redis' };
    const { appStore, uiStore } = createStores(app);
    const calls: unknown[][] = [];
    const client = { startActionRun: async (...args: unknown[]) => { calls.push(args); } };
    const actions = createDockerActions(appStore as any, uiStore as any, client as any, () => {});

    await actions.runSelectedTarget(app as any, 'build', target as any);

    expect(calls).toEqual([['app/web/build/docker/with-redis']]);
  });

  test('infrastructure start uses backend definitions and only picks among multiple actions', async () => {
    const { appStore, uiStore } = createStores({ ident: 'app' });
    let targets: any[] = [];
    let shown = false;
    (uiStore as any).setActionTargetPickerTargets = (next: any[]) => { targets = next; };
    (uiStore as any).setShowActionTargetPicker = (next: boolean) => { shown = next; };
    const starts: string[] = [];
    const client = {
      getActionDefinitions: async (ident: string) => ({ version: 1, actions: ident === 'redis'
        ? [{ id: 'infra/redis/action/start/docker/default', type: 'start', runtime: 'docker', label: 'Default', availability: { available: true }, root: {} }]
        : [
          { id: 'infra/clock/action/start/shell/default', type: 'start', runtime: 'shell', label: 'Shell', availability: { available: true }, root: {} },
          { id: 'infra/clock/action/start/powershell/default', type: 'start', runtime: 'powershell', label: 'PowerShell', availability: { available: true }, root: {} },
        ] }),
      startActionRun: async (id: string) => { starts.push(id); },
    };
    const actions = createDockerActions(appStore as any, uiStore as any, client as any, () => {});

    await actions.openInfrastructureStartTargetPicker({ ident: 'redis', displayName: 'Redis', type: 'docker', containerBaseName: 'redis' } as any);
    expect(starts).toEqual(['infra/redis/action/start/docker/default']);
    expect(shown).toBe(false);

    await actions.openInfrastructureStartTargetPicker({ ident: 'clock', displayName: 'Clock', type: 'script', shellPath: 'clock.sh', powerShellPath: 'clock.ps1' } as any);
    expect(targets).toEqual([
      expect.objectContaining({ id: 'infra/clock/action/start/shell/default', label: 'Shell' }),
      expect.objectContaining({ id: 'infra/clock/action/start/powershell/default', label: 'PowerShell' }),
    ]);
    expect(shown).toBe(true);
  });

  test('app stop starts matching backend stop action', async () => {
    const app = {
      ident: 'web',
      displayName: 'Web',
      runTargetInfo: { targetId: 'app/web/run/docker/redis', runtime: 'docker', profile: 'redis' },
    };
    const { appStore, uiStore } = createStores(app);
    const calls: string[] = [];
    const client = {
      getActionDefinitions: async () => ({ version: 1, actions: [{ id: 'app/web/action/stop/docker/redis', type: 'stop', runtime: 'docker', label: 'Stop', availability: { available: true }, root: {} }] }),
      startActionRun: async (id: string) => { calls.push(id); },
    };
    const actions = createDockerActions(appStore as any, uiStore as any, client as any, () => {});

    await actions.performDockerOperation('stop', app as any);

    expect(calls).toEqual(['app/web/action/stop/docker/redis']);
  });

  test('app stop chooses Kubernetes lifecycle over stale Podman run target when pods run', async () => {
    const app = {
      ident: 'web',
      displayName: 'Web',
      status: 'running (1/1 pods)',
      runTargetInfo: { targetId: 'app/web/run/docker/with-redis', runtime: 'podman', profile: 'with-redis' },
    };
    const { appStore, uiStore } = createStores(app);
    const calls: string[] = [];
    const client = {
      getActionDefinitions: async () => ({ version: 1, actions: [
        { id: 'app/web/action/stop/podman/with-redis', type: 'stop', runtime: 'podman', label: 'Stop (podman)', availability: { available: true }, root: {} },
        { id: 'app/web/action/stop/kubernetes/k8s-local', type: 'stop', runtime: 'kubernetes', label: 'Stop', availability: { available: true }, root: {} },
      ] }),
      startActionRun: async (id: string) => { calls.push(id); },
    };
    const actions = createDockerActions(appStore as any, uiStore as any, client as any, () => {});

    await actions.performDockerOperation('stop', app as any);

    expect(calls).toEqual(['app/web/action/stop/kubernetes/k8s-local']);
  });
});
