/** @jsxImportSource @opentui/solid */
import { For, Show } from 'solid-js';
import { TextAttributes } from '@opentui/core';
import type { StatusLogEntry } from '@devenv/types';
import { uiColors } from '../colors';
import { highlightColor, HighlightedText } from './Highlight';
import { CenteredState } from './CenteredState';

export interface StatusLogViewProps {
  entries: StatusLogEntry[];
  height?: number;
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

export function StatusLogView(props: StatusLogViewProps) {
  const displayHeight = () => props.height || 4;
  const entries = () => {
    const e = props.entries;
    if (e.length <= displayHeight()) return e;
    return e.slice(e.length - displayHeight());
  };

  return (
    <box backgroundColor={uiColors.bgMantle} style={{ width: '100%', height: displayHeight(), flexDirection: 'column' }}>
      <Show when={entries().length > 0} fallback={<CenteredState message="No status updates yet... [L to maximize]" italic height="auto" style={{ flexGrow: 1 }} />}>
        <box style={{ width: '100%', flexDirection: 'column', paddingLeft: 1, paddingRight: 1 }}>
          <For each={entries()}>
            {(entry) => (
              <box style={{ width: '100%', height: 1, flexDirection: 'row', gap: 1 }}>
                <HighlightedText text={formatTimestamp(entry.Timestamp)} highlight="highlight" />
                <HighlightedText text={entry.AppName || entry.AppIdent || ''} highlight="primary" attributes={TextAttributes.BOLD} />
                <HighlightedText text={displayStatus(entry.Status)} highlight={statusHighlight(entry.Status)} attributes={TextAttributes.BOLD} />
                {entry.source === 'task' && (
                  <HighlightedText text="[task]" highlight="secondary" attributes={TextAttributes.BOLD} />
                )}
                <HighlightedText text={entry.Message} highlight="primary" />
              </box>
            )}
          </For>
        </box>
      </Show>
    </box>
  );
}
