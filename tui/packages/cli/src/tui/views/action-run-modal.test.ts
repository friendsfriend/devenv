import { describe, expect, test } from 'bun:test';
import type { ActionRun } from '@devenv/types';
import { actionNodeStep } from './action-run-modal';

const gitPull: ActionRun = {
  id: 'pull-1',
  title: 'Git pull api',
  action: 'git.pull',
  status: 'completed',
  steps: [{
    id: 'git:api',
    label: 'Git pull api',
    status: 'completed',
    commands: [{ id: 'fetch', command: 'git fetch origin', status: 'completed', stdout: 'updated\n', stderr: '', exitCode: 0 }],
  }],
};

describe('action run modal', () => {
  test('shows command details when structurally single-step action row is selected', () => {
    const step = actionNodeStep({ key: 'action:pull-1', kind: 'action', run: gitPull, depth: 0, hasChildren: false });
    expect(step?.commands[0]).toMatchObject({ command: 'git fetch origin', stdout: 'updated\n', exitCode: 0 });
  });
});
