import { TextAttributes } from '@opentui/core';
import { For, Show, createMemo } from 'solid-js';
import { useTerminalDimensions } from '@opentui/solid';
import type { KubernetesClusterStatus } from '@devenv/types';

import { ScrollableContent } from './ScrollableContent';
import { uiColors } from '../colors';

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

function toHalfBlockSparkline(values: number[], width: number): { topRow: string; bottomRow: string } {
  const topChars = [' ', '▂', '▄', '▆', '█'];
  const botChars = [' ', '▂', '▄', '▆', '█'];
  if (values.length === 0) return { topRow: ' '.repeat(width), bottomRow: ' '.repeat(width) };
  const display = values.length > width ? values.slice(-width) : values;
  const pad = width - display.length;
  let top = '';
  let bot = '';
  for (const value of display) {
    const clamped = Math.max(0, Math.min(100, value));
    const height = Math.round((clamped / 100) * 8);
    const botLevel = height === 0 ? 1 : Math.min(height, 4);
    const topLevel = Math.max(0, height - 4);
    bot += botChars[botLevel];
    top += topChars[topLevel];
  }
  return { topRow: ' '.repeat(pad) + top, bottomRow: ' '.repeat(pad) + bot };
}

function formatMB(bytes: number): string {
  const mb = Math.round(bytes / (1024 * 1024));
  return `${mb}MB`;
}

export function KubernetesClusterView(props: KubernetesClusterViewProps) {
  const s = () => props.status;
  const state = () => s()?.state ?? 'missing';
  const stats = () => s()?.stats;
  const dimensions = useTerminalDimensions();
  const labelWidth = 5;
  const sparklineWidth = createMemo(() => {
    const termWidth = dimensions().width;
    const panelWidth = Math.floor(termWidth * 0.5);
    return Math.max(5, panelWidth - 4 - labelWidth);
  });

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
              <text fg={stateColor(state())} attributes={TextAttributes.BOLD}>Cluster</text>
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
            <ScrollableContent
              axes={['x', 'y']}
              style={{ width: '100%', flexGrow: 1, minHeight: 0 }}
            >
              <Show when={stats() !== undefined} fallback={
                <box style={{ paddingLeft: 1, paddingRight: 1 }}>
                  <text fg={uiColors.textMuted}>No container resources — cluster may be missing or using podman</text>
                </box>
              }>
                {(() => {
                  const st = stats()!;
                  const cpuSpark = () => toHalfBlockSparkline(props.cpuHistory ?? [], sparklineWidth());
                  const memSpark = () => toHalfBlockSparkline(props.memoryHistory ?? [], sparklineWidth());
                  return (
                    <>
                      <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1, height: 1 }}>
                        <box style={{ width: labelWidth, flexShrink: 0 }}>
                          <text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>CPU  </text>
                        </box>
                        <box style={{ flexGrow: 1, flexShrink: 0, marginLeft: 1 }}>
                          <text fg={uiColors.primary}>{cpuSpark().topRow}</text>
                        </box>
                      </box>
                      <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1, height: 1 }}>
                        <box style={{ width: labelWidth, flexShrink: 0 }}>
                          <text fg={uiColors.textSecondary}>{st.cpuPercent.toFixed(1)}%</text>
                        </box>
                        <box style={{ flexGrow: 1, flexShrink: 0, marginLeft: 1 }}>
                          <text fg={uiColors.primary}>{cpuSpark().bottomRow}</text>
                        </box>
                      </box>
                      <box style={{ height: 1 }} />
                      <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1, height: 1 }}>
                        <box style={{ width: labelWidth, flexShrink: 0 }}>
                          <text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>MEM  </text>
                        </box>
                        <box style={{ flexGrow: 1, flexShrink: 0, marginLeft: 1 }}>
                          <text fg={uiColors.success}>{memSpark().topRow}</text>
                        </box>
                      </box>
                      <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1, height: 1 }}>
                        <box style={{ width: labelWidth, flexShrink: 0 }}>
                          <text fg={uiColors.textSecondary}>{formatMB(st.memoryUsageBytes)}/{formatMB(st.memoryLimitBytes)}</text>
                        </box>
                        <box style={{ flexGrow: 1, flexShrink: 0, marginLeft: 1 }}>
                          <text fg={uiColors.success}>{memSpark().bottomRow}</text>
                        </box>
                      </box>
                    </>
                  );
                })()}
              </Show>
            </ScrollableContent>
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
