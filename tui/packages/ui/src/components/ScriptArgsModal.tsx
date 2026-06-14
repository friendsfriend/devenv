import { uiColors, SCROLLBAR_OPTIONS } from '../colors';
import { GenericModal } from './GenericModal';
import { formatHelpText } from './HelpText';
import type { ScriptParameter } from '@devenv/types';

export interface ScriptArgsModalProps {
  scriptName: string;
  parameters: ScriptParameter[];
  values: Record<string, string>;
  selectedIndex: number;
  historyIndex: number;
  historyTotal: number;
  error: string | null;
}

export function ScriptArgsModal(props: ScriptArgsModalProps) {
  const normalizedSelectedIndex = () => Math.max(0, Math.min(props.selectedIndex, Math.max(0, props.parameters.length - 1)));

  const valueFor = (param: ScriptParameter) => {
    const raw = props.values[param.name] ?? param.defaultValue ?? '';
    if (param.type === 'bool') return raw === 'true' ? 'true' : 'false';
    return raw;
  };

  const metaFor = (param: ScriptParameter) => {
    const required = param.required ? 'required' : 'optional';
    const choices = param.choices?.length ? ` choices:${param.choices.join('|')}` : '';
    return `${param.type} • ${required}${choices}`;
  };

  return (
    <GenericModal
      title="Run Script"
      helpText={formatHelpText([
        { key: 'Enter', action: 'Run' },
        { key: 'j/k', action: 'Select' },
        { key: '↑/↓', action: 'History' },
        { key: 'Type/Bksp', action: 'Edit Text' },
        { key: '←/→', action: 'Select Enum Value' },
        { key: 'Space', action: 'Toggle Bool' },
        { key: 'Esc', action: 'Cancel' },
      ])}
      widthPercent={0.82}
      heightPercent={0.85}
    >
      <box style={{ width: '100%', height: 1, flexDirection: 'row', marginBottom: 1, flexShrink: 0 }}>
        <text fg={uiColors.textMuted}>script </text>
        <text fg={uiColors.textPrimary}>{props.scriptName}</text>
        <text fg={uiColors.textMuted}>  •  history </text>
        <text fg={uiColors.textSecondary}>{props.historyTotal === 0 ? 'none' : `${props.historyIndex + 1}/${props.historyTotal}`}</text>
      </box>

      <scrollbox
        scrollbarOptions={SCROLLBAR_OPTIONS}
        style={{ width: '100%', flexGrow: 1, minHeight: 0 }}
      >
        {props.parameters.length === 0 ? (
          <text fg={uiColors.textMuted}>No parameter metadata found for this script.</text>
        ) : (
          props.parameters.map((param, idx) => {
            const selected = idx === normalizedSelectedIndex();
            const value = valueFor(param);
            const hasValue = value.trim().length > 0;

            return (
              <box
                style={{
                  width: '100%',
                  height: 3,
                  flexDirection: 'column',
                  flexShrink: 0,
                  marginBottom: 1,
                  paddingLeft: 1,
                }}
                backgroundColor={selected ? uiColors.bgSurface0 : undefined}
              >
                <box style={{ width: '100%', height: 1, flexDirection: 'row' }}>
                  <text fg={selected ? uiColors.primary : uiColors.textMuted}>{selected ? '▶ ' : '  '}</text>
                  <text fg={uiColors.textPrimary}>{param.name}</text>
                  <text fg={uiColors.textMuted}>  ({metaFor(param)})</text>
                  {param.flag && <text fg={uiColors.textSecondary}>{`  ${param.flag}`}</text>}
                </box>

                <box style={{ width: '100%', height: 1, flexDirection: 'row' }}>
                  <text fg={uiColors.textMuted}>    value </text>
                  <text fg={hasValue ? uiColors.textPrimary : uiColors.textMuted}>{hasValue ? value : '<empty>'}</text>
                </box>

                <box style={{ width: '100%', height: 1, flexDirection: 'row' }}>
                  <text fg={uiColors.textTertiary}>    {param.description || ' '}</text>
                </box>
              </box>
            );
          })
        )}
      </scrollbox>

      {props.error && (
        <box style={{ width: '100%', height: 1, flexShrink: 0, marginTop: 1 }}>
          <text fg={uiColors.error}>{props.error}</text>
        </box>
      )}
    </GenericModal>
  );
}
