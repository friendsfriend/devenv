import { uiColors } from './colors';

/**
 * Status styling utilities matching the Go TUI implementation
 */

export interface StatusStyle {
  color: string;
  icon: string;
}

/**
 * Get styled status with color and icon
 * Matches the styleStatus function from tui/styles.go
 */
export function getStatusStyle(status: string): StatusStyle {
  const trimmedStatus = status?.trim() || '';
  if (!trimmedStatus) {
    return { color: uiColors.textMuted, icon: '' };
  }

  const statusLower = trimmedStatus.toLowerCase();

  // Status mapping with colors and icons (matches Go implementation)
  const statusMap: Record<string, StatusStyle> = {
    // GitLab pipeline/job statuses
    'created': { color: uiColors.warning, icon: '⏳' },
    'waiting_for_resource': { color: uiColors.warning, icon: '⏳' },
    'preparing': { color: uiColors.warning, icon: '⚙️' },
    'pending': { color: uiColors.warning, icon: '⏳' },
    'running': { color: uiColors.success, icon: '▶' },
    'success': { color: uiColors.success, icon: '✓' },
    'failed': { color: uiColors.error, icon: '✗' },
    'canceled': { color: uiColors.textMuted, icon: '⊘' },
    'canceling': { color: uiColors.textMuted, icon: '⊘' },
    'skipped': { color: uiColors.textMuted, icon: '⊘' },
    'manual': { color: uiColors.warning, icon: '🔧' },
    'scheduled': { color: uiColors.warning, icon: '⏰' },
    'blocked': { color: uiColors.warning, icon: '⏳' },
    
    // Docker/App statuses
    'up': { color: uiColors.success, icon: '▶' },
    'healthy': { color: uiColors.success, icon: '✓' },
    'completed': { color: uiColors.success, icon: '✓' },
    'building...': { color: uiColors.warning, icon: '⚙️' },
    'build successful': { color: uiColors.success, icon: '✓' },
    'starting...': { color: uiColors.warning, icon: '⏳' },
    'start successful': { color: uiColors.success, icon: '✓' },
    'checking out...': { color: uiColors.warning, icon: '⏳' },
    'pulling...': { color: uiColors.warning, icon: '⏳' },
    'pushing...': { color: uiColors.warning, icon: '⏳' },
    'cloning...': { color: uiColors.warning, icon: '⏳' },
    'stopping': { color: uiColors.error, icon: '⏹' },
    'stopped': { color: uiColors.textMuted, icon: '⏹' },
    'exited': { color: uiColors.textMuted, icon: '⏹' },
    'error': { color: uiColors.error, icon: '✗' },
    'not found': { color: uiColors.textMuted, icon: '○' },
  };

  // Find matching status (case-insensitive substring match)
  for (const [keyword, style] of Object.entries(statusMap)) {
    if (statusLower.includes(keyword)) {
      return style;
    }
  }

  // Default style
  return { color: uiColors.textMuted, icon: '○' };
}

/**
 * Format status text with icon
 */
export function formatStatus(status: string): string {
  const trimmedStatus = status?.trim() || '...';
  const style = getStatusStyle(trimmedStatus);
  return `${style.icon} ${trimmedStatus}`;
}

/**
 * Get git status style
 * Matches styleGitStatus from tui/styles.go
 */
export function getGitStatusStyle(gitStatus: string): StatusStyle {
  if (gitStatus.includes('*')) {
    return { color: uiColors.warning, icon: '' };
  }
  if (gitStatus === '✓') {
    return { color: uiColors.success, icon: '' };
  }
  if (gitStatus === '...') {
    return { color: uiColors.textMuted, icon: '' };
  }
  return { color: uiColors.textPrimary, icon: '' };
}

/**
 * Format git status text
 */
export function formatGitStatus(gitStatus: string): string {
  return gitStatus || '...';
}

export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getIssueStateColor(state: string): string {
  switch (state.toLowerCase()) {
    case 'open':
    case 'opened':
      return uiColors.success;
    case 'merged':
      return uiColors.primary;
    case 'closed':
      return uiColors.textMuted;
    default:
      return uiColors.textSecondary;
  }
}

export function getPipelineStatusColor(status?: string): string {
  if (!status) return uiColors.textMuted;
  switch (status.toLowerCase()) {
    case 'success':
      return uiColors.success;
    case 'failed':
      return uiColors.error;
    case 'running':
      return uiColors.primary;
    case 'pending':
    case 'created':
      return uiColors.warning;
    case 'canceled':
    case 'skipped':
      return uiColors.textMuted;
    case 'manual':
      return uiColors.borderHighlight;
    default:
      return uiColors.textSecondary;
  }
}

export function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
}
