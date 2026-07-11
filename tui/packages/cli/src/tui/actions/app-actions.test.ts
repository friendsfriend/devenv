import { describe, expect, test } from 'bun:test';
import { handleActionStarted } from './app-actions';
import { createActionRunStore } from '../stores/action-run-store';

test('action trigger opens actions view', () => {
  const store = createActionRunStore();
  let view = 'table';
  handleActionStarted({ pushModal: (next: string) => { view = next; } }, store, {
    run: { id: 'r1', title: 'Run', status: 'active', steps: [] },
  });
  expect(view).toBe('actions');
  expect(store.run()?.id).toBe('r1');
});
