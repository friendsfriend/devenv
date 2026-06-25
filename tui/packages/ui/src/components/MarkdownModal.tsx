import { ScrollBoxRenderable } from '@opentui/core';
import { useTerminalDimensions } from '@opentui/solid';
import { uiColors, SCROLLBAR_OPTIONS } from '../colors';
import { getMarkdownSyntaxStyle } from '../markdownSyntax';
import { GenericModal } from './GenericModal';
import { formatHelpText } from './HelpText';

export interface MarkdownModalProps {
  title: string;
  content: string;
  hideTitle?: boolean;
  onScrollBoxReady?: (scrollBox: ScrollBoxRenderable) => void;
}

export function MarkdownModal(props: MarkdownModalProps) {
  const dimensions = useTerminalDimensions();
  const contentWidth = () => Math.max(40, Math.floor(dimensions().width * 0.7) - 4);

  return (
    <GenericModal
      title={props.title}
      helpText={formatHelpText([{ key: 'Esc', action: 'Close' }])}
      widthPercent={0.7}
      heightPercent={0.75}
      customHeader={props.hideTitle ? <box style={{ height: 0 }} /> : undefined}
    >
      <scrollbox
        ref={(r: ScrollBoxRenderable) => props.onScrollBoxReady?.(r)}
        scrollbarOptions={SCROLLBAR_OPTIONS}
        style={{ flexGrow: 1, flexShrink: 1, minHeight: 0 }}
      >
        <code
          filetype="markdown"
          content={props.content}
          syntaxStyle={getMarkdownSyntaxStyle()}
          drawUnstyledText={false}
          fg={uiColors.textSecondary}
          width={contentWidth()}
        />
      </scrollbox>
    </GenericModal>
  );
}
