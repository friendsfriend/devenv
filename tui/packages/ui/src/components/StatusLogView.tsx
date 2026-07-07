/** @jsxImportSource @opentui/solid */
import { For, Show, createMemo } from 'solid-js';
import { useTerminalDimensions } from '@opentui/solid';
import { TextAttributes } from '@opentui/core';
import type { StatusLogEntry } from '@devenv/types';
import { uiColors } from '../colors';
import { highlightColor, HighlightedText } from './Highlight';
import { SearchHeader } from './SearchHeader';
import { FilterStatusBar } from './FilterStatusBar';
import { CenteredState } from './CenteredState';
import { RunningText } from './RunningText';
import { ScrollableContent } from './ScrollableContent';

export interface StatusLogViewProps {
  entries: StatusLogEntry[];
  height?: number;
  width?: number;
  isMaximized?: boolean;
  searchMode?: boolean;
  searchQuery?: string;
  sortDesc?: boolean;
  filterSummary?: string;
  sortSummary?: string;
  runningTextEnabled?: boolean;
  runningTextOffset?: number;
}

function statusHighlight(status: string): 'positive' | 'negative' | 'secondary' {
  switch (status) {
    case 'completed':
      return 'positive';
    case 'failed':
    case 'cancelled':
      return 'negative';
    default:
      return 'secondary';
  }
}

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  } catch {
    return '--';
  }
}

export function StatusLogView(props: StatusLogViewProps) {
  const dimensions = useTerminalDimensions();
  const displayHeight = () => props.height || 4;
  const displayWidth = () => props.width || dimensions().width;
  const q = () => (props.searchQuery || '').toLowerCase();

  const displayEntries = createMemo(() => {
    let items = props.entries;
    if (q()) {
      items = items.filter(entry =>
        entry.Message.toLowerCase().includes(q()) ||
        (entry.AppName || entry.AppIdent || '').toLowerCase().includes(q()) ||
        entry.Status.toLowerCase().includes(q()) ||
        (entry.Operation || '').toLowerCase().includes(q())
      );
    }
    if (props.sortDesc) {
      items = [...items].sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime());
    }
    return items;
  });

  const colWidths = createMemo(() => {
    let maxStatus = 'pending'.length;
    let maxOp = 'info'.length;
    let maxApp = 8;
    for (const entry of props.entries) {
      maxStatus = Math.max(maxStatus, entry.Status.length);
      maxOp = Math.max(maxOp, (entry.Operation || 'info').length);
      const name = entry.AppName || entry.AppIdent || '';
      maxApp = Math.max(maxApp, name.length);
    }
    return { status: maxStatus + 1, operation: maxOp + 1, app: Math.min(maxApp + 1, 40) };
  });

  return (
    <box
      backgroundColor={props.isMaximized ? uiColors.bgBase : uiColors.bgMantle}
      style={{
        width: '100%',
        height: displayHeight(),
        flexDirection: 'column',
      }}
    >
      <Show when={props.isMaximized}>
        <box
          backgroundColor={uiColors.bgSurface1}
          style={{
            width: '100%',
            height: 1,
            flexDirection: 'row',
            paddingLeft: 1,
            paddingRight: 1,
            flexShrink: 0,
          }}
        >
          <HighlightedText text="Status Log" highlight="primary" attributes={TextAttributes.BOLD} />
          <box style={{ width: 'auto', marginLeft: 'auto' }}>
            <HighlightedText text={`${props.entries.length} entries`} highlight="secondary" />
          </box>
        </box>
        <SearchHeader searchMode={!!props.searchMode} searchQuery={props.searchQuery || ''} resultCount={displayEntries().length}>
            <box />
          </SearchHeader>
        <FilterStatusBar filterSummary={props.filterSummary} sortSummary={props.sortSummary} />
      </Show>

      <Show
        when={displayEntries().length > 0}
        fallback={
          <CenteredState
            message={!props.isMaximized ? 'No status updates yet... [L to maximize]' : 'No entries match filter'}
            italic
            height="auto"
            style={{ flexGrow: 1 }}
          />
        }
      >
        <ScrollableContent style={{ flexGrow: 1 }}>
          <box style={{ width: '100%', flexDirection: 'column', paddingLeft: 1, paddingRight: 1 }}>
            <For each={displayEntries()}>
              {(entry) => (
                <box style={{ width: '100%', height: 1, flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                  <box style={{ width: 19, flexShrink: 0 }}>
                    <HighlightedText text={formatTimestamp(entry.Timestamp)} highlight="highlight" />
                  </box>
                  <box style={{ width: colWidths().app, flexShrink: 0 }}>
                    <RunningText
                      text={entry.AppName || entry.AppIdent || ''}
                      width={colWidths().app}
                      fg={highlightColor('primary')}
                      attributes={TextAttributes.BOLD}
                      enabled={props.runningTextEnabled}
                      active={props.isMaximized}
                      offset={props.runningTextOffset}
                    />
                  </box>
                  <box style={{ width: colWidths().operation, flexShrink: 0 }}>
                    <RunningText
                      text={entry.Operation || 'info'}
                      width={colWidths().operation}
                      fg={highlightColor('secondary')}
                      enabled={props.runningTextEnabled}
                      active={props.isMaximized}
                      offset={props.runningTextOffset}
                    />
                  </box>
                  <box style={{ width: colWidths().status, flexShrink: 0 }}>
                    <HighlightedText text={entry.Status} highlight={statusHighlight(entry.Status)} attributes={TextAttributes.BOLD} />
                  </box>
                  <RunningText
                    text={entry.Message}
                    width={Math.max(1, displayWidth() - 19 - colWidths().app - colWidths().operation - colWidths().status - 4 - 2)}
                    fg={highlightColor('primary')}
                    enabled={props.runningTextEnabled}
                    active={props.isMaximized}
                    offset={props.runningTextOffset}
                  />
                </box>
              )}
            </For>
          </box>
        </ScrollableContent>
      </Show>
    </box>
  );
}
