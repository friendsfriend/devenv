import { TextAttributes } from '@opentui/core';
import type { ActionTarget } from '@devenv/types';
import { uiColors } from '../colors';
import { ListViewModal } from './ListViewModal';
import { formatHelpText } from './HelpText';

export interface ActionTargetPickerProps {
  title?: string;
  targets: ActionTarget[];
  selectedIndex: number;
  loading?: boolean;
}

function targetBadge(target: ActionTarget): string {
  if (target.runtime === 'shell' && target.launchMode === 'tmux') return '[tmux]';
  return `[${target.runtime}]`;
}

function targetText(target: ActionTarget): string {
  const profile = target.profile ? ` (${target.profile})` : '';
  return `${targetBadge(target)} ${target.label}${profile}`;
}

function ActionTargetRow(props: { target: ActionTarget; isSelected: boolean }) {
  const cursor = () => props.isSelected ? '► ' : '  ';

  return (
    <box
      backgroundColor={props.isSelected ? uiColors.bgSurface2 : undefined}
      style={{ width: '100%', height: 1, paddingLeft: 1, paddingRight: 1 }}
    >
      <text
        fg={uiColors.textPrimary}
        attributes={props.isSelected ? TextAttributes.BOLD : undefined}
      >
        {cursor()}{targetText(props.target)}
      </text>
    </box>
  );
}

export function ActionTargetPickerView(props: ActionTargetPickerProps) {
  return (
    <ListViewModal
      title={props.title || 'Select Target'}
      helpText={formatHelpText([
        { key: 'j/k', action: 'Navigate' },
        { key: 'Enter', action: 'Select' },
        { key: 'Esc', action: 'Cancel' },
      ])}
      widthPercent={0.42}
      heightPercent={0.45}
      items={props.targets}
      selectedIndex={props.selectedIndex}
      loading={props.loading}
      reservedHeight={4}
      scrollIndicatorLabel="targets"
      emptyContent={<text fg={uiColors.textSecondary}>No targets available</text>}
      renderItem={(target, isSelected) => (
        <ActionTargetRow target={target} isSelected={isSelected()} />
      )}
    />
  );
}
