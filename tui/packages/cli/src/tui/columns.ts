import { type TableColumn, uiColors, getStatusStyle, formatStatus, getGitStatusStyle } from '@devenv/ui';
import type { App } from '@devenv/types';

function getProviderIcon(app: App): string {
  if (app.sourceType === 'github') return '';
  if (app.sourceType === 'gitlab') return '';
  return '?';
}

/**
 * Creates table column definitions for the main app table.
 * The spinner columns need reactive access to spinnerFrames and the current frame index.
 */
export function createColumns(
  spinnerFrames: string[],
  spinnerFrame: () => number,
): TableColumn[] {
  return [
    {
      key: 'displayName',
      header: 'Application',
      width: '25%',
    },
    {
      key: 'branch',
      header: 'Branch',
      width: '20%',
      render: (app) => {
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
      key: 'dockerStatus',
      header: 'Status',
      width: '15%',
      render: (app) => {
        // Prioritize operation status if present and valid
        if (app.operationStatus && app.operationStatus.status && app.operationStatus.message) {
          // Show animated spinner for active operations (no text)
          if (app.operationStatus.status === 'active') {
            return spinnerFrames[spinnerFrame()];
          }
          return app.operationStatus.message;
        }
        // Fallback to Docker status
        const status = app.dockerInfo?.Status || 'not found';
        return formatStatus(status);
      },
      color: (app) => {
        // Prioritize operation status color if valid
        if (app.operationStatus && app.operationStatus.status) {
          const statusType = app.operationStatus.status;
          switch (statusType) {
            case 'active':
              return uiColors.primary; // Blue for in-progress
            case 'completed':
              return uiColors.success; // Green for success
            case 'failed':
              return uiColors.error; // Red for errors
            case 'pending':
              return uiColors.warning; // Yellow for pending
            default:
              return uiColors.textPrimary;
          }
        }
        // Fallback to Docker status color
        const status = app.dockerInfo?.Status || 'not found';
        return getStatusStyle(status).color;
      },
    },
    {
      key: 'containerID',
      header: 'Container ID',
      width: '18%',
      render: (app) => {
        const containerId = app.dockerInfo?.ContainerID || '';
        return containerId ? containerId.substring(0, 12) : ''; // Show first 12 chars like Docker CLI
      },
    },
    {
      key: 'ports',
      header: 'Ports',
      width: '14%',
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
        const depth = app.scriptDepth || 0;
        const indent = '  '.repeat(depth);
        if (app.resourceType === 'script-folder') {
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
        if (app.resourceType === 'script-folder') return 'folder';
        return app.interpreter || 'script';
      },
    },
    {
      key: 'repositoryPath',
      header: 'Path',
      width: '33%',
      render: (app) => app.scriptRelativePath || '',
    },
  ];
}
