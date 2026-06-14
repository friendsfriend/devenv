import type { ProviderStore } from '../stores';
import type { PasteEvent } from '@opentui/core';

export function routePastedText(text: string, providerStore: ProviderStore): boolean {
  if (!text) return false;

/**
 * Handles paste events for the TUI — routes pasted text to the appropriate
 * input field based on current modal state.
 */
  if (providerStore.showAddAppModal()) {
    const step = providerStore.addAppStep();
    const mode = providerStore.addAppFindRepoMode();
    if (step === 'findRepo' && mode === 'url') {
      providerStore.setAddAppManualUrl(v => v + text);
    } else if (step === 'findRepo' && mode === 'search') {
      providerStore.setAddAppSearchQuery(v => v + text);
    } else if (step === 'appName') {
      providerStore.setAddAppName(v => v + text);
    } else if (step === 'selectBranch') {
      providerStore.setAddAppBranchFilter(v => v + text);
      providerStore.setAddAppSelectedBranchIndex(0);
    }
    return true;
  }

  if (providerStore.showConnectProviderModal()) {
    const step = providerStore.connectProviderStep();
    if (step === 'name') providerStore.setConnectProviderName(v => v + text);
    else if (step === 'username') providerStore.setConnectProviderUsername(v => v + text);
    else if (step === 'token') providerStore.setConnectProviderToken(v => v + text);
    return true;
  }

  return false;
}

export function handlePaste(event: PasteEvent, providerStore: ProviderStore): void {
  const text = new TextDecoder().decode(event.bytes);
  routePastedText(text, providerStore);
}
