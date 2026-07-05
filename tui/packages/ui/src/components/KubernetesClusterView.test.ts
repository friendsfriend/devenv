import { describe, expect, test } from 'bun:test';
import type { KubernetesClusterStatus } from '@devenv/types';
import { kubernetesClusterSummaryLines } from './KubernetesClusterView';

const base: KubernetesClusterStatus = {
  clusterName: 'devenv',
  contextName: 'kind-devenv',
  provider: 'docker',
  exists: false,
  reachable: false,
  state: 'missing',
  nodes: [],
  namespaces: [],
  pods: { total: 0, running: 0, pending: 0, succeeded: 0, failed: 0, unknown: 0 },
  releases: [],
  collectedAt: '2026-01-01T00:00:00Z',
};

describe('kubernetesClusterSummaryLines', () => {
  test('snapshots missing state', () => {
    expect(kubernetesClusterSummaryLines(base)).toMatchSnapshot();
  });

  test('snapshots running state with stats', () => {
    expect(kubernetesClusterSummaryLines({
      ...base,
      exists: true,
      reachable: true,
      state: 'running',
      kubernetesVersion: 'v1.29.0',
      pods: { total: 3, running: 3, pending: 0, succeeded: 0, failed: 0, unknown: 0 },
      stats: { cpuPercent: 12.3, memoryUsageBytes: 1, memoryLimitBytes: 2, memoryPercent: 50, nodes: [], collectedAt: base.collectedAt },
    })).toMatchSnapshot();
  });

  test('snapshots degraded stats-unavailable state', () => {
    expect(kubernetesClusterSummaryLines({
      ...base,
      exists: true,
      reachable: true,
      state: 'degraded',
      pods: { total: 2, running: 1, pending: 0, succeeded: 0, failed: 1, unknown: 0 },
      warnings: ['stats unavailable'],
    })).toMatchSnapshot();
  });
});
