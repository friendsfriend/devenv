import type { DevEnvClient } from '@devenv/core';
import type { CreateAppRequest } from '@devenv/types';
import type { AppStore } from '../stores/app-store';
import type { ProviderStore } from '../stores/provider-store';

export function createProviderActions(
  appStore: AppStore,
  providerStore: ProviderStore,
  client: DevEnvClient,
  showError: (title: string, message: string) => void,
) {
  const refreshProviders = async () => {
    providerStore.setProvidersLoading(true);
    providerStore.setProvidersError('');
    try {
      providerStore.setProviders(await client.getProviders());
    } catch (e) {
      providerStore.setProvidersError(e instanceof Error ? e.message : 'Unknown error');
      providerStore.setProviders([]);
    } finally {
      providerStore.setProvidersLoading(false);
    }
  };

  const loadProviders = async () => {
    if (appStore.operationInProgressForApp()) return showError('Operation In Progress', 'Another operation is already in progress. Please wait for it to complete.');
    appStore.setViewMode('providers');
    await refreshProviders();
  };

  const resetConnectProviderModal = () => {
    providerStore.setShowConnectProviderModal(false);
    providerStore.setConnectProviderStep('selectProvider');
    providerStore.setConnectProviderType(null);
    providerStore.setConnectProviderIndex(0);
    providerStore.setConnectProviderName('');
    providerStore.setConnectProviderUsername('');
    providerStore.setConnectProviderToken('');
    providerStore.setConnectProviderError(null);
    providerStore.setConnectProviderSuccess(null);
    providerStore.setConnectProviderEditMode(false);
  };

  const resetAddAppModal = () => {
    providerStore.setShowAddAppModal(false);
    providerStore.setAddAppStep('selectProvider');
    providerStore.setAddAppProviders([]);
    providerStore.setAddAppSelectedProviderIndex(0);
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
    providerStore.setAddAppLoading(false);
    providerStore.setAddAppError(null);
    providerStore.setAddAppAppType('APP');
    providerStore.setAddAppAppTypeIndex(0);
  };

  const openAddAppModal = async () => {
    resetAddAppModal();
    const tab = appStore.activeTab();
    providerStore.setAddAppAppTypeIndex(tab === 'libraries' ? 1 : 0);
    providerStore.setAddAppAppType(tab === 'libraries' ? 'LIB' : 'APP');
    providerStore.setAddAppLoading(true);
    providerStore.setShowAddAppModal(true);
    try {
      const providers = await client.getProviders();
      providerStore.setAddAppProviders(providers.map((p) => ({ name: p.name, type: p.type })));
      if (providers.length === 0) providerStore.setAddAppError('No providers configured. Add a provider first.');
    } catch (e) {
      providerStore.setAddAppError(e instanceof Error ? e.message : 'Failed to load providers');
    } finally {
      providerStore.setAddAppLoading(false);
    }
  };

  const addAppPerformSearch = async () => {
    const query = providerStore.addAppSearchQuery().trim();
    if (!query) return;
    const providers = providerStore.addAppProviders();
    const idx = providerStore.addAppSelectedProviderIndex();
    if (idx < 0 || idx >= providers.length) return;
    const provider = providers[idx];
    providerStore.setAddAppLoading(true);
    providerStore.setAddAppError(null);
    try {
      const results = await client.searchRepos(provider.name, query);
      providerStore.setAddAppSearchResults(results);
      providerStore.setAddAppSelectedResultIndex(0);
      if (!results.length) providerStore.setAddAppError('No repositories found');
    } catch (e) {
      providerStore.setAddAppError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      providerStore.setAddAppLoading(false);
    }
  };

  const addAppFetchBranches = async (repoUrl: string) => {
    providerStore.setAddAppLoading(true);
    providerStore.setAddAppError(null);
    try {
      const branches = await client.getRepoBranches(repoUrl);
      providerStore.setAddAppBranches(branches);
      providerStore.setAddAppSelectedBranchIndex(0);
      if (!branches.length) providerStore.setAddAppError('No branches found');
    } catch (e) {
      providerStore.setAddAppError(e instanceof Error ? e.message : 'Failed to load branches');
    } finally {
      providerStore.setAddAppLoading(false);
    }
  };

  const addAppSubmitCreate = async () => {
    const providers = providerStore.addAppProviders();
    const providerIdx = providerStore.addAppSelectedProviderIndex();
    if (providerIdx < 0 || providerIdx >= providers.length) return;
    const repoUrl = providerStore.addAppFindRepoMode() === 'url'
      ? providerStore.addAppManualUrl().trim()
      : providerStore.addAppSearchResults()[providerStore.addAppSelectedResultIndex()]?.url ?? '';
    const filteredBranchList = providerStore.addAppBranches().filter((b) => b.toLowerCase().includes(providerStore.addAppBranchFilter().toLowerCase()));
    const branch = filteredBranchList[providerStore.addAppSelectedBranchIndex()] ?? '';
    if (!providerStore.addAppName().trim() || !repoUrl || !branch) {
      providerStore.setAddAppError('Missing required fields');
      return;
    }
    providerStore.setAddAppLoading(true);
    providerStore.setAddAppError(null);
    try {
      const request: CreateAppRequest = {
        displayName: providerStore.addAppName().trim(),
        repositoryURL: repoUrl,
        branch,
        provider: providers[providerIdx].name,
        appType: providerStore.addAppAppType(),
      };
      const newApp = await client.createApp(request);
      resetAddAppModal();
      appStore.setApps((prev) => [...prev, { ...newApp, operationStatus: { operation: 'checkout', status: 'active', message: 'Checking out...' } }]);
      const fetchedApps = await client.getApps();
      appStore.setApps((prev) => {
        const statusMap = new Map(prev.filter((a) => a.operationStatus).map((a) => [a.ident, a.operationStatus!]));
        return fetchedApps.map((a) => (statusMap.has(a.ident) ? { ...a, operationStatus: statusMap.get(a.ident) } : a));
      });
    } catch (e) {
      providerStore.setAddAppError(e instanceof Error ? e.message : 'Failed to create app');
      providerStore.setAddAppLoading(false);
    }
  };

  const openAddProviderModal = () => {
    resetConnectProviderModal();
    providerStore.setShowConnectProviderModal(true);
  };

  const openEditProviderModal = () => {
    const list = providerStore.providers();
    const idx = providerStore.selectedProviderIndex();
    if (idx < 0 || idx >= list.length) return;
    const provider = list[idx];
    if (!provider) return;
    resetConnectProviderModal();
    providerStore.setConnectProviderEditMode(true);
    providerStore.setConnectProviderType(provider.type);
    providerStore.setConnectProviderName(provider.name);
    providerStore.setConnectProviderUsername(provider.username);
    providerStore.setConnectProviderStep('username');
    providerStore.setShowConnectProviderModal(true);
  };

  const deleteSelectedProvider = async () => {
    const list = providerStore.providers();
    const idx = providerStore.selectedProviderIndex();
    if (idx < 0 || idx >= list.length) return;
    const provider = list[idx];
    if (!provider) return;
    try {
      await client.deleteProvider(provider.name);
      const fetched = await client.getProviders();
      providerStore.setProviders(fetched);
      if (providerStore.selectedProviderIndex() >= fetched.length) providerStore.setSelectedProviderIndex(Math.max(0, fetched.length - 1));
    } catch (e) {
      showError('Delete Provider Failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const saveProvider = async () => {
    const providerType = providerStore.connectProviderType();
    const name = providerStore.connectProviderName().trim();
    const username = providerStore.connectProviderUsername().trim();
    const token = providerStore.connectProviderToken();
    if (!providerType || !name) {
      providerStore.setConnectProviderError('Provider type and name are required');
      return;
    }
    try {
      if (providerStore.connectProviderEditMode()) {
        const updates: Record<string, string> = { username };
        if (token) updates.token = token;
        await client.updateProvider(name, updates);
      } else {
        await client.createProvider({ name, type: providerType, username, token });
      }
      providerStore.setConnectProviderSuccess(providerStore.connectProviderEditMode() ? 'Provider updated!' : 'Provider created!');
      providerStore.setProviders(await client.getProviders());
      setTimeout(() => resetConnectProviderModal(), 800);
    } catch (e) {
      providerStore.setConnectProviderError(e instanceof Error ? e.message : 'Failed to save provider');
    }
  };

  return {
    loadProviders,
    refreshProviders,
    resetConnectProviderModal,
    resetAddAppModal,
    openAddAppModal,
    addAppPerformSearch,
    addAppFetchBranches,
    addAppSubmitCreate,
    openAddProviderModal,
    openEditProviderModal,
    deleteSelectedProvider,
    saveProvider,
  };
}

export type ProviderActions = ReturnType<typeof createProviderActions>;
