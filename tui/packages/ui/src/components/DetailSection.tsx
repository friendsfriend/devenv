import { TextAttributes } from '@opentui/core';
import { type JSX } from 'solid-js';
import { uiColors } from '../colors';

export interface DetailSectionProps {
  title?: string;
  header?: JSX.Element;
  children: JSX.Element;
  borderColor?: string;
  titleColor?: string;
  style?: any;
}

export function DetailSection(props: DetailSectionProps) {
  return (
    <box
      backgroundColor={uiColors.bgMantle}
      style={props.style ?? { width: '100%', flexDirection: 'column', overflow: 'hidden' }}
    >
      <box
        backgroundColor={uiColors.bgSurface1}
        style={{ width: '100%', height: 1, flexDirection: 'row', paddingLeft: 1, paddingRight: 1, flexShrink: 0 }}
      >
        {props.header ?? <text fg={props.titleColor ?? uiColors.textPrimary} attributes={TextAttributes.BOLD}>{props.title}</text>}
      </box>
      {props.children}
    </box>
  );
}
