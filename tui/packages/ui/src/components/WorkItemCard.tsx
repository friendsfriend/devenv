import { createMemo } from 'solid-js';
import { TextAttributes } from '@opentui/core';
import { useTerminalDimensions } from '@opentui/solid';
import { uiColors } from '../colors';
import { RunningText } from './RunningText';

export interface WorkItemCardProps {
  marker: string;
  title: string;
  statusText: string;
  statusColor: string;
  metadata: string;
  selected: boolean;
  index: number;
  prefix?: string;
  prefixColor?: string;
  statusSuffixText?: string;
  statusSuffixColor?: string;
  statusAttributes?: any;
  onMouseUp?: () => void;
  runningTextEnabled?: boolean;
  runningTextOffset?: number;
}

const MIN_TITLE_WIDTH = 12;

export function WorkItemCard(props: WorkItemCardProps) {
  const dimensions = useTerminalDimensions();
  const contentWidth = () => Math.max(1, dimensions().width - 4);
  const fixedPrefix = () => props.marker.length + 1 + (props.prefix?.length ?? 0);

  /** Compute truncated status + its char width. */
  const statusDisplay = createMemo(() => {
    const full = (props.statusText ?? '') + (props.statusSuffixText ?? '');
    const avail = contentWidth() - fixedPrefix() - MIN_TITLE_WIDTH - 1;
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
    Math.max(MIN_TITLE_WIDTH, contentWidth() - fixedPrefix() - statusDisplay().consumed - 1);

  const titleTruncated = createMemo(() => {
    const ttlWidth = titleWidth();
    return props.title.length <= ttlWidth
      ? props.title
      : props.title.slice(0, Math.max(0, ttlWidth - 1)) + '…';
  });

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
        }}
      >
        {/* Line 1: [marker][prefix][title][spacer][status][suffix] */}
        <box style={{ width: '100%', flexDirection: 'row' }}>
          <text fg={uiColors.textSecondary}>{props.marker} </text>
          <text fg={props.prefixColor ?? uiColors.textSecondary}>
            {props.prefix ?? ''}
          </text>
          <text fg={uiColors.textSecondary}>{titleTruncated()}</text>
          <box style={{ flexGrow: 1, flexShrink: 1 }} />
          <text
            fg={props.statusColor}
            attributes={props.statusAttributes}
          >
            {statusDisplay().text}
          </text>
          <text fg={props.statusSuffixColor ?? props.statusColor}>
            {statusDisplay().suffix}
          </text>
        </box>

        {/* ── Line 2 ────────────────────────────────────────────── */}
        <RunningText
          text={props.metadata}
          width={contentWidth()}
          fg={uiColors.textMuted}
          enabled={props.runningTextEnabled}
          active={props.selected}
          offset={props.runningTextOffset}
        />
      </box>
    </box>
  );
}
