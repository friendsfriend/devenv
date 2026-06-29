import { TextAttributes } from '@opentui/core';
import { useTerminalDimensions } from '@opentui/solid';
import { colors, uiColors } from '../colors';
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

const LOGO_WIDTH = 6;
const TITLE_WIDTH = 0;
const RIGHT_WIDTH = 24;

const colorForSeverity = (severity: HeaderProps['severity']) => {
  if (severity === 'success') return uiColors.success;
  if (severity === 'warning') return uiColors.warning;
  if (severity === 'error') return uiColors.error;
  return uiColors.primary;
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
          <RunningText text={primaryDetail()} width={middleWidth()} fg={uiColors.textSecondary} enabled={props.runningTextEnabled} active offset={props.runningTextOffset} />
        </box>
        <box style={{ flexGrow: 1 }} />
        <box style={{ width: rightWidth() }}>
          <RunningText text={props.right ?? ''} width={rightWidth()} align="right" fg={accent()} enabled={props.runningTextEnabled} active offset={props.runningTextOffset} />
        </box>
      </box>
      <box style={{ width: '100%', height: 1, flexDirection: 'row' }}>
        <box style={{ width: LOGO_WIDTH }}>
          <text fg={colors.peach} attributes={TextAttributes.BOLD}>ΞNV</text>
        </box>
        <box style={{ width: middleWidth() }}>
          <RunningText text={secondaryDetail()} width={middleWidth()} fg={uiColors.textMuted} enabled={props.runningTextEnabled} active offset={props.runningTextOffset} />
        </box>
        <box style={{ flexGrow: 1 }} />
        <box style={{ width: rightWidth() }}>
          <RunningText text={helpText()} width={rightWidth()} align="right" fg={uiColors.textMuted} enabled={props.runningTextEnabled} active offset={props.runningTextOffset} />
        </box>
      </box>
    </box>
  );
}
