/** @jsxImportSource @opentui/solid */
import { Show, createMemo, type JSXElement } from 'solid-js';
import { TextAttributes } from '@opentui/core';
import { useTerminalDimensions } from '@opentui/solid';
import { uiColors } from '../colors';
import { Badge } from './Badge';
import { RunningText } from './RunningText';

export interface WorkItemCardProps {
  marker: string;
  title: string;
  statusText: string;
  statusColor?: string;
  statusBadgeHighlight?: string;
  metadata: string | JSXElement;
  selected: boolean;
  index: number;
  prefix?: string;
  prefixColor?: string;
  statusSuffixText?: string;
  statusSuffixColor?: string;
  rightMetadata?: string;
  rightMetadataColor?: string;
  onMouseUp?: () => void;
  runningTextEnabled?: boolean;
  runningTextOffset?: number;
}

const MIN_TITLE_WIDTH = 12;

export function WorkItemCard(props: WorkItemCardProps) {
  const dimensions = useTerminalDimensions();
  const contentWidth = () => Math.max(1, dimensions().width - 4);
  const fixedPrefix = () => props.marker.length + 1 + (props.prefix?.length ?? 0);

  /** Row-internal content width — subtracts 1 for ScrollableList scrollbar. */
  const rowWidth = () => Math.max(1, contentWidth() - 1);

  /** Compute truncated status + its char width. */
  const statusDisplay = createMemo(() => {
    const full = (props.statusText ?? '') + (props.statusSuffixText ?? '');
    const avail = rowWidth() - fixedPrefix() - MIN_TITLE_WIDTH - 1;
    if (full.length <= avail) {
      const text = props.statusText ?? '';
      const suffix = props.statusSuffixText ?? '';
      return { text, suffix, consumed: text.length + suffix.length };
    }
    const maxSuffix = Math.max(0, avail - (props.statusText ?? '').length - 1);
    if (maxSuffix <= 0) {
      const maxT = Math.max(1, avail - 1);
      return {
        text: (props.statusText ?? '').slice(0, maxT) + '…',
        suffix: '',
        consumed: avail,
      };
    }
    return {
      text: props.statusText ?? '',
      suffix: (props.statusSuffixText ?? '').slice(0, maxSuffix) + '…',
      consumed: avail,
    };
  });

  /** Title width available after reserving space for prefix + status. */
  const titleWidth = () =>
    Math.max(MIN_TITLE_WIDTH, rowWidth() - fixedPrefix() - statusDisplay().consumed - 1);

  const rightMetadataDisplay = createMemo(() => {
    const text = props.rightMetadata ?? '';
    const max = Math.max(0, Math.floor(rowWidth() * 0.45));
    if (!text || max === 0) return '';
    if (text.length <= max) return text;
    return text.slice(0, Math.max(1, max - 1)) + '…';
  });

  const metadataWidth = () => {
    const right = rightMetadataDisplay();
    const gap = right ? 1 : 0;
    return Math.max(1, rowWidth() - right.length - gap);
  };

  const bgColor = () => props.selected ? uiColors.bgSurface0 : uiColors.bgMantle;

  return (
    <box
      backgroundColor={bgColor()}
      onMouseUp={props.onMouseUp}
      style={{
        width: '100%',
        flexDirection: 'row',
      }}
    >
      {/* ── Accent marker strip — always present, colored only when selected ── */}
      <box
        backgroundColor={props.selected ? uiColors.highlight : undefined}
        style={{ width: 2, flexShrink: 0 }}
      />

      {/* ── Card body ─────────────────────────────────────────────── */}
      <box
        style={{
          flexGrow: 1,
          flexDirection: 'column',
          paddingLeft: 1,
          paddingRight: 1,
          overflow: 'hidden',
        }}
      >
        {/* Line 1: [marker][prefix][title][spacer][status][suffix] */}
        <box style={{ width: '100%', height: 1, flexShrink: 0, flexDirection: 'row', overflow: 'hidden' }}>
          <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>{props.marker} </text>
          <text fg={props.prefixColor ?? uiColors.textPrimary} attributes={TextAttributes.BOLD}>
            {props.prefix ?? ''}
          </text>
          <RunningText
            text={props.title}
            width={titleWidth()}
            fg={uiColors.textPrimary}
            attributes={TextAttributes.BOLD}
            enabled={props.runningTextEnabled}
            active={props.selected}
            offset={props.runningTextOffset}
          />
          <box style={{ flexGrow: 1, flexShrink: 1 }} />
          <Show when={props.statusBadgeHighlight} fallback={
            <text fg={props.statusColor} attributes={TextAttributes.BOLD}>
              {statusDisplay().text}
            </text>
          }>
            <Badge text={statusDisplay().text} highlight={props.statusBadgeHighlight as any} />
          </Show>
          <text fg={props.statusSuffixColor ?? props.statusColor} attributes={TextAttributes.BOLD}>
            {statusDisplay().suffix}
          </text>
        </box>

        {/* ── Line 2 ────────────────────────────────────────────── */}
        <box style={{ width: '100%', height: 1, flexShrink: 0, flexDirection: 'row', overflow: 'hidden' }}>
          <Show
            when={typeof props.metadata === 'string'}
            fallback={<box style={{ flexGrow: 1, minWidth: 0, overflow: 'hidden' }}>{props.metadata}</box>}
          >
            <RunningText
              text={props.metadata as string}
              width={metadataWidth()}
              fg={uiColors.textMuted}
              enabled={props.runningTextEnabled}
              active={props.selected}
              offset={props.runningTextOffset}
            />
          </Show>
          <box style={{ flexGrow: 1, flexShrink: 1 }} />
          <text fg={props.rightMetadataColor ?? uiColors.textMuted}>
            {rightMetadataDisplay()}
          </text>
        </box>
      </box>
    </box>
  );
}
