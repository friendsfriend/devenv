/** @jsxImportSource @opentui/solid */
import { TextAttributes } from '@opentui/core';
import { Show, For } from 'solid-js';
import { uiColors } from '../colors';
import { ContentFrame } from './ContentStack';
import { DetailSection } from './DetailSection';
import type { ActionTarget, App, ChangeRequest, ContainerStats } from '@devenv/types';
import { ScrollableContent } from './ScrollableContent';
import { ResourceTimelineCharts } from './ResourceTimelineCharts';
import { PropertiesList, propertyBadges, type PropertyRow } from './PropertiesList';
import { DependencyTreeView } from './DependencyTreeView';

export type AppDetailKind = 'app' | 'library' | 'infra';

interface AppDetailViewProps {
  app: App;
  kind: AppDetailKind;
  gitInfo?: { branch: string; status: string };
  changeRequests: ChangeRequest[];
  logs: string;
  statsHistory: number[];
  memHistory: number[];
  latestStats?: ContainerStats;
  loading: boolean;
  changeRequestsLoading: boolean;
  actionTargets: ActionTarget[];
  actionTargetsLoading: boolean;
  dependencyTreeNodes: any[];
  dependencyTreeFocused: boolean;
  dependencyTreeSelectedIndex: number;
  onDependencyNodeClick?: (node: any, flatIndex: number) => void;
}

