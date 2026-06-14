import { createSignal } from 'solid-js';
import type { AddAppStep, FindRepoMode, ConnectProviderStep } from '@devenv/ui';
import type { Provider, ProviderType, RepoSearchResult } from '@devenv/types';

export function createProviderStore() {
  const [providers, setProviders] = createSignal<Provider[]>([]);
  const [providersLoading, setProvidersLoading] = createSignal(false);
  const [providersError, setProvidersError] = createSignal('');
  const [showConnectProviderModal, setShowConnectProviderModal] = createSignal(false);
  const [connectProviderStep, setConnectProviderStep] = createSignal<ConnectProviderStep>('selectProvider');
  const [connectProviderType, setConnectProviderType] = createSignal<ProviderType | null>(null);
  const [connectProviderIndex, setConnectProviderIndex] = createSignal(0);
  const [connectProviderName, setConnectProviderName] = createSignal('');
  const [connectProviderUsername, setConnectProviderUsername] = createSignal('');
  const [connectProviderToken, setConnectProviderToken] = createSignal('');
  const [connectProviderError, setConnectProviderError] = createSignal<string | null>(null);
  const [connectProviderSuccess, setConnectProviderSuccess] = createSignal<string | null>(null);
  const [connectProviderEditMode, setConnectProviderEditMode] = createSignal(false);
  const [showAddAppModal, setShowAddAppModal] = createSignal(false);
  const [addAppStep, setAddAppStep] = createSignal<AddAppStep>('selectProvider');
  const [addAppProviders, setAddAppProviders] = createSignal<Array<{ name: string; type: string }>>([]);
  const [addAppSelectedProviderIndex, setAddAppSelectedProviderIndex] = createSignal(0);
  const [addAppSearchQuery, setAddAppSearchQuery] = createSignal('');
  const [addAppSearchResults, setAddAppSearchResults] = createSignal<RepoSearchResult[]>([]);
  const [addAppSelectedResultIndex, setAddAppSelectedResultIndex] = createSignal(0);
  const [addAppManualUrl, setAddAppManualUrl] = createSignal('');
  const [addAppFindRepoMode, setAddAppFindRepoMode] = createSignal<FindRepoMode>('selectMode');
  const [addAppFindRepoModeIndex, setAddAppFindRepoModeIndex] = createSignal(0);
  const [addAppName, setAddAppName] = createSignal('');
  const [addAppBranches, setAddAppBranches] = createSignal<string[]>([]);
  const [addAppSelectedBranchIndex, setAddAppSelectedBranchIndex] = createSignal(0);
  const [addAppBranchFilter, setAddAppBranchFilter] = createSignal('');
  const [addAppLoading, setAddAppLoading] = createSignal(false);
  const [addAppError, setAddAppError] = createSignal<string | null>(null);
  const [addAppAppType, setAddAppAppType] = createSignal<'APP' | 'LIB'>('APP');
  const [addAppAppTypeIndex, setAddAppAppTypeIndex] = createSignal(0);
  const [selectedProviderIndex, setSelectedProviderIndex] = createSignal(0);

  return {
    providers,
    setProviders,
    providersLoading,
    setProvidersLoading,
    providersError,
    setProvidersError,
    showConnectProviderModal,
    setShowConnectProviderModal,
    connectProviderStep,
    setConnectProviderStep,
    connectProviderType,
    setConnectProviderType,
    connectProviderIndex,
    setConnectProviderIndex,
    connectProviderName,
    setConnectProviderName,
    connectProviderUsername,
    setConnectProviderUsername,
    connectProviderToken,
    setConnectProviderToken,
    connectProviderError,
    setConnectProviderError,
    connectProviderSuccess,
    setConnectProviderSuccess,
    connectProviderEditMode,
    setConnectProviderEditMode,
    showAddAppModal,
    setShowAddAppModal,
    addAppStep,
    setAddAppStep,
    addAppProviders,
    setAddAppProviders,
    addAppSelectedProviderIndex,
    setAddAppSelectedProviderIndex,
    addAppSearchQuery,
    setAddAppSearchQuery,
    addAppSearchResults,
    setAddAppSearchResults,
    addAppSelectedResultIndex,
    setAddAppSelectedResultIndex,
    addAppManualUrl,
    setAddAppManualUrl,
    addAppFindRepoMode,
    setAddAppFindRepoMode,
    addAppFindRepoModeIndex,
    setAddAppFindRepoModeIndex,
    addAppName,
    setAddAppName,
    addAppBranches,
    setAddAppBranches,
    addAppSelectedBranchIndex,
    setAddAppSelectedBranchIndex,
    addAppBranchFilter,
    setAddAppBranchFilter,
    addAppLoading,
    setAddAppLoading,
    addAppError,
    setAddAppError,
    addAppAppType,
    setAddAppAppType,
    addAppAppTypeIndex,
    setAddAppAppTypeIndex,
    selectedProviderIndex,
    setSelectedProviderIndex,
  };
}

export type ProviderStore = ReturnType<typeof createProviderStore>;
