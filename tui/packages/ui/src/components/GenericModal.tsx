import { JSX } from 'solid-js';
import { RGBA } from '@opentui/core';
import { useTerminalDimensions } from '@opentui/solid';
import { uiColors } from '../colors';
import { TextAttributes } from '@opentui/core';

export interface GenericModalProps {
  /** Modal title displayed in header */
  title: string;
  /** Footer help text */
  helpText: string;
  /** Main content to render in the middle section */
  children: JSX.Element;
  /** Width as percentage of screen (0-1), default 0.5 (50%) */
  widthPercent?: number;
  /** Height as percentage of screen (0-1), default 0.7 (70%) */
  heightPercent?: number;
  /** Optional custom header content (replaces default title) */
  customHeader?: JSX.Element;
  /** Optional custom footer content (replaces default help text) */
  customFooter?: JSX.Element;
  /** Click handler for backdrop */
  onBackdropClick?: () => void;
}

/**
 * GenericModal - Reusable modal component with consistent styling
 * 
 * Layout structure:
 * - HEADER: Title (or custom header)
 * - MIDDLE: Custom content (children)
 * - FOOTER: Help text (or custom footer)
 * 
 * Features:
 * - Consistent padding and spacing across all modals
 * - Configurable size (width/height percentages)
 * - Semi-transparent backdrop
 * - Flexbox layout with proper content overflow handling
 */
export function GenericModal(props: GenericModalProps) {
  const dimensions = useTerminalDimensions();

  const dialogWidth = () => Math.floor(dimensions().width * (props.widthPercent ?? 0.5));
  const dialogHeight = () => Math.floor(dimensions().height * (props.heightPercent ?? 0.7));

  return (
    <box
      position="absolute"
      top={0}
      left={0}
      width={dimensions().width}
      height={dimensions().height}
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      backgroundColor={RGBA.fromInts(0, 0, 0, 150)}
      onMouseUp={() => props.onBackdropClick?.()}
    >
      {/* Dialog box */}
      <box
        backgroundColor={uiColors.bgMantle}
        width={dialogWidth()}
        height={dialogHeight()}
        flexDirection="column"
        paddingTop={1}
        paddingBottom={1}
        paddingLeft={2}
        paddingRight={2}
        onMouseUp={(e: any) => e.stopPropagation()}
      >
        {/* HEADER */}
        {props.customHeader ? (
          props.customHeader
        ) : (
          <box
            style={{
              width: '100%',
              height: 1,
              justifyContent: 'flex-start',
              flexDirection: 'row',
              flexShrink: 0,
            }}
          >
            <text fg={uiColors.primary} attributes={TextAttributes.BOLD}>
              {props.title}
            </text>
          </box>
        )}

        {/* MIDDLE CONTENT */}
        <box
          style={{
            width: '100%',
            flexDirection: 'column',
            flexGrow: 1,
            flexShrink: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {props.children}
        </box>

        {/* FOOTER */}
        {props.customFooter ? (
          props.customFooter
        ) : (
          <box
            style={{
              width: '100%',
              height: 1,
              justifyContent: 'flex-start',
              flexDirection: 'row',
              flexShrink: 0,
            }}
          >
            <text style={{ fg: uiColors.textSecondary }}>{props.helpText}</text>
          </box>
        )}
      </box>
    </box>
  );
}
