import { TextAttributes } from '@opentui/core';
import { uiColors } from '../colors';

export interface CenteredStateProps {
  message: string;
  color?: string;
  bold?: boolean;
  height?: number | 'auto' | `${number}%`;
}

export function CenteredState(props: CenteredStateProps) {
  return (
    <box
      style={{
        width: '100%',
        height: props.height ?? '100%',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <text fg={props.color ?? uiColors.textMuted} attributes={props.bold ? TextAttributes.BOLD : undefined}>
        {props.message}
      </text>
    </box>
  );
}
