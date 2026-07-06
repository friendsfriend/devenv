import { TextAttributes } from '@opentui/core';
import { For, Show } from 'solid-js';
import type { KubernetesClusterStatus } from '@devenv/types';

import { ScrollableContent } from './ScrollableContent';
import { uiColors } from '../colors';
import { ResourceTimelineCharts } from './ResourceTimelineCharts';

export interface KubernetesClusterViewProps {
  status?: KubernetesClusterStatus | null;
  loading?: boolean;
  error?: string | null;
  cpuHistory?: number[];
  memoryHistory?: number[];
  height?: number;
}

function stateColor(state?: string): string {
  if (state === 'running') return uiColors.success;
  if (state === 'degraded' || state === 'unreachable') return uiColors.warning;
  return uiColors.textMuted;
}

export function kubernetesClusterSummaryLines(status?: KubernetesClusterStatus | null): string[] {
  if (!status) return ['State: missing', 'Live usage unavailable', 'No node data'];
  const lines = [
    `State: ${status.state}`,
    `Name: ${status.clusterName}  Context: ${status.contextName}  Provider: ${status.provider || 'unknown'}`,
    `Exists: ${status.exists ? 'yes' : 'no'}  Reachable: ${status.reachable ? 'yes' : 'no'}  Version: ${status.kubernetesVersion || 'n/a'}`,
  ];
  lines.push(status.stats ? `CPU ${status.stats.cpuPercent.toFixed(1)}%` : 'Live usage unavailable');
  lines.push(`Pods: ${status.pods.total} total, ${status.pods.running} running, ${status.pods.failed} failed`);
  return lines;
}

function formatMB(bytes: number): string {
  const mb = Math.round(bytes / (1024 * 1024));
  return `${mb}MB`;
}

