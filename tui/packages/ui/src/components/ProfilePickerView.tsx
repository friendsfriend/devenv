import { TextAttributes } from '@opentui/core';
import { uiColors } from '../colors';
import { ListViewModal } from './ListViewModal';
import { formatHelpText } from './HelpText';

export interface ProfilePickerProps {
  profiles: string[];
  hasDockerfile: boolean;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onSubmit: (profile: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

function ProfileRow(props: {
  label: string;
  isSelected: boolean;
}) {
  const cursor = () => props.isSelected ? '► ' : '  ';

  return (
    <box
      backgroundColor={props.isSelected ? uiColors.bgSurface2 : undefined}
      style={{
        width: '100%',
        height: 1,
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      <text
        fg={uiColors.textPrimary}
        attributes={props.isSelected ? TextAttributes.BOLD : undefined}
      >
        {cursor()}{props.label}
      </text>
    </box>
  );
}

export function ProfilePickerView(props: ProfilePickerProps) {
  const allOptions = (): string[] => {
    const opts: string[] = [];
    if (props.hasDockerfile) {
      opts.push('default (no profile)');
    }
    opts.push(...props.profiles);
    return opts;
  };

  return (
    <ListViewModal
      title="Select Profile"
      helpText={formatHelpText([
        { key: 'j/k', action: 'Navigate' },
        { key: 'Enter', action: 'Select' },
        { key: 'Esc', action: 'Cancel' },
      ])}
      widthPercent={0.3}
      heightPercent={0.4}
      items={allOptions()}
      selectedIndex={props.selectedIndex}
      loading={props.loading}
      reservedHeight={4}
      scrollIndicatorLabel="profiles"
      emptyContent={
        <text fg={uiColors.textSecondary}>No profiles available</text>
      }
      renderItem={(item, isSelected) => (
        <ProfileRow label={item} isSelected={isSelected()} />
      )}
    />
  );
}
