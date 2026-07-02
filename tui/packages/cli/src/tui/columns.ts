import { type TableColumn, getGitStatusStyle } from '@devenv/ui';
import type { TableRow } from '@devenv/types';

function getProviderIcon(app: TableRow): string {
  if (app.rowKind !== 'app') return '';
  if (app.sourceType === 'github') return '';
  if (app.sourceType === 'gitlab') return '';
  return '?';
}

/**
 * Creates table column definitions for the main app table.
 * The spinner columns need reactive access to spinnerFrames and the current frame index.
 */
export function createColumns(): TableColumn[] {
  return [
    {
      key: 'displayName',
      header: 'Application',
      width: '40%',
    },
    {
      key: 'branch',
      header: 'Branch',
      width: '32%',
      render: (app) => {
        if (app.rowKind !== 'app') return '';
        const branch = app.branch || '...';
        const isLinkedWorktree = app.activeWorktree && app.activeWorktree !== app.mainWorktreeBranch;
        if (isLinkedWorktree) {
          return `   ${branch}`;
        }
        return `   ${branch}`;
      },
    },
    {
      key: 'gitStatus',
      header: 'Git',
      width: '8%',
      render: (app) => `${getProviderIcon(app)} ✓`,
      renderParts: (app) => {
        const gitStatus = '✓';
        return [
          { text: `${getProviderIcon(app)} ` },
          { text: gitStatus, color: getGitStatusStyle(gitStatus).color },
        ];
      },
    },
    {
      key: 'ports',
      header: 'Ports',
      width: '20%',
      render: (app) => app.dockerInfo?.Ports || '',
    },
  ];
}

export function createScriptColumns(): TableColumn[] {
  return [
    {
      key: 'displayName',
      header: 'Script Collection',
      width: '55%',
      render: (app) => {
        if (app.rowKind !== 'script') return app.displayName;
        const depth = app.scriptDepth || 0;
        const indent = '  '.repeat(depth);
        if (app.nodeType === 'folder') {
          const icon = app.scriptExpanded ? '▾' : '▸';
          return `${indent}${icon}  ${app.displayName}`;
        }
        const icon = app.interpreter === 'pwsh' || app.interpreter === 'powershell' ? '' : '󱆃';
        return `${indent}  ${icon} ${app.displayName}`;
      },
    },
    {
      key: 'branch',
      header: 'Type',
      width: '12%',
      render: (app) => {
        if (app.rowKind !== 'script') return '';
        if (app.nodeType === 'folder') return 'folder';
        return app.interpreter || 'script';
      },
    },
    {
      key: 'repositoryPath',
      header: 'Path',
      width: '33%',
      render: (app) => app.rowKind === 'script' ? app.scriptRelativePath || '' : '',
    },
  ];
}
