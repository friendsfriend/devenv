import { TextAttributes } from '@opentui/core';
import { uiColors } from '../colors';
import { GenericModal } from './GenericModal';
import { formatHelpText } from './HelpText';

export interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const confirmText = () => props.confirmText || 'y';
  const cancelText = () => props.cancelText || 'n';

  return (
    <GenericModal
      title={props.title}
      helpText={formatHelpText([
        { key: confirmText(), action: 'Confirm' },
        { key: cancelText(), action: 'Cancel' },
      ])}
      widthPercent={0.4}
      heightPercent={0.25}
      customHeader={
        <box
          style={{
            width: '100%',
            height: 1,
            justifyContent: 'flex-start',
            flexDirection: 'row',
            flexShrink: 0,
          }}
        >
          <text
            fg={uiColors.warning}
            attributes={TextAttributes.BOLD}
          >
            ⚠ {props.title}
          </text>
        </box>
      }
    >
      <box
        style={{
          width: '100%',
          flexDirection: 'column',
          paddingTop: 1,
          paddingBottom: 1,
          justifyContent: 'center',
          alignItems: 'center',
          flexGrow: 1,
        }}
      >
        <text fg={uiColors.textPrimary}>
          {props.message}
        </text>
      </box>
    </GenericModal>
  );
}
