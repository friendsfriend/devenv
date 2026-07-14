import { describe, expect, test } from 'bun:test';
import { createAppActions, handleActionStarted } from './app-actions';
import { createActionRunStore } from '../stores/action-run-store';
import { createAppStore } from '../stores/app-store';
import { createAppDetailStore } from '../stores/app-detail-store';

test('action trigger opens actions view', () => {
  const store = createActionRunStore();
  let view = 'table';
  handleActionStarted({ pushModal: (next: string) => { view = next; } }, store, {
    run: { id: 'r1', title: 'Run', status: 'active', steps: [] },
  });
  expect(view).toBe('actions');
  expect(store.run()?.id).toBe('r1');
});

test('completed action keeps operation status until refreshed runtime snapshot arrives', async () => {
  const appStore = createAppStore();
  appStore.setApps([{
    ident: 'api', displayName: 'API', localDirectoryPath: '/repo', repositoryPath: '/repo', branch: 'main', appType: 'APP', containerBaseName: 'api',
    status: 'Running', operationStatus: { operation: 'stop', status: 'active', message: 'Stopping...' },
  }]);
  let resolveStatus!: (value: any[]) => void;
  const status = new Promise<any[]>((resolve) => { resolveStatus = resolve; });
  const actionRunStore = createActionRunStore();
  const actions = createAppActions(
    appStore,
    createAppDetailStore(),
    {} as any,
    {
      getActionHistory: async () => [],
      getStatus: () => status,
      subscribeToEvents: async function* () {
        yield { type: 'action.started', properties: { run: { id: 'r1', appIdent: 'api', title: 'Stop API', status: 'active', steps: [] } } };
        yield { type: 'action.completed', properties: { runId: 'r1', status: 'completed' } };
      },
    } as any,
    () => {},
    actionRunStore,
  );

  await actions.subscribeToUpdates();
  expect(appStore.apps()[0].operationStatus?.message).toBe('Stopping...');

  resolveStatus([{ ident: 'api', status: 'Stopped', dockerInfo: { Status: 'exited' } }]);
  await Promise.resolve();
  await Promise.resolve();
  expect(appStore.apps()[0].status).toBe('Stopped');
  expect(appStore.apps()[0].operationStatus).toBeUndefined();
});

test('status snapshot preserves Kubernetes status over missing container status', async () => {
  const appStore = createAppStore();
  appStore.setApps([{
    ident: 'api', displayName: 'API', localDirectoryPath: '/repo', repositoryPath: '/repo', branch: 'main', appType: 'APP', containerBaseName: 'api',
  }]);
  const actions = createAppActions(
    appStore,
    createAppDetailStore(),
    {} as any,
    { getStatus: async () => [{ ident: 'api', dockerInfo: { Status: 'not found' }, status: 'running (1/1 pods)' }] } as any,
    () => {},
  );

  await actions.fetchStatus();
  expect(appStore.apps()[0].status).toBe('running (1/1 pods)');
});
