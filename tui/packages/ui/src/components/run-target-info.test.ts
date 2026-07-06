import { describe, expect, test } from 'bun:test';
import type { App, TableRow } from '@devenv/types';
import { appRunTargetDetailRows } from './AppDetailView';
import { appRunTargetRightMetadata } from './Table';

const baseApp: App = {
  ident: 'app',
  displayName: 'App',
  localDirectoryPath: '/repo/app',
  repositoryPath: '/repo/app',
  branch: 'main',
  appType: 'APP',
  containerBaseName: 'app',
};

describe('run target info rendering helpers', () => {
  test('detail rows include display and optional source', () => {
    const rows = appRunTargetDetailRows({
      ...baseApp,
      runTargetInfo: {
        runtime: 'shell',
        launchMode: 'tmux',
        label: 'bun build',
        profile: 'default',
        targetId: 'app/app/run/shell/default',
        sourcePath: '/repo/app/package.json',
        startedAt: '2026-01-02T03:04:05Z',
        display: '[tmux] bun build (default)',
      },
    });

    expect(rows[0]).toEqual({ label: 'Run Target', value: '[tmux] bun build (default)' });
    expect(rows.some((row) => row.label === 'Source' && row.value === '/repo/app/package.json')).toBe(true);
  });

  test('detail rows hidden when missing', () => {
    expect(appRunTargetDetailRows(baseApp)).toEqual([]);
  });

  test('table right metadata helper returns compact hint for apps only', () => {
    const row: TableRow = { ...baseApp, rowKind: 'app', runTargetInfo: { runtime: 'docker', startedAt: '2026-01-02T03:04:05Z', display: '[docker] default (default)' } };
    expect(appRunTargetRightMetadata(row)).toBe('[docker] default (default)');
    expect(appRunTargetRightMetadata({ ...row, runTargetInfo: undefined })).toBeUndefined();
  });
});
