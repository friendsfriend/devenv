/** @jsxImportSource @opentui/solid */
import { For, Show } from 'solid-js';
import type { ActionRun, ActionRunStatus } from '@devenv/types';
import { actionRunDisplayLabel } from '@devenv/types';
import { uiColors } from '../colors';
import { HighlightedText, type Highlight } from './Highlight';
import { formatProfileLabel } from './ProfilePickerView';

export interface ActionStatusStripProps {
  runs: ActionRun[];
  width: number;
  onActivate?: () => void;
}

export interface ActionStatusSegment {
  id: string;
  text: string;
  status: ActionRunStatus;
}

const statusPriority: Record<ActionRunStatus, number> = {
  active: 0,
  pending: 0,
  failed: 1,
  canceled: 2,
  completed: 2,
};

const statusGlyph: Record<ActionRunStatus, string> = {
  active: '⟳',
  pending: '⟳',
  failed: '✗',
  canceled: '✗',
  completed: '✓',
};

const statusHighlight = (status: ActionRunStatus): Highlight => {
  if (status === 'failed' || status === 'canceled') return 'negative';
  if (status === 'completed') return 'positive';
  return 'highlight';
};

const timestamp = (run: ActionRun): number => Date.parse(run.finishedAt ?? run.startedAt ?? '') || 0;
const label = (run: ActionRun): string => actionRunDisplayLabel(run, formatProfileLabel);

export function actionStatusSegments(runs: ActionRun[], width: number): ActionStatusSegment[] {
  if (width <= 0) return [];
  const ordered = [...runs].sort((a, b) => statusPriority[a.status] - statusPriority[b.status] || timestamp(b) - timestamp(a));
  const result: ActionStatusSegment[] = [];
  let remaining = width;
  for (const run of ordered) {
    const separator = result.length === 0 ? '' : '  ';
    const full = `${separator}${statusGlyph[run.status]} ${label(run)}`;
    if (full.length <= remaining) {
      result.push({ id: run.id, text: full, status: run.status });
      remaining -= full.length;
      continue;
    }
    if (remaining >= separator.length + 2) {
      const available = remaining - separator.length;
      const content = `${statusGlyph[run.status]} ${label(run)}`;
      const truncated = content.length > available
        ? `${content.slice(0, Math.max(1, available - 1))}…`
        : content;
      result.push({ id: run.id, text: separator + truncated, status: run.status });
    }
    break;
  }
  return result;
}

export function ActionStatusStrip(props: ActionStatusStripProps) {
  const segments = () => actionStatusSegments(props.runs, Math.max(0, props.width - 2));
  return (
    <box
      backgroundColor={uiColors.bgMantle}
      style={{ width: '100%', height: 1, paddingLeft: 1, paddingRight: 1, flexDirection: 'row' }}
      onMouseUp={() => props.onActivate?.()}
    >
      <Show when={segments().length > 0} fallback={<HighlightedText text="No recent actions" highlight="secondary" />}>
        <For each={segments()}>{(segment) => <HighlightedText text={segment.text} highlight={statusHighlight(segment.status)} />}</For>
      </Show>
    </box>
  );
}
