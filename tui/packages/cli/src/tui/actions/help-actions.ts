import type { HelpSection } from '@devenv/ui';
import type { AppStore } from '../stores/app-store';
import type { LogStore } from '../stores/log-store';
import type { MrStore } from '../stores/mr-store';
import type { UiStore } from '../stores/ui-store';

export function createHelpActions(
  appStore: AppStore,
  logStore: LogStore,
  mrStore: MrStore,
  uiStore: UiStore,
) {
  const showHelp = () => {
    appStore.setPreviousViewMode(appStore.viewMode());
    appStore.setViewMode('help');
  };

  const closeHelp = () => {
    appStore.setViewMode(appStore.previousViewMode() ?? 'table');
  };

  const getHelpContent = (): { sections: HelpSection[]; title: string } => {
    const currentView = appStore.previousViewMode();
    if (currentView === 'table') {
      return {
        title: 'Application Table',
        sections: [
          { title: 'Navigation', items: [{ key: '↑ or k', description: 'Move selection up' }, { key: '↓ or j', description: 'Move selection down' }] },
          {
            title: 'Actions',
            items: [
              { key: 'l', description: 'View container logs for selected application' },
              { key: 'o', description: 'View operation logs for selected application' },
              { key: 'e', description: 'Open selected app directory in default editor ($EDITOR)' },
              { key: 'E', description: 'Open editor picker (choose between nvim, VS Code, IntelliJ)' },
              { key: 'g', description: 'Open selected app repository in lazygit' },
              { key: 'd', description: 'Open lazydocker for selected app' },
              { key: 'm', description: 'View MR for current branch (opens detail directly)' },
              { key: 'M', description: 'View all open MRs (shows full list)' },
              { key: 'c', description: 'View system configuration' },
              { key: '+', description: 'Add new application from a git provider' },
              { key: '-', description: 'Remove selected application (with confirmation)' },
              { key: 'Enter', description: 'View detailed information for selected application' },
            ],
          },
          { title: 'Docker Control', items: [{ key: 's', description: 'Start selected container' }, { key: 'S', description: 'Stop selected container' }, { key: 'r', description: 'Refresh status (re-fetch Docker + Git info)' }, { key: 'R', description: 'Restart selected container' }] },
          { title: 'Git Operations', items: [{ key: 'p', description: 'Git pull (fetch and merge from remote)' }, { key: 'P', description: 'Git push (push local commits to remote)' }, { key: 'f', description: 'Git fetch (fetch from remote without merge)' }, { key: 'b', description: 'Checkout branch (switch to different branch)' }] },
          { title: 'Build', items: [{ key: 'B', description: 'Build selected application' }] },
          { title: 'AI Agent', items: [{ key: 'A', description: 'Open pi agent view (resume or start a new session)' }] },
          { title: 'SSH', items: [{ key: 'H', description: 'Open SSH host picker (connect to hosts from ~/.ssh/config)' }] },
          { title: 'General', items: [{ key: 'Ctrl+Shift+C', description: 'Copy current selection to clipboard' }, { key: '?', description: 'Show this help screen' }, { key: 'q', description: 'Quit application' }] },
        ],
      };
    }
    if (currentView === 'appDetail') return { title: 'Application Details', sections: [{ title: 'Navigation', items: [{ key: 'Esc', description: 'Return to application table' }, { key: 'q', description: 'Quit application' }] }, { title: 'Information', items: [{ key: '', description: 'Shows app info, git status, open MRs, container stats, and logs' }] }] };
    if (currentView === 'mergeRequests') return { title: 'Merge Request List', sections: [{ title: 'Navigation', items: [{ key: 'j or k', description: 'Navigate through merge requests' }, { key: 'g', description: 'Go to first merge request' }, { key: 'G', description: 'Go to last merge request' }, { key: 'Enter', description: 'View selected merge request details' }] }, { title: 'Actions', items: [{ key: 'Enter', description: 'View test detail (output, stack trace)' }, { key: 'Esc', description: 'Return to merge request detail' }, { key: '?', description: 'Show this help screen' }, { key: 'q', description: 'Quit application' }] }] };
    if (currentView === 'mergeRequestDetail') return { title: 'Merge Request Detail', sections: [{ title: 'Information', items: [{ key: '', description: 'View details of the selected merge request' }, { key: '', description: 'See pipeline status, approvals, and changes' }] }, { title: 'Actions', items: [{ key: 'a', description: 'Toggle approval (approve/unapprove)' }, { key: 'Shift+A', description: 'AI review — stream review via opencode or pi, then post as MR comment' }, { key: 'r', description: 'Rebase merge request' }, { key: 'C', description: 'View changed files' }, { key: 'D', description: 'View discussions/comments' }, { key: 'J', description: 'View pipeline jobs' }, { key: 'T', description: 'View detailed test results' }, { key: 'Esc', description: 'Return to merge request list' }, { key: '?', description: 'Show this help screen' }, { key: 'q', description: 'Quit application' }] }] };
    if (currentView === 'jobs') return { title: 'Pipeline Jobs', sections: [{ title: 'Navigation', items: [{ key: '↑/↓ or j/k', description: 'Navigate through jobs in current stage' }, { key: '←/→ or h/l', description: 'Switch between pipeline stages' }] }, { title: 'Actions', items: [{ key: 'v', description: 'View logs for selected job' }, { key: 'r', description: 'Retry failed or canceled job' }, { key: 'c', description: 'Cancel running or pending job' }, { key: 'Esc', description: 'Return to merge request detail' }, { key: '?', description: 'Show this help screen' }, { key: 'q', description: 'Quit application' }] }] };
    if (currentView === 'testResults') return { title: 'Test Results', sections: [{ title: 'Information', items: [{ key: '', description: 'View detailed test results from the pipeline' }, { key: '', description: 'Failed tests are shown at the top' }, { key: '', description: 'Includes execution time and error details' }] }, { title: 'Navigation', items: [{ key: 'j/k', description: 'Navigate up/down through tests' }, { key: 'g', description: 'Go to top of test list' }, { key: 'G', description: 'Go to bottom of test list' }] }, { title: 'Actions', items: [{ key: 'Esc', description: 'Return to merge request detail' }, { key: '?', description: 'Show this help screen' }, { key: 'q', description: 'Quit application' }] }] };
    if (currentView === 'changedFiles') return { title: 'Changed Files', sections: [{ title: 'Navigation', items: [{ key: '↑/↓ or j/k', description: 'Navigate through changed files' }, { key: 'g', description: 'Go to first file' }, { key: 'G', description: 'Go to last file' }] }, { title: 'Actions', items: [{ key: 'Esc', description: 'Return to merge request detail' }, { key: '?', description: 'Show this help screen' }, { key: 'q', description: 'Quit application' }] }] };
    if (currentView === 'discussionsView') return { title: 'Discussions/Comments', sections: [{ title: 'Information', items: [{ key: '', description: 'View all discussions and comments on the MR' }, { key: '', description: 'See threaded conversations and inline code comments' }] }, { title: 'Navigation', items: [{ key: 'j/k or ↑/↓', description: 'Navigate through discussions' }, { key: 'g', description: 'Go to first discussion' }, { key: 'G', description: 'Go to last discussion' }] }, { title: 'Actions', items: [{ key: 'r', description: 'Reply to the selected discussion thread' }, { key: 'x', description: 'Toggle resolve/unresolve the selected discussion' }, { key: 'Shift+D', description: 'Open full diff for the file this comment is on' }, { key: 'Shift+C', description: 'Switch to Changed Files view' }, { key: 'Esc', description: 'Return to merge request detail' }, { key: '?', description: 'Show this help screen' }, { key: 'q', description: 'Quit application' }] }] };
    if (currentView === 'providers') return { title: 'Providers', sections: [{ title: 'Information', items: [{ key: '', description: 'View and manage configured git providers' }] }, { title: 'Actions', items: [{ key: 'a', description: 'Add a new provider' }, { key: 'e', description: 'Edit the selected provider' }, { key: 'd', description: 'Delete the selected provider' }, { key: 'j/k', description: 'Navigate provider list' }, { key: 'Esc', description: 'Return to application table' }, { key: '?', description: 'Show this help screen' }, { key: 'q', description: 'Quit application' }] }] };
    return { title: 'Help', sections: [{ title: 'General', items: [{ key: '?', description: 'Toggle help screen' }, { key: 'Esc', description: 'Close help or go back' }, { key: 'q', description: 'Quit application (works from any view)' }] }] };
  };

  const getKeybinds = () => {
    if (uiStore.showPassphraseModal()) return [{ key: 'Enter', action: 'Unlock Key' }, { key: 'Esc', action: 'Cancel' }];
    if (appStore.viewMode() === 'help') return [{ key: 'Esc or ?', action: 'Close Help' }, { key: 'q', action: 'Quit' }];
    if (appStore.viewMode() === 'discussionsView') {
      if (mrStore.replyMode()) return [{ key: 'Ctrl+Enter', action: 'Submit Reply' }, { key: 'Esc', action: 'Cancel Reply' }];
      return [{ key: 'j/k', action: 'Navigate' }, { key: 'g/G', action: 'Top/Bottom' }, { key: 'c', action: 'Comments Only' }, { key: 'r', action: 'Reply' }, { key: 'x', action: 'Resolve/Unresolve' }, { key: 'D', action: 'View Diff' }, { key: 'C', action: 'Changed Files' }, { key: '?', action: 'Help' }, { key: 'Esc', action: 'Back to MR' }, { key: 'q', action: 'Quit' }];
    }
    if (logStore.showLogModal()) {
      if (logStore.logSearchMode()) return [{ key: 'Enter', action: 'Confirm Search' }, { key: 'Backspace', action: 'Delete Char' }, { key: 'Esc', action: 'Cancel Search' }];
      if (logStore.logVisualModeActive()) return [{ key: 'j/k', action: 'Extend Selection' }, { key: 'c', action: 'Copy Selection' }, { key: 'v/Esc', action: 'Exit Visual' }, { key: 'q', action: 'Quit' }];
      return [{ key: 'j/k', action: 'Up/Down' }, { key: 'h/l', action: 'Left/Right' }, { key: 'u/d', action: 'Page' }, { key: 'g/G', action: 'Top/Bottom' }, { key: '/', action: 'Search' }, { key: 'n/p', action: 'Next/Prev Match' }, { key: 'v', action: 'Visual Mode' }, { key: 'c', action: 'Copy Line' }, { key: 'e', action: 'Open Log File' }, { key: 'Esc', action: 'Close Logs' }, { key: 'q', action: 'Quit' }];
    }
    if (appStore.viewMode() === 'jobs') return [{ key: '←/→ or h/l', action: 'Switch Stage' }, { key: '↑/↓ or j/k', action: 'Navigate Jobs' }, { key: '/', action: 'Search' }, { key: 'v', action: 'View Logs' }, { key: 'r/c', action: 'Retry/Cancel' }, { key: '?', action: 'Help' }, { key: 'Esc', action: 'Back to MR' }, { key: 'q', action: 'Quit' }];
    if (appStore.viewMode() === 'mergeRequestDetail') return [{ key: 'a', action: 'Approve' }, { key: 'Shift+A', action: 'AI Review' }, { key: 'J', action: 'Jobs' }, { key: 'T', action: 'Tests' }, { key: '?', action: 'Help' }, { key: 'Esc', action: 'Back to List' }, { key: 'q', action: 'Quit' }];
    if (appStore.viewMode() === 'testResults') return [{ key: 'j/k', action: 'Navigate' }, { key: 'g/G', action: 'Top/Bottom' }, { key: '/', action: 'Search' }, { key: 'Enter', action: 'View Detail' }, { key: '?', action: 'Help' }, { key: 'Esc', action: 'Back to MR' }, { key: 'q', action: 'Quit' }];
    if (appStore.viewMode() === 'changedFiles') return [{ key: 'j/k', action: 'Navigate' }, { key: 'g/G', action: 'Top/Bottom' }, { key: '/', action: 'Search' }, { key: 'Enter', action: 'View Diff' }, { key: 'D', action: 'Discussions' }, { key: '?', action: 'Help' }, { key: 'Esc', action: 'Back to MR' }, { key: 'q', action: 'Quit' }];
    if (appStore.viewMode() === 'mergeRequests') return [{ key: 'j/k', action: 'Navigate' }, { key: 'g/G', action: 'Top/Bottom' }, { key: '/', action: 'Search' }, { key: 'Enter', action: 'View Detail' }, { key: '?', action: 'Help' }, { key: 'Esc', action: 'Back' }, { key: 'q', action: 'Quit' }];
    if (appStore.viewMode() === 'providers') return [{ key: 'j/k', action: 'Navigate' }, { key: 'a', action: 'Add Provider' }, { key: 'e', action: 'Edit Provider' }, { key: 'd', action: 'Delete Provider' }, { key: 'Esc', action: 'Close' }, { key: '?', action: 'Help' }, { key: 'q', action: 'Quit' }];
    if (appStore.viewMode() === 'agentView') return [{ key: 'j/k', action: 'Navigate' }, { key: 'Type', action: 'Search' }, { key: 'Enter', action: 'Launch' }, { key: 'Esc', action: 'Clear/Close' }];
    if (appStore.viewMode() === 'sshPicker') return [{ key: 'j/k', action: 'Navigate' }, { key: 'Type', action: 'Filter' }, { key: 'Enter', action: 'Connect' }, { key: 'Esc', action: 'Close' }];
    if (appStore.viewMode() === 'appDetail') return [{ key: 'Esc', action: 'Back' }, { key: 'q', action: 'Quit' }];
    if (appStore.viewMode() !== 'table') return [{ key: 'j/k', action: 'Scroll' }, { key: 'h/l', action: 'Scroll H' }, { key: 'u/d', action: 'Page' }, { key: 'g/G', action: 'Top/Bottom' }, { key: 'e', action: 'Open Log File' }, { key: '?', action: 'Help' }, { key: 'Esc', action: 'Back' }, { key: 'q', action: 'Quit' }];
    return appStore.tableSearchMode()
      ? [{ key: 'Enter', action: 'Confirm' }, { key: 'Backspace', action: 'Delete Char' }, { key: 'Esc', action: 'Cancel' }]
      : appStore.activeTab() === 'scripts'
        ? [{ key: 'Tab/1/2/3/4', action: 'Switch Tab' }, { key: '↑/k', action: 'Up' }, { key: '↓/j', action: 'Down' }, { key: '/', action: 'Search' }, { key: 'Enter', action: 'Expand/Run' }, { key: 's', action: 'Run Script' }, { key: 'S', action: 'Run With Args' }, { key: '+', action: 'Add Script' }, { key: '-', action: 'Delete Script/Folder' }, { key: 'e', action: 'Editor' }, { key: 'E', action: 'Editor Picker' }, { key: 'r', action: 'Refresh Scripts' }, { key: 'L', action: 'Status Log' }, { key: '?', action: 'Help' }, { key: 'q', action: 'Quit' }]
        : [{ key: 'Tab/1/2/3/4', action: 'Switch Tab' }, { key: '↑/k', action: 'Up' }, { key: '↓/j', action: 'Down' }, { key: '/', action: 'Search' }, { key: 'l', action: 'Cont. Logs' }, { key: 'L', action: 'Status Log' }, { key: 'o', action: 'Op. Logs' }, { key: 'm', action: 'MRs' }, { key: 'r', action: 'Refresh' }, { key: 's/S/R', action: 'Start/Stop/Restart' }, { key: 'p/P/f', action: 'Pull/Push/Fetch' }, { key: 'B', action: 'Build' }, { key: 'e', action: 'Editor' }, { key: 'E', action: 'Editor Picker' }, { key: 'g', action: 'Lazygit' }, { key: 'd', action: 'Lazydocker' }, { key: 'A', action: 'AI Agent' }, { key: 'H', action: 'SSH' }, { key: '+', action: 'Add App' }, { key: '-', action: 'Remove App' }, { key: '?', action: 'Help' }, { key: 'q', action: 'Quit' }];
  };

  return { showHelp, closeHelp, getHelpContent, getKeybinds };
}

export type HelpActions = ReturnType<typeof createHelpActions>;
