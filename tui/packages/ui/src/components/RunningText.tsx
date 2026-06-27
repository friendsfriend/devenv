import { createMemo } from 'solid-js';
import { useTerminalDimensions } from '@opentui/solid';

export interface RunningTextProps {
  text: string;
  width?: number;
  enabled?: boolean;
  active?: boolean;
  offset?: number;
  fg?: string;
  attributes?: any;
  resetKey?: string | number;
}

export function runningTextFrame(text: string, width: number, enabled: boolean, active: boolean, offset: number, delayTicks = 13, endHoldTicks = 13): string {
  if (width <= 0) return '';
  if (text.length <= width) return text;

  const initial = width <= 1 ? text.slice(0, width) : `${text.slice(0, width - 1)}…`;
  if (!enabled || !active) return initial;

  const maxScroll = Math.max(0, text.length - width);
  const cycleTicks = delayTicks + maxScroll + endHoldTicks;
  const phase = cycleTicks > 0 ? offset % cycleTicks : 0;

  if (phase < delayTicks) return initial;

  const scrollOffset = phase - delayTicks;
  if (scrollOffset >= maxScroll) return text.slice(text.length - width);

  return text.slice(scrollOffset, scrollOffset + width);
}

export function RunningText(props: RunningTextProps) {
  const dimensions = useTerminalDimensions();
  const width = createMemo(() => Math.max(0, props.width ?? dimensions().width));
  let startOffset = props.offset ?? 0;
  let previousResetToken = '';

  const content = createMemo(() => {
    const text = props.text ?? '';
    const currentWidth = width();
    const enabled = props.enabled ?? false;
    const active = props.active ?? false;
    const currentOffset = props.offset ?? 0;
    const resetToken = `${enabled}|${active}|${text}|${currentWidth}|${props.resetKey ?? ''}`;
    if (resetToken !== previousResetToken) {
      previousResetToken = resetToken;
      startOffset = currentOffset;
    }
    const relativeOffset = Math.max(0, currentOffset - startOffset);
    return runningTextFrame(text, currentWidth, enabled, active, relativeOffset);
  });

  return <text fg={props.fg} attributes={props.attributes}>{content()}</text>;
}
