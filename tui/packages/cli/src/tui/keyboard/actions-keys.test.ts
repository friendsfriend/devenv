import { expect, test } from 'bun:test';
import { createActionRunStore } from '../stores/action-run-store';
import { handleActionsKeys } from './actions-keys';

test('Shift+J/K switches action panels and j/k uses focused panel', () => {
  const store = createActionRunStore();
  store.handleEvent('action.started', { run: { id: 'r', title: 'Run', status: 'active', steps: [{ id: 'a', label: 'A', status: 'pending', commands: [] }, { id: 'b', label: 'B', status: 'pending', commands: [] }] } });
  const appStore = { popModal: () => undefined } as any;
  handleActionsKeys({ name: 'J', shift: true } as any, store, appStore);
  expect(store.focusedPanel()).toBe(1);
  handleActionsKeys({ name: 'K', shift: true } as any, store, appStore);
  expect(store.focusedPanel()).toBe(0);
  handleActionsKeys({ name: 'j' } as any, store, appStore);
  expect(store.focusedStepId()).toBe('a');
  handleActionsKeys({ name: 'down' } as any, store, appStore);
  expect(store.focusedStepId()).toBe('b');
  handleActionsKeys({ name: 'up' } as any, store, appStore);
  expect(store.focusedStepId()).toBe('a');
});
