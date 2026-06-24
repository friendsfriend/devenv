import { ScrollBoxRenderable } from '@opentui/core';
import { uiColors, SCROLLBAR_OPTIONS } from '../colors';
import { getMarkdownSyntaxStyle } from '../markdownSyntax';
import { GenericModal } from './GenericModal';
import { formatHelpText } from './HelpText';

export interface MarkdownModalProps {
  title: string;
  content: string;
  onScrollBoxReady?: (scrollBox: ScrollBoxRenderable) => void;
}

export function MarkdownModal(props: MarkdownModalProps) {
  return (
    <GenericModal
      title=""
      helpText={formatHelpText([{ key: 'Esc', action: 'Close' }])}
      widthPercent={0.7}
      heightPercent={0.75}
      customHeader={<box style={{ height: 0 }} />}
    >
      <scrollbox
        ref={(r: ScrollBoxRenderable) => props.onScrollBoxReady?.(r)}
        scrollbarOptions={SCROLLBAR_OPTIONS}
        style={{ flexGrow: 1, flexShrink: 1, minHeight: 0 }}
      >
        <markdown
          content={props.content}
          syntaxStyle={getMarkdownSyntaxStyle()}
          fg={uiColors.textSecondary}
          width={90}
        />
      </scrollbox>
    </GenericModal>
  );
}
