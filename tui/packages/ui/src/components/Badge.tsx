/** @jsxImportSource @opentui/solid */
import { TextAttributes } from '@opentui/core';
import { uiColors } from '../colors';
import { highlightColor, type Highlight } from './Highlight';

export interface BadgeProps {
  text: string | number;
  highlight?: Highlight;
  /** Last-resort color escape hatch. Prefer highlight. */
  color?: string;
  textColor?: string;
}

export function Badge(props: BadgeProps) {
  const color = () => props.color ?? highlightColor(props.highlight ?? 'highlight');

  return (
    <box style={{ flexDirection: 'row', height: 1 }}>
      <text fg={color()}></text>
      <text fg={props.textColor ?? uiColors.bgBase} bg={color()} attributes={TextAttributes.BOLD}>{String(props.text)}</text>
      <text fg={color()}></text>
    </box>
  );
}
