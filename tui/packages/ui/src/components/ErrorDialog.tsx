/** @jsxImportSource @opentui/solid */
import { TextAttributes } from '@opentui/core';
import { uiColors } from '../colors';
import { GenericModal } from './GenericModal';
import { formatHelpText } from './HelpText';

export interface ErrorDialogProps {
  title: string;
  message: string;
  onClose: () => void;
}

/**
 * Error dialog component
 * Displays error messages in a centered modal dialog
 */
export function ErrorDialog(props: ErrorDialogProps) {
  return (
    <GenericModal
      title={`✗ ${props.title}`}
      helpText={formatHelpText([
        { key: 'c', action: 'Copy' },
        { key: 'Esc', action: 'Close' }
      ])}
      widthPercent={0.4}
      heightPercent={0.3}
      onBackdropClick={props.onClose}
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
            fg={uiColors.error}
            attributes={TextAttributes.BOLD}
          >
            ✗ {props.title}
          </text>
        </box>
      }
    >
      {/* Error message */}
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
