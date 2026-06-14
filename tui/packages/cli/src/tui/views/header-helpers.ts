import { uiColors } from '@devenv/ui';
import type { App, InfraService } from '@devenv/types';
import type { AppStore, AppDetailStore, MrStore } from '../stores';
import type { HelpActions } from '../actions';

export type TabType = 'applications' | 'infrastructure' | 'libraries' | 'scripts';

export const getTabName = (tab: TabType): string => {
  switch (tab) {
    case 'applications': return 'Applications';
    case 'infrastructure': return 'Infrastructure';
    case 'libraries': return 'Libraries';
    case 'scripts': return 'Scripts';
  }
};

export function hasRunningAppInTab(tab: TabType, appStore: AppStore): boolean {
  const allApps = appStore.apps();
  if (tab === 'scripts') return false;

  const appsInTab: (App | InfraService)[] = tab === 'applications'
    ? allApps.filter((app) => app.appType === 'APP')
    : tab === 'libraries'
      ? allApps.filter((app) => app.appType === 'LIB')
      : appStore.infraServices();

  return appsInTab.some((app) => {
    const status = app.dockerInfo?.Status?.toLowerCase();
    return status === 'running' || status === 'up';
  });
}

export function getTabBorderColor(tab: TabType, appStore: AppStore): string {
  return hasRunningAppInTab(tab, appStore) ? uiColors.success : uiColors.primary;
}

interface HeaderSubtitleDeps {
  appStore: AppStore;
  mrStore: MrStore;
  appDetailStore: AppDetailStore;
  helpActions: HelpActions;
  getSelectedApp: () => App | undefined;
}

export function getHeaderSubtitle(deps: HeaderSubtitleDeps): string {
  const { appStore, mrStore, appDetailStore, helpActions, getSelectedApp } = deps;

  if (appStore.viewMode() === 'help') {
    const helpData = helpActions.getHelpContent();
    return `Help: ${helpData.title}`;
  }
  if (appStore.viewMode() === 'providers') {
    return 'Providers';
  }
  if (appStore.viewMode() === 'jobs') {
    const app = getSelectedApp();
    return `Pipeline Jobs: ${app?.displayName || 'Unknown'} (#${mrStore.currentPipelineId() || 'N/A'})`;
  }
  if (appStore.viewMode() === 'mergeRequestDetail') {
    const mr = mrStore.selectedMR();
    return mr ? `MR !${mr.iid}: ${mr.title}` : 'Merge Request Detail';
  }
  if (appStore.viewMode() === 'mergeRequests') {
    const app = appStore.filteredApps()[appStore.selectedIndex()];
    return `Merge Request: ${app?.displayName || 'Unknown'} (${app?.branch || 'unknown'})`;
  }
  if (appStore.viewMode() === 'appDetail') {
    const app = appDetailStore.appDetailApp();
    return `Details: ${app?.displayName || 'Unknown'}`;
  }
  // Show active tab name in table view
  return getTabName(appStore.activeTab());
}
