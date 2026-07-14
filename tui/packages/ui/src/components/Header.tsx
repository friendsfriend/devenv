/** @jsxImportSource @opentui/solid */
import { FrameBufferRenderable, RGBA, TextAttributes } from '@opentui/core';
import { extend, useTerminalDimensions, useTimeline } from '@opentui/solid';
import { colors, uiColors } from '../colors';
import { highlightColor } from './Highlight';
import { RunningText } from './RunningText';

export type HeaderDetail = Record<string, string | number | undefined | null>;

export interface HeaderProps {
  title: string;
  context?: string;
  detail?: string;
  details?: HeaderDetail[];
  right?: string;
  version?: string;
  severity?: 'normal' | 'success' | 'warning' | 'error';
  runningTextEnabled?: boolean;
  runningTextOffset?: number;
}

declare module '@opentui/solid' {
  interface OpenTUIComponents {
    frame_buffer: typeof FrameBufferRenderable;
  }
}

extend({ frame_buffer: FrameBufferRenderable });

const LOGO_WIDTH = 6;
const TITLE_WIDTH = 0;
const RIGHT_WIDTH = 24;
const UNDERLINE_DURATION = 1100;

function GlowingHeaderUnderline() {
  let canvas: FrameBufferRenderable | undefined;
  const background = RGBA.fromHex(uiColors.bgMantle);
  const glow = RGBA.fromHex(uiColors.primaryDim);
  const core = RGBA.fromHex(uiColors.primary);
  const state = { x: 0 };

  const draw = (position: number) => {
    if (!canvas) return;
    const frame = canvas.frameBuffer;
    frame.clear(background);
    const center = Math.round(position);
    for (let offset = -2; offset <= 2; offset++) {
      const x = center + offset;
      if (x < 0 || x >= LOGO_WIDTH) continue;
      frame.setCell(x, 0, '▁', offset === 0 ? core : glow, background);
    }
    canvas.requestRender();
  };

  const timeline = useTimeline({ duration: UNDERLINE_DURATION, loop: true });
  timeline.add(state, {
    x: LOGO_WIDTH - 1,
    duration: UNDERLINE_DURATION,
    ease: 'linear',
    onUpdate: (animation) => draw(animation.targets[0].x),
  });

  return <frame_buffer width={LOGO_WIDTH} height={1} ref={(element: FrameBufferRenderable) => {
    canvas = element;
    draw(state.x);
  }} />;
}

const colorForSeverity = (severity: HeaderProps['severity']) => {
  if (severity === 'success') return highlightColor('positive');
  if (severity === 'warning') return highlightColor('warning');
  if (severity === 'error') return highlightColor('negative');
  return highlightColor('highlight');
};

const formatDetail = (detail: HeaderDetail | undefined, fallback?: string) => {
  if (!detail) return fallback ?? '';
  const [key, value] = Object.entries(detail)[0] ?? [];
  if (!key || value === undefined || value === null || value === '') return fallback ?? '';
  return `${key}: ${value}`;
};

export function Header(props: HeaderProps) {
  const dimensions = useTerminalDimensions();
  const accent = () => colorForSeverity(props.severity);
  const primaryDetail = () => formatDetail(props.details?.[0], props.context);
  const secondaryDetail = () => formatDetail(props.details?.[1], props.detail);
  const helpText = () => props.version ? `v${props.version} · ? help` : '? help';
  const rightWidth = () => Math.min(RIGHT_WIDTH, Math.max(0, dimensions().width - LOGO_WIDTH - TITLE_WIDTH - 8));
  const middleWidth = () => Math.max(0, dimensions().width - LOGO_WIDTH - TITLE_WIDTH - rightWidth() - 4);

  return (
    <box
      backgroundColor={uiColors.bgMantle}
      style={{
        width: '100%',
        height: 2,
        flexDirection: 'column',
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      <box style={{ width: '100%', height: 1, flexDirection: 'row' }}>
        <box style={{ width: LOGO_WIDTH }}>
          <text fg={colors.mauve} attributes={TextAttributes.BOLD}>DΞV</text>
        </box>
        <box style={{ width: middleWidth() }}>
          <RunningText text={primaryDetail()} width={middleWidth()} fg={highlightColor('secondary')} enabled={props.runningTextEnabled} active offset={props.runningTextOffset} />
        </box>
        <box style={{ flexGrow: 1 }} />
        <box style={{ width: rightWidth() }}>
          <RunningText text={props.right ?? ''} width={rightWidth()} align="right" fg={accent()} enabled={props.runningTextEnabled} active offset={props.runningTextOffset} />
        </box>
      </box>
      <box style={{ width: '100%', height: 1, flexDirection: 'row' }}>
        <box style={{ width: LOGO_WIDTH }}>
          <GlowingHeaderUnderline />
        </box>
        <box style={{ width: middleWidth() }}>
          <RunningText text={secondaryDetail()} width={middleWidth()} fg={highlightColor('secondary')} enabled={props.runningTextEnabled} active offset={props.runningTextOffset} />
        </box>
        <box style={{ flexGrow: 1 }} />
        <box style={{ width: rightWidth() }}>
          <RunningText text={helpText()} width={rightWidth()} align="right" fg={highlightColor('secondary')} enabled={props.runningTextEnabled} active offset={props.runningTextOffset} />
        </box>
      </box>
    </box>
  );
}
