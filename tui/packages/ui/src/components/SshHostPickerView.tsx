/** @jsxImportSource @opentui/solid */
import { Show, createMemo } from 'solid-js';
import { TextAttributes } from '@opentui/core';
import type { SshHost } from '@devenv/types';
import { uiColors } from '../colors';
import { ListViewModal } from './ListViewModal';
import { formatHelpText } from './HelpText';
import { highlightColor } from './Highlight';

export interface SshHostPickerViewProps {
  hosts: SshHost[];
  selectedIndex: number;
  searchQuery?: string;
  filterQuery?: string;
  filterActive?: boolean;
  onFilterChange?: (query: string) => void;
}

// ─── Host row ─────────────────────────────────────────────────────────────────

function HostRow(props: { host: SshHost; isSelected: boolean }) {
  const cursor = () => (props.isSelected ? '►' : ' ');
  const target = () => {
    const h = props.host;
    const user = h.user ? `${h.user}@` : '';
    const host = h.hostname || h.alias;
    const port = h.port && h.port !== 22 ? `:${h.port}` : '';
    return `${user}${host}${port}`;
  };

  return (
    <box
      backgroundColor={props.isSelected ? uiColors.bgSurface1 : undefined}
      style={{
        width: '100%',
        height: 1,
        flexDirection: 'row',
        flexShrink: 0,
        paddingLeft: 1,
      }}
    >
      <text fg={props.isSelected ? uiColors.primary : uiColors.textSecondary}>
        {cursor()}{' '}
      </text>
      <text
        fg={props.isSelected ? uiColors.textPrimary : uiColors.textSecondary}
        attributes={props.isSelected ? TextAttributes.BOLD : undefined}
        style={{ flexShrink: 0 }}
      >
        {props.host.alias}
      </text>
      <text fg={highlightColor('secondary')}>{'  '}{target()}</text>
    </box>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

const HEIGHT_PERCENT = 0.7;
const WIDTH_PERCENT = 0.6;

export function SshHostPickerView(props: SshHostPickerViewProps) {
  const searchQuery = () => props.searchQuery ?? '';

  const filteredHosts = createMemo(() => {
    const q = searchQuery().toLowerCase();
    if (!q) return props.hosts;
    return props.hosts.filter(
      (h) =>
        h.alias.toLowerCase().includes(q) ||
        (h.hostname ?? '').toLowerCase().includes(q) ||
        (h.user ?? '').toLowerCase().includes(q),
    );
  });

  const clampedIndex = createMemo(() =>
    Math.max(0, Math.min(props.selectedIndex, filteredHosts().length - 1)),
  );

  return (
    <ListViewModal
      title="SSH Hosts"
      helpText={formatHelpText([
        { key: 'j/k', action: 'Navigate' },
        { key: '/', action: 'Filter' },
        { key: 'Enter', action: 'Connect' },
        { key: 'Esc', action: 'Close' },
      ])}
      widthPercent={WIDTH_PERCENT}
      heightPercent={HEIGHT_PERCENT}
      items={filteredHosts()}
      selectedIndex={clampedIndex()}
      filterPlaceholder="filter hosts..."
      scrollIndicatorLabel="hosts"
      filterQuery={props.filterQuery}
      filterActive={props.filterActive}
      onFilterChange={props.onFilterChange}
      emptyContent={
        <Show
          when={props.hosts.length === 0}
          fallback={
            <text fg={highlightColor('secondary')}>No hosts match filter</text>
          }
        >
          <text fg={highlightColor('secondary')}>No hosts found in ~/.ssh/config</text>
        </Show>
      }
      renderItem={(host, isSelected) => (
        <HostRow host={host} isSelected={isSelected()} />
      )}
    />
  );
}