function roughDurationSince(startedAt: string): string | null {
  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime())) return null;
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${Math.max(1, seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function appRunTargetDetailRows(app: App): Array<{ label: string; value: string }> {
  const info = app.runTargetInfo;
  if (!info?.display) return [];
  const rows: Array<{ label: string; value: string }> = [];
  if (info.startedAt) {
    const date = new Date(info.startedAt);
    if (!Number.isNaN(date.getTime())) {
      rows.push({ label: 'Since', value: `${roughDurationSince(info.startedAt)} (${date.toLocaleString()})` });
    }
  }
  return rows;
}

export function AppDetailView(props: AppDetailViewProps) {
  const formatMB = (bytes: number): string => {
    const mb = Math.round(bytes / (1024 * 1024));
    return `${mb}MB`;
  };

  const recentLogLines = () => props.logs.split('\n').slice(-200);

  const runTargetRows = () => appRunTargetDetailRows(props.app);
  const providerIcon = () => {
    const sourceType = props.app.sourceType || props.app.provider;
    if (sourceType === 'github') return '';
    if (sourceType === 'gitlab') return '';
    return '';
  };
  const runTargetLabel = () => props.app.runTargetInfo?.display;
  const statusText = () => props.app.status || props.app.dockerInfo?.Status || 'unknown';
  const statusHighlight = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes('running') || normalized.includes('healthy') || normalized === 'up') return 'positive' as const;
    if (normalized.includes('error') || normalized.includes('failed') || normalized.includes('exited') || normalized.includes('dead')) return 'negative' as const;
    if (normalized.includes('starting') || normalized.includes('restarting') || normalized.includes('warning')) return 'warning' as const;
    return 'secondary' as const;
  };
  const gitStatusHighlight = () => {
    if (!props.gitInfo) return 'warning' as const;
    const status = props.gitInfo.status.toLowerCase();
    if (status === 'clean' || status.includes('clean')) return 'secondary' as const;
    return 'warning' as const;
  };

  const overviewRows = (): PropertyRow[] => {
    const rows: PropertyRow[] = [];

    if (hasDocker()) {
      const status = statusText();
      rows.push({ label: 'Status', value: propertyBadges([{ label: status, highlight: statusHighlight(status) }]) });
      if (props.app.containerBaseName) rows.push({ label: 'Container', value: props.app.containerBaseName });
    } else {
      rows.push({ label: 'Runtime', value: 'No container — library only', valueHighlight: 'secondary' });
    }

    if (props.kind === 'app') rows.push(...runTargetRows());
    if (props.kind === 'infra') {
      if (props.app.dockerInfo?.Ports) rows.push({ label: 'Ports', value: props.app.dockerInfo.Ports });
      if ((props.app as any).executionHandle?.pid) rows.push({ label: 'PID', value: (props.app as any).executionHandle.pid });
    }

    if (hasGit()) {
      rows.push(
        {
          label: 'Branch',
          value: props.gitInfo?.branch ?? 'Loading...',
          valueHighlight: props.gitInfo ? 'primary' : 'warning',
        },
        {
          label: 'Git Status',
          value: props.gitInfo?.status ?? 'Loading...',
          valueHighlight: gitStatusHighlight(),
        },
      );
    }

    if (props.kind !== 'infra') {
      rows.push(
        ...(props.app.runTargetInfo?.sourcePath ? [{ label: 'Source', value: props.app.runTargetInfo.sourcePath, valueHighlight: 'secondary' as const }] : []),
        { label: 'Repository', value: props.app.repositoryPath },
        { label: 'Provider', value: props.app.provider || props.app.sourceType || 'unknown', valueHighlight: 'secondary' },
      );
    }

    return rows;
  };

  const hasDocker = () => props.kind === 'app' || props.kind === 'infra';
  const hasGit = () => props.kind === 'app' || props.kind === 'library';

  const overviewWidth = () => {
    if (!hasDocker()) return '100%';
    if (props.kind === 'infra') return '35%';
    return '50%';
  };

  const statsWidth = () => {
    if (props.kind === 'infra') return '65%';
    return '50%';
  };

  // ── Dependency tree ───────────────────────────────────────────────────────
  const hasDependencies = () => props.actionTargets.length > 0 && props.kind === 'app';

  return (
    <ContentFrame>
      <box
        backgroundColor={uiColors.bgBase}
        style={{
          width: '100%',
          flexGrow: 1,
          minHeight: 0,
          flexDirection: 'column',
        }}
      >
        {/* ── Overview row (info + stats) ──────────────────────────────────── */}
        <box
          backgroundColor={uiColors.bgBase}
          style={{
            width: '100%',
            height: hasDocker() ? '35%' : '100%',
            flexGrow: hasDocker() ? 0 : 1,
            minHeight: 0,
            flexDirection: 'row',
          }}
        >
          {/* Info Panel */}
          <DetailSection
            header={
              <box style={{ flexDirection: 'row', width: '100%' }}>
                <Show when={providerIcon()}>
                  <text fg={uiColors.textSecondary}>{providerIcon()} </text>
                </Show>
                <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>{props.app.displayName}</text>
                <Show when={runTargetLabel()}>
                  <text fg={uiColors.highlight} attributes={TextAttributes.BOLD}> {runTargetLabel()}</text>
                </Show>
              </box>
            }
            style={{
              width: overviewWidth(),
              height: '100%',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <ScrollableContent axes={["x", "y"]} style={{ width: '100%', flexGrow: 1, minHeight: 0 }}>
              <PropertiesList rows={overviewRows()} labelWidth={12} />
            </ScrollableContent>
          </DetailSection>

          <Show when={hasDocker()}>
            <box style={{ width: 1, flexShrink: 0 }} backgroundColor={uiColors.bgBase} />

            {/* Stats Panel */}
            <DetailSection
              title="Container Stats"
              style={{
                width: statsWidth(),
                height: '100%',
                minHeight: 0,
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <Show
                when={props.latestStats}
                fallback={
                  <box style={{ paddingLeft: 1, paddingRight: 1, flexGrow: 1 }}>
                    <text fg={uiColors.textMuted}>No container running</text>
                  </box>
                }
              >
                {(stats) => (
                  <ResourceTimelineCharts
                    cpu={{
                      title: 'CPU',
                      value: `${stats().cpuPercent.toFixed(1)}%`,
                      values: props.statsHistory,
                      color: uiColors.primary,
                    }}
                    memory={{
                      title: 'MEM',
                      value: `${formatMB(stats().memoryUsage)}/${formatMB(stats().memoryLimit)}`,
                      values: props.memHistory,
                      color: uiColors.success,
                    }}
                  />
                )}
              </Show>
            </DetailSection>
          </Show>
        </box>

        {/* ── Dependency tree (apps only, when deps exist) ──────────────────── */}
        <Show when={hasDependencies()}>
          <box style={{ width: '100%', height: 1, flexShrink: 0 }} backgroundColor={uiColors.bgBase} />
          <DetailSection
            title="Dependencies"
            style={{
              width: '100%',
              height: '30%',
              flexGrow: 0,
              flexShrink: 0,
              minHeight: 0,
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <Show
              when={!props.actionTargetsLoading}
              fallback={
                <box style={{ paddingLeft: 1, paddingRight: 1, flexGrow: 1 }}>
                  <text fg={uiColors.textMuted}>Loading dependencies…</text>
                </box>
              }
            >
              <DependencyTreeView
                nodes={props.dependencyTreeNodes}
                selectedIndex={props.dependencyTreeSelectedIndex}
                focused={props.dependencyTreeFocused}
                onNodeClick={props.onDependencyNodeClick}
              />
            </Show>
          </DetailSection>
        </Show>

        <Show when={hasDocker()}>
          <box style={{ width: '100%', height: 1, flexShrink: 0 }} backgroundColor={uiColors.bgBase} />

          {/* Logs Panel */}
          <DetailSection
            title="Container Logs"
            style={{
              width: '100%',
              flexGrow: 1,
              flexBasis: 0,
              minHeight: 0,
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <ScrollableContent axes={["x", "y"]} style={{ width: '100%', flexGrow: 1, minHeight: 0 }}>
              <Show
                when={props.logs.trim().length > 0}
                fallback={
                  <box style={{ paddingLeft: 1, paddingRight: 1 }}>
                    <text fg={uiColors.textMuted}>No logs available</text>
                  </box>
                }
              >
                <For each={recentLogLines()}>
                  {(line) => (
                    <box style={{ paddingLeft: 1, paddingRight: 1 }}>
                      <text fg={uiColors.textSecondary}>{line}</text>
                    </box>
                  )}
                </For>
              </Show>
            </ScrollableContent>
          </DetailSection>
        </Show>
      </box>
    </ContentFrame>
  );
}
