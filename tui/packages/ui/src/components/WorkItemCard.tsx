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
  prefix?: string;
  prefixColor?: string;
  statusSuffixText?: string;
  statusSuffixColor?: string;
  statusAttributes?: any;
  onMouseUp?: () => void;
  runningTextEnabled?: boolean;
  runningTextOffset?: number;
}

export function WorkItemCard(props: WorkItemCardProps) {
  const dimensions = useTerminalDimensions();
  const contentWidth = () => Math.max(1, dimensions().width - 4);
  const titleWidth = () => Math.max(1, contentWidth() - props.marker.length - (props.prefix?.length ?? 0) - 1);
  const statusWidth = () => Math.max(1, contentWidth() - (props.statusSuffixText?.length ?? 0));
  return (
    <box
      backgroundColor={props.selected ? uiColors.bgSurface2 : uiColors.bgMantle}
      onMouseUp={props.onMouseUp}
      style={{
        width: '100%',
        height: 3,
        flexDirection: 'column',
        paddingLeft: 1,
        paddingRight: 1,
        marginBottom: 1,
      }}
    >
      <box style={{ width: '100%', height: 1, flexDirection: 'row' }}>
        <text fg={uiColors.textSecondary}>{props.marker} </text>
        <text fg={props.prefixColor ?? uiColors.textSecondary}>{props.prefix ?? ''}</text>
        <RunningText text={props.title} width={titleWidth()} fg={uiColors.textSecondary} enabled={props.runningTextEnabled} active={props.selected} offset={props.runningTextOffset} />
      </box>
      <box style={{ width: '100%', height: 1, flexDirection: 'row' }}>
        <RunningText text={props.statusText} width={statusWidth()} fg={props.statusColor} attributes={props.statusAttributes} enabled={props.runningTextEnabled} active={props.selected} offset={props.runningTextOffset} />
        <text fg={props.statusSuffixColor ?? props.statusColor}>{props.statusSuffixText ?? ''}</text>
      </box>
      <box style={{ width: '100%', height: 1, flexDirection: 'row' }}>
        <RunningText text={props.metadata} width={contentWidth()} fg={uiColors.textMuted} enabled={props.runningTextEnabled} active={props.selected} offset={props.runningTextOffset} />
      </box>
    </box>
  );
}
