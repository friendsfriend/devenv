/** @jsxImportSource @opentui/solid */
import { TextAttributes } from '@opentui/core';
import { uiColors } from '../colors';

export type Highlight = 'primary' | 'secondary' | 'positive' | 'negative' | 'warning' | 'highlight';

export function highlightColor(highlight?: Highlight): string {
  switch (highlight) {
    case 'primary': return uiColors.textPrimary;
    case 'secondary': return uiColors.textMuted;
    case 'positive': return uiColors.success;
    case 'negative': return uiColors.error;
    case 'warning': return uiColors.warning;
    case 'highlight': return uiColors.highlight;
    default: return uiColors.textPrimary;
  }
}

export interface HighlightedTextProps {
  text: string | number;
  highlight?: Highlight;
  attributes?: number;
}

export function HighlightedText(props: HighlightedTextProps) {
  return <text fg={highlightColor(props.highlight)} attributes={props.attributes}>{String(props.text)}</text>;
}
