import { For } from 'solid-js';
import { TextAttributes } from '@opentui/core';
import { uiColors, Badge, HighlightedText, GenericModal } from '@devenv/ui';

export type ProgressSplashStepStatus = 'done' | 'current' | 'pending' | 'failed';

export interface ProgressSplashStep<Phase extends string> {
  phase: Phase;
  label: string;
}

interface ProgressSplashProps<Phase extends string> {
  title: string;
  message: string;
  steps: ProgressSplashStep<Phase>[];
  statusForStep: (phase: Phase) => ProgressSplashStepStatus;
  failed?: boolean;
  failureTitle: string;
  failureMessage: string;
  failureHint: string;
  failureDetail?: string;
  spinnerFrames?: string[];
  spinnerFrame?: () => number;
}

export function ProgressSplash<Phase extends string>(props: ProgressSplashProps<Phase>) {
  const spinner = () => {
    if (!props.spinnerFrames || !props.spinnerFrame) return '~';
    return props.spinnerFrames[props.spinnerFrame() % props.spinnerFrames.length];
  };

  const statusIcon = (status: ProgressSplashStepStatus) => {
    if (status === 'done') return <text fg={uiColors.success}>✓ </text>;
    if (status === 'current') return <text fg={uiColors.primary} attributes={TextAttributes.BOLD}>{spinner()} </text>;
    if (status === 'failed') return <text fg={uiColors.error} attributes={TextAttributes.BOLD}>✗ </text>;
    return <text fg={uiColors.textMuted}>  </text>;
  };

  const failureContent = () => <box style={{ flexDirection: 'column', flexGrow: 1 }}>{[
    <box style={{ height: 1, flexShrink: 0 }} />,
    <Badge text={props.failureTitle} highlight="negative" />,
    <box style={{ height: 1, flexShrink: 0 }} />,
    <box style={{ paddingLeft: 1 }}><text fg={uiColors.textPrimary}>{props.failureDetail || props.failureMessage}</text></box>,
    <box style={{ height: 1, flexShrink: 0 }} />,
    <box style={{ paddingLeft: 1 }}><text fg={uiColors.textSecondary}>{props.failureHint}</text></box>,
    <box style={{ paddingLeft: 1 }}><text fg={uiColors.textMuted}>{props.failureMessage}</text></box>,
  ]}</box>;

  const progressContent = () => <box style={{ flexDirection: 'column', flexGrow: 1 }}>{[
    <box style={{ paddingLeft: 1 }}><text fg={uiColors.textPrimary}>{props.message}</text></box>,
    <box style={{ width: '100%', height: 1, flexShrink: 0 }} />,
    <For each={props.steps}>{(step) => {
      const status = () => props.statusForStep(step.phase);
      return <box style={{ height: 1, flexDirection: 'row', flexShrink: 0, paddingLeft: 1 }}>{[
        statusIcon(status()),
        <HighlightedText
          text={step.label}
          highlight={status() === 'done' ? 'positive' : status() === 'current' ? 'primary' : status() === 'failed' ? 'negative' : 'secondary'}
        />,
      ]}</box>;
    }}</For>,
  ]}</box>;

  return (
    <GenericModal
      title={props.title}
      helpText=""
      customFooter={<box style={{ height: 0 }} />}
      widthPercent={0.5}
      heightPercent={0.45}
    >
      {props.failed ? failureContent() : progressContent()}
    </GenericModal>
  );
}
