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