export function KubernetesClusterView(props: KubernetesClusterViewProps) {
  const s = () => props.status;
  const state = () => s()?.state ?? 'missing';
  const stats = () => s()?.stats;

  return (
    <>
      <box
        backgroundColor={uiColors.bgBase}
        style={{
          width: '100%',
          flexGrow: 1,
          minHeight: 0,
          flexDirection: 'row',
        }}
      >
        {/* Left Column — Cluster Info + Resources */}
        <box
          backgroundColor={uiColors.bgBase}
          style={{
            width: '50%',
            height: '100%',
            flexDirection: 'column',
          }}
        >
          {/* Cluster Info Panel */}
          <box
            backgroundColor={uiColors.bgMantle}
            style={{
              width: '100%',
              flexGrow: 1,
              flexBasis: 0,
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <box backgroundColor={uiColors.bgSurface1} style={{ width: '100%', height: 1, flexDirection: 'row', paddingLeft: 1, paddingRight: 1, flexShrink: 0 }}>
              <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>Cluster</text>
              <Show when={props.loading}><text fg={uiColors.textMuted}> refreshing...</text></Show>
            </box>
            <ScrollableContent
              axes={['x', 'y']}
              style={{ width: '100%', flexGrow: 1, minHeight: 0 }}
            >
              <Show when={props.error} fallback={
                <>
                  <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1 }}>
                    <text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>State: </text>
                    <text fg={stateColor(state())}>{state()}</text>
                  </box>
                  <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1 }}>
                    <text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>Name: </text>
                    <text fg={uiColors.textSecondary}>{s()?.clusterName ?? 'devenv'}</text>
                  </box>
                  <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1 }}>
                    <text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>Context: </text>
                    <text fg={uiColors.textSecondary}>{s()?.contextName ?? 'kind-devenv'}</text>
                  </box>
                  <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1 }}>
                    <text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>Provider: </text>
                    <text fg={uiColors.textSecondary}>{s()?.provider || 'unknown'}</text>
                  </box>
                  <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1 }}>
                    <text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>Exists: </text>
                    <text fg={uiColors.textSecondary}>{s()?.exists ? 'yes' : 'no'}</text>
                  </box>
                  <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1 }}>
                    <text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>Reachable: </text>
                    <text fg={uiColors.textSecondary}>{s()?.reachable ? 'yes' : 'no'}</text>
                  </box>
                  <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1 }}>
                    <text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>Version: </text>
                    <text fg={uiColors.textSecondary}>{s()?.kubernetesVersion || 'n/a'}</text>
                  </box>
                </>
              }>
                <box style={{ paddingLeft: 1, paddingRight: 1 }}>
                  <text fg={uiColors.error}>Error: {props.error}</text>
                </box>
              </Show>
            </ScrollableContent>
          </box>

          {/* Resources Panel */}
          <box
            backgroundColor={uiColors.bgMantle}
            style={{
              width: '100%',
              flexGrow: 1,
              flexBasis: 0,
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <box backgroundColor={uiColors.bgSurface1} style={{ width: '100%', height: 1, flexDirection: 'row', paddingLeft: 1, paddingRight: 1, flexShrink: 0 }}>
              <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
                Resources
              </text>
            </box>
            <Show when={stats() !== undefined} fallback={
              <box style={{ paddingLeft: 1, paddingRight: 1, flexGrow: 1 }}>
                <text fg={uiColors.textMuted}>No container resources — cluster may be missing or using podman</text>
              </box>
            }>
              {(() => {
                const st = stats()!;
                return (
                  <ResourceTimelineCharts
                    cpu={{
                      title: 'CPU',
                      value: `${st.cpuPercent.toFixed(1)}%`,
                      values: props.cpuHistory ?? [],
                      color: uiColors.primary,
                    }}
                    memory={{
                      title: 'MEM',
                      value: `${formatMB(st.memoryUsageBytes)}/${formatMB(st.memoryLimitBytes)}`,
                      values: props.memoryHistory ?? [],
                      color: uiColors.success,
                    }}
                  />
                );
              })()}
            </Show>
          </box>
        </box>

        {/* Right Column — Nodes + Workloads + Warnings */}
        <box
          backgroundColor={uiColors.bgBase}
          style={{
            width: '50%',
            height: '100%',
            flexDirection: 'column',
          }}
        >
          {/* Nodes Panel */}
          <box
            backgroundColor={uiColors.bgMantle}
            style={{
              width: '100%',
              flexGrow: 1,
              flexBasis: 0,
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <box backgroundColor={uiColors.bgSurface1} style={{ width: '100%', height: 1, flexDirection: 'row', paddingLeft: 1, paddingRight: 1, flexShrink: 0 }}>
              <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
                Nodes
              </text>
            </box>
            <ScrollableContent
              axes={['x', 'y']}
              style={{ width: '100%', flexGrow: 1, minHeight: 0 }}
            >
              <Show when={(s()?.nodes.length ?? 0) > 0} fallback={
                <box style={{ paddingLeft: 1, paddingRight: 1 }}>
                  <text fg={uiColors.textMuted}>No node data</text>
                </box>
              }>
                <For each={s()?.nodes ?? []}>{(node) => (
                  <box style={{ paddingLeft: 1, paddingRight: 1 }}>
                    <text fg={node.ready ? uiColors.success : uiColors.error}>{node.ready ? '✓' : '×'}</text>
                    <text fg={uiColors.textSecondary}>  {node.name}</text>
                    <Show when={node.kubeletVersion}>
                      <text fg={uiColors.textMuted}>  {node.kubeletVersion}</text>
                    </Show>
                  </box>
                )}</For>
              </Show>
            </ScrollableContent>
          </box>

          {/* Workloads Panel */}
          <box
            backgroundColor={uiColors.bgMantle}
            style={{
              width: '100%',
              flexGrow: 1,
              flexBasis: 0,
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <box backgroundColor={uiColors.bgSurface1} style={{ width: '100%', height: 1, flexDirection: 'row', paddingLeft: 1, paddingRight: 1, flexShrink: 0 }}>
              <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
                Workloads
              </text>
            </box>
            <ScrollableContent
              axes={['x', 'y']}
              style={{ width: '100%', flexGrow: 1, minHeight: 0 }}
            >
              <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1 }}>
                <text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>Pods: </text>
                <text fg={uiColors.textSecondary}>{s()?.pods.total ?? 0} total, {s()?.pods.running ?? 0} running, {s()?.pods.failed ?? 0} failed</text>
              </box>
              <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1 }}>
                <text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>Namespaces: </text>
                <text fg={uiColors.textSecondary}>{(s()?.namespaces ?? []).map((ns) => `${ns.name}(${ns.pods})`).join(', ') || 'none'}</text>
              </box>
              <Show when={(s()?.releases.length ?? 0) > 0} fallback={
                <box style={{ paddingLeft: 1, paddingRight: 1 }}>
                  <text fg={uiColors.textMuted}>No DevEnv Helm releases</text>
                </box>
              }>
                <For each={s()?.releases ?? []}>{(release) => (
                  <box style={{ paddingLeft: 1, paddingRight: 1 }}>
                    <text fg={uiColors.textSecondary}>{release.namespace}/{release.name}</text>
                    <text fg={uiColors.textMuted}>  {release.status} {release.chart || ''}</text>
                  </box>
                )}</For>
              </Show>
            </ScrollableContent>
          </box>


        </box>
      </box>
    </>
  );
}
