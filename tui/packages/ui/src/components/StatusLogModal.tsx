/** @jsxImportSource @opentui/solid */
import { For, Show, createMemo } from 'solid-js';
import { TextAttributes } from '@opentui/core';
import type { StatusLogEntry } from '@devenv/types';
import { ScrollableContent } from './ScrollableContent';
import { uiColors } from '../colors';
import { highlightColor, HighlightedText } from './Highlight';
import { GenericModal } from './GenericModal';
import { SearchHeader } from './SearchHeader';
import { FilterStatusBar } from './FilterStatusBar';
import { MatchedText } from './MatchedText';

import type { ScrollBoxRenderable } from '@opentui/core';

export interface StatusLogModalProps {
  entries: StatusLogEntry[];
  searchMode?: boolean;
  searchQuery?: string;
  selectedIndex?: number;
  onScrollBoxReady?: (scrollBox: ScrollBoxRenderable) => void;
  onClose: () => void;
}

const displayStatus = (status: string): string => status.replace(/_/g, ' ');

const statusHighlight = (status: string): 'positive' | 'negative' | 'secondary' => {
  switch (displayStatus(status)) {
    case 'completed': return 'positive';
    case 'failed': case 'cancelled': return 'negative';
    default: return 'secondary';
  }
};

const formatTimestamp = (timestamp: string): string => {
  try {
    const date = new Date(timestamp.trim());
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  } catch { return '--'; }
};

export function StatusLogModal(props: StatusLogModalProps) {
  const q = () => (props.searchQuery || '').toLowerCase();

  const displayEntries = createMemo(() => {
    let items = props.entries;
    if (q()) {
      items = items.filter(entry =>
        formatTimestamp(entry.Timestamp).toLowerCase().includes(q()) ||
        entry.Message.toLowerCase().includes(q()) ||
        (entry.AppName || entry.AppIdent || '').toLowerCase().includes(q()) ||
        displayStatus(entry.Status).toLowerCase().includes(q()) ||
        (entry.Operation || '').toLowerCase().includes(q())
      );
    }
    return items;
  });

  const colWidths = createMemo(() => {
    let maxStatus = 'pending'.length, maxOp = 'info'.length, maxApp = 8;
    for (const entry of props.entries) {
      maxStatus = Math.max(maxStatus, entry.Status.length);
      maxOp = Math.max(maxOp, (entry.Operation || 'info').length);
      maxApp = Math.max(maxApp, (entry.AppName || entry.AppIdent || '').length);
    }
    return { timestamp: 'YYYY-MM-DD HH:mm:ss'.length + 1, status: maxStatus + 1, operation: maxOp + 1, app: Math.min(maxApp + 1, 40) };
  });

  return (
    <GenericModal
      title=""
      helpText="j/k scroll • / search • Esc close"
      widthPercent={0.92}
      heightPercent={0.85}
      onBackdropClick={props.onClose}
      customHeader={
        <box style={{ width: '100%', flexDirection: 'column', flexShrink: 0 }}>
          <SearchHeader searchMode={!!props.searchMode} searchQuery={props.searchQuery || ''} resultCount={displayEntries().length}>
            <box style={{ width: '100%', flexDirection: 'row' }}>
              <HighlightedText text="Status Log" highlight="primary" attributes={TextAttributes.BOLD} />
              <box style={{ width: 'auto', marginLeft: 'auto' }}>
                <HighlightedText text={`${props.entries.length} entries`} highlight="secondary" />
              </box>
            </box>
          </SearchHeader>
          <FilterStatusBar />
        </box>
      }
    >
      <Show when={displayEntries().length === 0} fallback={
        <ScrollableContent
          axes={['x', 'y']}
          keyboardAxes={['x']}
          onScrollBoxReady={(r) => props.onScrollBoxReady?.(r)}
          viewportCulling={true}
        >
          <box paddingLeft={1} paddingRight={1}>
          <For each={displayEntries()}>{(entry, index) => {
              const selected = index() === (props.selectedIndex ?? -1);
              const timestamp = formatTimestamp(entry.Timestamp);
              const appName = entry.AppName || entry.AppIdent || '';
              const operation = entry.Operation || 'info';
              const status = displayStatus(entry.Status);
              return (
              <box backgroundColor={selected ? uiColors.bgSurface0 : undefined} style={{ minWidth: '100%', height: 1, flexDirection: 'row', gap: 1, flexShrink: 0 }}>
                <box style={{ width: colWidths().timestamp, flexShrink: 0 }}>
                  <MatchedText text={timestamp} query={q()} fg={highlightColor('highlight')} />
                </box>
                <box style={{ width: colWidths().app, flexShrink: 0 }}>
                  <MatchedText text={appName} query={q()} fg={highlightColor('primary')} attributes={TextAttributes.BOLD} />
                </box>
                <box style={{ width: colWidths().operation, flexShrink: 0 }}>
                  <MatchedText text={operation} query={q()} fg={highlightColor('secondary')} />
                </box>
                <box style={{ width: colWidths().status, flexShrink: 0 }}>
                  <MatchedText text={status} query={q()} fg={highlightColor(statusHighlight(entry.Status))} attributes={TextAttributes.BOLD} />
                </box>
                <MatchedText text={entry.Message} query={q()} fg={highlightColor('primary')} />
              </box>
            );
            }
            }
          </For>
        </box>
        </ScrollableContent>
      }>
        <box style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
          <HighlightedText text="No entries match filter" highlight="secondary" />
        </box>
      </Show>
    </GenericModal>
  );
}
