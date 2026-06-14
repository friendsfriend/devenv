import { type JSX } from '@opentui/solid';
import { TextAttributes } from '@opentui/core';
import { uiColors } from '../colors';

export interface HeaderProps {
  title: string;
  subtitle?: string;
}

/**
 * Application header with title, centered subtitle, and branding
 */
export function Header(props: HeaderProps) {
  return (
    <box
      border={true}
      borderStyle="rounded"
      borderColor={uiColors.borderHighlight}
      style={{
        width: '100%',
        height: 3,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 2,
        paddingRight: 2,
      }}
    >
      {/* Left: App branding - natural width */}
      <text
        fg={uiColors.primary}
        attributes={TextAttributes.BOLD}
      >
        DevEnv CLI
      </text>

      {/* Left spacer - takes equal space */}
      <box style={{ flexGrow: 1 }} />

      {/* Center: Current screen title */}
      {props.subtitle && (
        <text
          fg={uiColors.primary}
          attributes={TextAttributes.BOLD}
        >
          {props.subtitle}
        </text>
      )}

      {/* Right spacer - takes equal space */}
      <box style={{ flexGrow: 1 }} />

      {/* Right: Environment/mode - natural width */}
      <text
        style={{
          fg: uiColors.textSecondary,
        }}
      >
        {props.title}
      </text>
    </box>
  );
}
