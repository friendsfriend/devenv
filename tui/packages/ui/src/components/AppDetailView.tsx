import { TextAttributes } from '@opentui/core';
import { Show, For } from 'solid-js';
import { uiColors } from '../colors';
import { ContentFrame } from './ContentStack';
import { DetailSection } from './DetailSection';
import type { App, ChangeRequest, ContainerStats } from '@devenv/types';
import { ScrollableContent } from './ScrollableContent';
import { getStatusStyle } from '../statusUtils';
import { ResourceTimelineCharts } from './ResourceTimelineCharts';

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
}

export function AppDetailView(props: AppDetailViewProps) {
  const formatMB = (bytes: number): string => {
    const mb = Math.round(bytes / (1024 * 1024));
    return `${mb}MB`;
  };

  const recentLogLines = () => props.logs.split('\n').slice(-10);

  const hasDocker = () => props.kind === 'app' || props.kind === 'infra';
  const hasGit = () => props.kind === 'app' || props.kind === 'library';
  const hasCRs = () => props.kind === 'app' || props.kind === 'library';

  const leftWidth = () => {
    if (props.kind === 'library') return '100%';
    if (props.kind === 'infra') return '35%';
    return '50%';
  };

  const rightWidth = () => {
    if (props.kind === 'infra') return '65%';
    return '50%';
  };

  return (
    <ContentFrame>
      <box
        backgroundColor={uiColors.bgBase}
        style={{
          width: '100%',
          flexGrow: 1,
          minHeight: 0,
          flexDirection: 'row',
        }}
      >
        <box
          backgroundColor={uiColors.bgBase}
          style={{
            width: leftWidth(),
            height: '100%',
            flexDirection: 'column',
          }}
        >
        {/* Info Panel */}
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
          <box style={{ paddingLeft: 1, paddingRight: 1, flexShrink: 0 }}>
            <text fg={uiColors.borderHighlight} attributes={TextAttributes.BOLD}>
              {props.app.displayName}
            </text>
          </box>
          <ScrollableContent
            axes={["x", "y"]}
            style={{ width: '100%', flexGrow: 1, minHeight: 0 }}
          >
            <Show when={props.kind !== 'infra'}>
              <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1 }}>
                <text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>Type: </text>
                <text fg={uiColors.textSecondary}>{props.app.appType === 'LIB' ? 'Library' : 'Application'}</text>
              </box>

              <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1 }}>
                <text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>Provider: </text>
                <text fg={uiColors.textSecondary}>{props.app.provider || props.app.sourceType || 'unknown'}</text>
              </box>

              <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1 }}>
                <text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>Repository: </text>
                <text fg={uiColors.textSecondary}>{props.app.repositoryPath}</text>
              </box>
            </Show>

            <Show when={hasGit()}>
              <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1 }}>
                <text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>Branch: </text>
                <Show
                  when={props.gitInfo}
                  fallback={<text fg={uiColors.warning}>Loading...</text>}
                >
                  <text fg={uiColors.textSecondary}>{props.gitInfo?.branch}</text>
                </Show>
              </box>

              <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1 }}>
                <text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>Git Status: </text>
                <Show
                  when={props.gitInfo}
                  fallback={<text fg={uiColors.warning}>Loading...</text>}
                >
                  <text fg={uiColors.textSecondary}>{props.gitInfo?.status}</text>
                </Show>
              </box>
            </Show>

            <Show when={props.kind === 'infra'}>
              <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1 }}>
                <text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>Container: </text>
                <text fg={uiColors.textSecondary}>{props.app.containerBaseName}</text>
              </box>
              <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1 }}>
                <text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>Status: </text>
                <text fg={getStatusStyle(props.app.status || props.app.dockerInfo?.Status || 'unknown').color}>
                  {props.app.status || props.app.dockerInfo?.Status || 'unknown'}
                </text>
              </box>
              <Show when={props.app.dockerInfo?.Ports}>
                <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1 }}>
                  <text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>Ports: </text>
                  <text fg={uiColors.textSecondary}>{props.app.dockerInfo?.Ports}</text>
                </box>
              </Show>
              <Show when={(props.app as any).executionHandle?.pid}>
                <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1 }}>
                  <text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>PID: </text>
                  <text fg={uiColors.textSecondary}>{(props.app as any).executionHandle?.pid}</text>
                </box>
              </Show>
            </Show>

            <Show when={props.kind === 'library'}>
              <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1, marginTop: 1 }}>
                <text fg={uiColors.textMuted}>No container — library only</text>
              </box>
            </Show>
          </ScrollableContent>
        </box>

        <box style={{ width: '100%', height: 1, flexShrink: 0 }} backgroundColor={uiColors.bgBase} />

        {/* CRs Panel — app and library only */}
        <Show when={hasCRs()}>
          <DetailSection
            title="Open Change Requests"
            titleColor={uiColors.borderHighlight}
            style={{
              width: '100%',
              flexGrow: 1,
              flexBasis: 0,
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <ScrollableContent
            axes={["x", "y"]}
              style={{ width: '100%', flexGrow: 1, minHeight: 0 }}
            >
              <Show when={props.changeRequestsLoading}>
                <box style={{ paddingLeft: 1, paddingRight: 1 }}>
                  <text fg={uiColors.warning}>Loading...</text>
                </box>
              </Show>
              <Show when={!props.changeRequestsLoading && props.changeRequests.length === 0}>
                <box style={{ paddingLeft: 1, paddingRight: 1 }}>
                  <text fg={uiColors.textMuted}>No open change requests</text>
                </box>
              </Show>
              <For each={props.changeRequests.slice(0, 5)}>
                {(cr) => (
                  <>
                    <box style={{ paddingLeft: 1, paddingRight: 1 }}>
                      <text fg={uiColors.textPrimary}>!{cr.iid} {cr.title}</text>
                    </box>
                    <box style={{ paddingLeft: 3, paddingRight: 1 }}>
                      <text fg={uiColors.textSecondary}>{cr.source_branch} → {cr.target_branch}</text>
                    </box>
                  </>
                )}
              </For>
            </ScrollableContent>
          </DetailSection>
        </Show>
        </box>

      {/* RIGHT COLUMN — docker only (app and infra) */}
      <Show when={hasDocker()}>
        <box style={{ width: 1, flexShrink: 0 }} backgroundColor={uiColors.bgBase} />
        <box
          backgroundColor={uiColors.bgBase}
          style={{
            width: rightWidth(),
            height: '100%',
            flexDirection: 'column',
          }}
        >
          {/* Stats Panel */}
          <box
            backgroundColor={uiColors.bgMantle}
            style={{
              width: '100%',
              flexGrow: 1,
              flexBasis: 0,
              minHeight: 0,
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <box style={{ paddingLeft: 1, paddingRight: 1, flexShrink: 0 }}>
              <text fg={uiColors.borderHighlight} attributes={TextAttributes.BOLD}>
                Container Stats
              </text>
            </box>
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
          </box>

          <box style={{ width: '100%', height: 1, flexShrink: 0 }} backgroundColor={uiColors.bgBase} />

          {/* Logs Panel */}
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
            <box style={{ paddingLeft: 1, paddingRight: 1, flexShrink: 0 }}>
              <text fg={uiColors.borderHighlight} attributes={TextAttributes.BOLD}>
                Container Logs
              </text>
            </box>
            <ScrollableContent
            axes={["x", "y"]}
              style={{ width: '100%', flexGrow: 1, minHeight: 0 }}
            >
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
          </box>
        </box>
      </Show>
    </box>
    </ContentFrame>
  );
}
