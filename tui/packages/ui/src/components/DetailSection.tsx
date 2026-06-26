import { TextAttributes } from '@opentui/core';
import { type JSX } from 'solid-js';
import { uiColors } from '../colors';

export interface DetailSectionProps {
  title: string;
  children: JSX.Element;
  borderColor?: string;
  titleColor?: string;
  style?: any;
}

export function DetailSection(props: DetailSectionProps) {
  return (
    <box
      backgroundColor={uiColors.bgMantle}
      style={props.style ?? { width: '100%', flexDirection: 'column', paddingLeft: 1, paddingRight: 1 }}
    >
      <text fg={props.titleColor ?? uiColors.textPrimary} attributes={TextAttributes.BOLD}>{props.title}</text>
      {props.children}
    </box>
  );
}
