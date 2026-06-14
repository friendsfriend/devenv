import { uiColors } from '../colors';
import { GenericModal } from './GenericModal';
import { formatHelpText } from './HelpText';

export interface ScriptAddModalProps {
  mode: 'create' | 'link';
  targetPath: string;
  sourcePath: string;
  selectedField: number;
  error: string | null;
}

export function ScriptAddModal(props: ScriptAddModalProps) {
  const modeLabel = () => (props.mode === 'create' ? 'Create new script' : 'Use existing script');

  const row = (label: string, value: string, selected: boolean) => (
    <box style={{ width: '100%', height: 2, flexDirection: 'column', marginBottom: 1, paddingLeft: 1 }} backgroundColor={selected ? uiColors.bgSurface0 : undefined}>
      <box style={{ width: '100%', height: 1, flexDirection: 'row' }}>
        <text fg={selected ? uiColors.primary : uiColors.textMuted}>{selected ? '▶ ' : '  '}</text>
        <text fg={uiColors.textMuted}>{label}</text>
      </box>
      <box style={{ width: '100%', height: 1, flexDirection: 'row' }}>
        <text fg={value.trim() ? uiColors.textPrimary : uiColors.textTertiary}>{value.trim() ? value : '<empty>'}</text>
      </box>
    </box>
  );

  return (
    <GenericModal
      title="Add Script"
      helpText={formatHelpText([
        { key: 'Enter', action: 'Create/Link' },
        { key: 'j/k or Tab', action: 'Select Field' },
        { key: '←/→/Space', action: 'Toggle Mode' },
        { key: 'Type/Bksp', action: 'Edit Field' },
        { key: 'Esc', action: 'Cancel' },
      ])}
      widthPercent={0.78}
      heightPercent={0.5}
    >
      <box style={{ width: '100%', height: 2, flexDirection: 'column', marginBottom: 1, flexShrink: 0 }}>
        <text fg={uiColors.textMuted}>Use target name/path as relative path under scripts/ (e.g. folder/subfolder/script or script)</text>
        <text fg={uiColors.textMuted}>If extension is omitted, .sh is used (or source extension for links).</text>
      </box>

      {row('Mode', modeLabel(), props.selectedField === 0)}
      {row('Target name/path', props.targetPath, props.selectedField === 1)}
      {props.mode === 'link' && row('Source script path', props.sourcePath, props.selectedField === 2)}

      {props.error && (
        <box style={{ width: '100%', height: 1, flexShrink: 0, marginTop: 1 }}>
          <text fg={uiColors.error}>{props.error}</text>
        </box>
      )}
    </GenericModal>
  );
}
