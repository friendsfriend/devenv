import { uiColors } from '../colors';

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
}

export function WorkItemCard(props: WorkItemCardProps) {
  return (
    <box
      backgroundColor={props.selected ? uiColors.bgSurface2 : uiColors.bgMantle}
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
        <text fg={uiColors.textSecondary}>{props.title}</text>
      </box>
      <box style={{ width: '100%', height: 1, flexDirection: 'row' }}>
        <text fg={props.statusColor}>{props.statusText}</text>
        <text fg={props.statusSuffixColor ?? props.statusColor}>{props.statusSuffixText ?? ''}</text>
      </box>
      <box style={{ width: '100%', height: 1, flexDirection: 'row' }}>
        <text fg={uiColors.textMuted}>{props.metadata}</text>
      </box>
    </box>
  );
}
