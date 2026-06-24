import type { KeyboardEvent, KeyboardStores, KeyboardActions } from './types';

import { isDownKey, isUpKey } from './nav-keys';
/**
 * Handles keyboard events for the Add App modal wizard flow:
 * selectProvider → selectAppType → findRepo → appName → selectBranch → confirm
 */
export function handleAddAppModalKeys(
  event: KeyboardEvent,
  stores: KeyboardStores,
  actions: KeyboardActions,
): boolean {
  const { providerStore } = stores;
  const { providerActions } = actions;

  if (!providerStore.showAddAppModal()) return false;

  const step = providerStore.addAppStep();

  if (event.name === 'escape' || event.name === 'Escape' || event.name === 'esc') {
    if (step === 'selectProvider') {
      providerActions.resetAddAppModal();
    } else if (step === 'selectAppType') {
      providerStore.setAddAppStep('selectProvider');
      providerStore.setAddAppError(null);
    } else if (step === 'findRepo') {
      const mode = providerStore.addAppFindRepoMode();
      if (mode === 'selectMode') {
        providerStore.setAddAppStep('selectAppType');
      } else {
        providerStore.setAddAppFindRepoMode('selectMode');
      }
      providerStore.setAddAppError(null);
    } else if (step === 'appName') {
      providerStore.setAddAppStep('findRepo');
      providerStore.setAddAppError(null);
    } else if (step === 'selectBranch') {
      providerStore.setAddAppStep('appName');
      providerStore.setAddAppError(null);
    } else if (step === 'confirm') {
      providerStore.setAddAppStep('selectBranch');
      providerStore.setAddAppError(null);
    }
    return true;
  }

  if (step === 'selectProvider') {
    const providers = providerStore.addAppProviders();
    if (isDownKey(event)) {
      providerStore.setAddAppSelectedProviderIndex(i => (i + 1) % Math.max(1, providers.length));
      return true;
    }
    if (isUpKey(event)) {
      providerStore.setAddAppSelectedProviderIndex(i => (i - 1 + providers.length) % Math.max(1, providers.length));
      return true;
    }
    if (event.name === 'return' || event.name === 'enter' || event.name === 'Return' || event.name === 'Enter') {
      if (providers.length > 0) {
        providerStore.setAddAppSearchQuery('');
        providerStore.setAddAppSearchResults([]);
        providerStore.setAddAppSelectedResultIndex(0);
        providerStore.setAddAppManualUrl('');
        providerStore.setAddAppFindRepoMode('selectMode');
        providerStore.setAddAppFindRepoModeIndex(0);
        providerStore.setAddAppName('');
        providerStore.setAddAppBranches([]);
        providerStore.setAddAppSelectedBranchIndex(0);
        providerStore.setAddAppBranchFilter('');
        providerStore.setAddAppStep('selectAppType');
        providerStore.setAddAppError(null);
      }
      return true;
    }
    return true;
  }

  if (step === 'selectAppType') {
    if (isDownKey(event)) {
      providerStore.setAddAppAppTypeIndex(i => (i + 1) % 2);
      return true;
    }
    if (isUpKey(event)) {
      providerStore.setAddAppAppTypeIndex(i => (i - 1 + 2) % 2);
      return true;
    }
    if (event.name === 'return' || event.name === 'enter' || event.name === 'Return' || event.name === 'Enter') {
      providerStore.setAddAppAppType(providerStore.addAppAppTypeIndex() === 0 ? 'APP' : 'LIB');
      providerStore.setAddAppStep('findRepo');
      providerStore.setAddAppError(null);
      return true;
    }
    return true;
  }

  if (step === 'findRepo') {
    const mode = providerStore.addAppFindRepoMode();
    if (mode === 'selectMode') {
      if (isDownKey(event)) {
        providerStore.setAddAppFindRepoModeIndex(i => (i + 1) % 2);
        return true;
      }
      if (isUpKey(event)) {
        providerStore.setAddAppFindRepoModeIndex(i => (i - 1 + 2) % 2);
        return true;
      }
      if (event.name === 'return' || event.name === 'enter' || event.name === 'Return' || event.name === 'Enter') {
        providerStore.setAddAppFindRepoMode(providerStore.addAppFindRepoModeIndex() === 0 ? 'search' : 'url');
        providerStore.setAddAppError(null);
        return true;
      }
    } else if (mode === 'url') {
      if (event.name === 'return' || event.name === 'enter' || event.name === 'Return' || event.name === 'Enter') {
        if (providerStore.addAppManualUrl().trim()) {
          const url = providerStore.addAppManualUrl().trim();
          const repoName = url.split('/').pop()?.replace(/\.git$/, '') ?? '';
          providerStore.setAddAppName(repoName);
          providerStore.setAddAppStep('appName');
          providerStore.setAddAppError(null);
        } else {
          providerStore.setAddAppError('URL is required');
        }
        return true;
      }
      if (event.name === 'backspace' || event.name === 'delete') {
        providerStore.setAddAppManualUrl(v => v.slice(0, -1));
        return true;
      }
      const ch = event.sequence ?? event.name ?? '';
      if (ch.length === 1 && ch >= ' ') {
        providerStore.setAddAppManualUrl(v => v + ch);
        return true;
      }
    } else {
      // search mode
      if (event.name === 'return' || event.name === 'enter' || event.name === 'Return' || event.name === 'Enter') {
        const results = providerStore.addAppSearchResults();
        if (results.length > 0) {
          const selected = results[providerStore.addAppSelectedResultIndex()];
          if (selected) {
            providerStore.setAddAppName(selected.name);
            providerStore.setAddAppStep('appName');
            providerStore.setAddAppError(null);
          }
        } else if (providerStore.addAppSearchQuery().trim()) {
          void providerActions.addAppPerformSearch();
        }
        return true;
      }
      if (isDownKey(event)) {
        const results = providerStore.addAppSearchResults();
        if (results.length > 0) {
          providerStore.setAddAppSelectedResultIndex(i => (i + 1) % results.length);
        }
        return true;
      }
      if (isUpKey(event)) {
        const results = providerStore.addAppSearchResults();
        if (results.length > 0) {
          providerStore.setAddAppSelectedResultIndex(i => (i - 1 + results.length) % results.length);
        }
        return true;
      }
      if (event.name === 'backspace' || event.name === 'delete') {
        providerStore.setAddAppSearchQuery(v => v.slice(0, -1));
        return true;
      }
      const ch = event.sequence ?? event.name ?? '';
      if (ch.length === 1 && ch >= ' ') {
        providerStore.setAddAppSearchQuery(v => v + ch);
        return true;
      }
    }
    return true;
  }

  if (step === 'appName') {
    if (event.name === 'return' || event.name === 'enter' || event.name === 'Return' || event.name === 'Enter') {
      if (providerStore.addAppName().trim()) {
        providerStore.setAddAppError(null);
        const repoUrl = providerStore.addAppFindRepoMode() === 'url'
          ? providerStore.addAppManualUrl().trim()
          : providerStore.addAppSearchResults()[providerStore.addAppSelectedResultIndex()]?.url ?? '';
        if (repoUrl) {
          void providerActions.addAppFetchBranches(repoUrl);
          providerStore.setAddAppStep('selectBranch');
        } else {
          providerStore.setAddAppError('No repository URL');
        }
      } else {
        providerStore.setAddAppError('App name is required');
      }
      return true;
    }
    if (event.name === 'backspace' || event.name === 'delete') {
      providerStore.setAddAppName(v => v.slice(0, -1));
      return true;
    }
    const ch = event.sequence ?? event.name ?? '';
    if (ch.length === 1 && ch >= ' ') {
      providerStore.setAddAppName(v => v + ch);
      return true;
    }
    return true;
  }

  if (step === 'selectBranch') {
    const filteredBranchList = providerStore.addAppBranches().filter(b =>
      b.toLowerCase().includes(providerStore.addAppBranchFilter().toLowerCase())
    );
    if (event.name === 'return' || event.name === 'enter' || event.name === 'Return' || event.name === 'Enter') {
      if (filteredBranchList.length > 0) {
        providerStore.setAddAppStep('confirm');
        providerStore.setAddAppError(null);
      }
      return true;
    }
    if (isDownKey(event)) {
      if (filteredBranchList.length > 0) {
        providerStore.setAddAppSelectedBranchIndex(i => (i + 1) % filteredBranchList.length);
      }
      return true;
    }
    if (isUpKey(event)) {
      if (filteredBranchList.length > 0) {
        providerStore.setAddAppSelectedBranchIndex(i => (i - 1 + filteredBranchList.length) % filteredBranchList.length);
      }
      return true;
    }
    if (event.name === 'backspace' || event.name === 'delete') {
      providerStore.setAddAppBranchFilter(v => v.slice(0, -1));
      providerStore.setAddAppSelectedBranchIndex(0);
      return true;
    }
    const ch = event.sequence ?? event.name ?? '';
    if (ch.length === 1 && ch >= ' ') {
      providerStore.setAddAppBranchFilter(v => v + ch);
      providerStore.setAddAppSelectedBranchIndex(0);
      return true;
    }
    return true;
  }

  if (step === 'confirm') {
    if (event.name === 'return' || event.name === 'enter' || event.name === 'Return' || event.name === 'Enter') {
      void providerActions.addAppSubmitCreate();
      return true;
    }
    return true;
  }

  return true;
}
