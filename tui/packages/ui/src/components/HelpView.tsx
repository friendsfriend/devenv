import { TextAttributes } from '@opentui/core';
import { uiColors } from '../colors';
import { type JSX } from 'solid-js';
import { HelpText } from './HelpText';

export interface HelpSection {
  title: string;
  items: Array<{
    key: string;
    description: string;
  }>;
}

export interface HelpViewProps {
  sections: HelpSection[];
  viewTitle: string;
  onClose?: () => void;
}

export function HelpView(props: HelpViewProps): JSX.Element {
  return (
    <box
      style={{
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        padding: 1,
      }}
    >
      {/* Outer border container */}
      <box
        style={{
          width: '100%',
          height: '100%',
          flexDirection: 'column',
          borderStyle: 'rounded',
          borderColor: uiColors.textMuted,
          padding: 2,
        }}
      >
        {/* Help Header */}
        <box
          style={{
            width: '100%',
            flexDirection: 'column',
            marginBottom: 1,
          }}
        >
          <text fg={uiColors.primary} attributes={TextAttributes.BOLD}>
            Help: {props.viewTitle}
          </text>
          <text style={{ fg: uiColors.textMuted }}>
            Available keyboard shortcuts and actions
          </text>
        </box>

        {/* Border separator */}
        <box style={{ width: '100%', marginBottom: 1 }}>
          <text style={{ fg: uiColors.textMuted }}>
            {'─'.repeat(74)}
          </text>
        </box>

        {/* Help Content - all sections rendered as text */}
        <box
          flexGrow={1}
          style={{
            width: '100%',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {props.sections.map((section, sectionIdx) => (
            <box style={{ width: '100%', flexDirection: 'column', marginBottom: 2 }}>
              {/* Section Title */}
              <text style={{ fg: uiColors.borderHighlight, attributes: TextAttributes.BOLD, marginBottom: 1 }}>
                {section.title}
              </text>

              {/* Section Items */}
              {section.items.map((item, itemIdx) => (
                <box style={{ width: '100%', marginBottom: 1, paddingLeft: 2 }}>
                  <text style={{ fg: uiColors.primary, width: 20 }}>
                    {item.key}
                  </text>
                  <text style={{ fg: uiColors.textPrimary }}>
                    {item.description}
                  </text>
                </box>
              ))}
            </box>
          ))}

          {/* Footer message */}
          <box style={{ width: '100%', marginTop: 2, paddingTop: 1 }}>
            <HelpText entries={[
              { key: 'Esc or ?', action: 'Close Help' }
            ]} textColor={uiColors.textSecondary} />
          </box>
        </box>
      </box>
    </box>
  );
}
