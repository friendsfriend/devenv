import { Show } from 'solid-js';
import { TextAttributes } from '@opentui/core';
import { uiColors } from '../colors';
import { GenericModal } from './GenericModal';
import { formatHelpText } from './HelpText';

export interface PassphraseModalProps {
  /** Path to the identity file that needs unlocking */
  identityFile: string;
  /** The passphrase typed so far (will be displayed as asterisks) */
  passphraseText: string;
  /** Error message if the last attempt failed, null otherwise */
  error: string | null;
}

export function PassphraseModal(props: PassphraseModalProps) {
  const masked = () => '*'.repeat(props.passphraseText.length);
  const hasInput = () => props.passphraseText.length > 0;

  // Shorten the identity file path for display (show basename + parent dir at most)
  const displayPath = () => {
    const parts = props.identityFile.replace(/^~\//, '').split('/');
    if (parts.length <= 2) return props.identityFile;
    // Show last two segments: e.g. ".ssh/id_rsa"
    return `.../${parts.slice(-2).join('/')}`;
  };

  const helpText = formatHelpText([
    { key: 'Enter', action: 'Unlock' },
    { key: 'Esc', action: 'Cancel' },
  ]);

  return (
    <GenericModal
      title="SSH Key Passphrase"
      helpText={helpText}
      widthPercent={0.4}
      heightPercent={0.22}
    >
      {/* Key file label */}
      <box
        style={{
          width: '100%',
          height: 1,
          flexDirection: 'row',
          flexShrink: 0,
          marginBottom: 1,
        }}
      >
        <text fg={uiColors.textMuted}>{'Key: '}</text>
        <text fg={uiColors.textSecondary}>{displayPath()}</text>
      </box>

      {/* Passphrase input row */}
      <box
        style={{
          width: '100%',
          height: 1,
          flexDirection: 'row',
          flexShrink: 0,
          marginBottom: 1,
        }}
      >
        <text fg={uiColors.textMuted}>{'Passphrase: '}</text>
        <text
          fg={hasInput() ? uiColors.textPrimary : uiColors.textMuted}
          attributes={hasInput() ? TextAttributes.BOLD : undefined}
        >
          {hasInput() ? masked() : 'enter passphrase...'}
        </text>
        {hasInput() && <text fg={uiColors.primary}>{'█'}</text>}
      </box>

      {/* Error message row */}
      <Show when={props.error}>
        <box
          style={{
            width: '100%',
            height: 1,
            flexDirection: 'row',
            flexShrink: 0,
          }}
        >
          <text fg={uiColors.error}>{props.error!}</text>
        </box>
      </Show>
    </GenericModal>
  );
}
