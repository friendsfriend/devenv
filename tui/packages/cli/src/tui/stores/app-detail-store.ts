import { createSignal } from 'solid-js';
import type { App, ContainerStats, MergeRequest } from '@devenv/types';
import type { AppDetailKind } from '@devenv/ui';

export function createAppDetailStore() {
  const [appDetailApp, setAppDetailApp] = createSignal<App | undefined>(undefined);
  const [appDetailGitInfo, setAppDetailGitInfo] = createSignal<{ branch: string; status: string } | undefined>(undefined);
  const [appDetailMRs, setAppDetailMRs] = createSignal<MergeRequest[]>([]);
  const [appDetailMRsLoading, setAppDetailMRsLoading] = createSignal(false);
  const [appDetailLogs, setAppDetailLogs] = createSignal('');
  const [appDetailStatsHistory, setAppDetailStatsHistory] = createSignal<number[]>([]);
  const [appDetailMemHistory, setAppDetailMemHistory] = createSignal<number[]>([]);
  const [appDetailLatestStats, setAppDetailLatestStats] = createSignal<ContainerStats | undefined>(undefined);
  const [appDetailLoading, setAppDetailLoading] = createSignal(false);
  const [appDetailKind, setAppDetailKind] = createSignal<AppDetailKind>('app');

  return {
    appDetailApp,
    setAppDetailApp,
    appDetailGitInfo,
    setAppDetailGitInfo,
    appDetailMRs,
    setAppDetailMRs,
    appDetailMRsLoading,
    setAppDetailMRsLoading,
    appDetailLogs,
    setAppDetailLogs,
    appDetailStatsHistory,
    setAppDetailStatsHistory,
    appDetailMemHistory,
    setAppDetailMemHistory,
    appDetailLatestStats,
    setAppDetailLatestStats,
    appDetailLoading,
    setAppDetailLoading,
    appDetailKind,
    setAppDetailKind,
  };
}

export type AppDetailStore = ReturnType<typeof createAppDetailStore>;
