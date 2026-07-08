import { For, Show } from 'solid-js';
import { TextAttributes } from '@opentui/core';
import { uiColors, Badge, HighlightedText, GenericModal } from '@devenv/ui';
import type { AppStore, StartupPhase } from '../stores';

interface StartupSplashProps {
  appStore: AppStore;
  spinnerFrames?: string[];
  spinnerFrame?: () => number;
}

const phaseLabels: Record<Exclude<StartupPhase, 'failed'>, string> = {
  connecting: 'Connecting to server',
  'server-ready': 'Server ready',
  'loading-applications': 'Loading applications',
  'loading-scripts': 'Loading scripts',
  'loading-providers': 'Loading providers',
  'loading-infrastructure': 'Loading infrastructure',
  complete: 'Startup complete',
};

const phaseOrder: Exclude<StartupPhase, 'failed'>[] = [
  'connecting',
  'server-ready',
  'loading-applications',
  'loading-scripts',
  'loading-providers',
  'loading-infrastructure',
  'complete',
];

function phaseStatus(current: StartupPhase, phase: Exclude<StartupPhase, 'failed'>): 'done' | 'current' | 'pending' {
  if (current === 'failed') return 'pending';
  const currentIndex = phaseOrder.indexOf(current);
  const phaseIndex = phaseOrder.indexOf(phase);
  if (phaseIndex < currentIndex) return 'done';
  if (phaseIndex === currentIndex) return 'current';
  return 'pending';
}

export function StartupSplash(props: StartupSplashProps) {
  const state = () => props.appStore.startupState();
  const currentPhase = () => state().phase;
  const isFailed = () => currentPhase() === 'failed' || Boolean(state().error);
  const spinner = () => {
    if (!props.spinnerFrames || !props.spinnerFrame) return '~';
    return props.spinnerFrames[props.spinnerFrame() % props.spinnerFrames.length];
  };

  return (
    <GenericModal
      title="DevEnv Startup"
      helpText=""
      customFooter={<box style={{ height: 0 }} />}
      widthPercent={0.5}
      heightPercent={0.45}
    >
      <Show
        when={!isFailed()}
        fallback={
          <box style={{ flexDirection: 'column', flexGrow: 1 }}>
            <box style={{ height: 1, flexShrink: 0 }} />
            <Badge text="Connection failed" highlight="negative" />
            <box style={{ height: 1, flexShrink: 0 }} />
            <box style={{ paddingLeft: 1 }}>
              <text fg={uiColors.textPrimary}>{state().error || state().message}</text>
            </box>
            <box style={{ height: 1, flexShrink: 0 }} />
            <box style={{ paddingLeft: 1 }}>
              <text fg={uiColors.textSecondary}>Quit and restart to retry.</text>
            </box>
            <box style={{ paddingLeft: 1 }}>
              <text fg={uiColors.textMuted}>Inspect server logs at $DEVENV_HOME/logs/server.log or ~/devenv/logs/server.log.</text>
            </box>
          </box>
        }
      >
        <box style={{ flexDirection: 'column', flexGrow: 1 }}>
          <box style={{ paddingLeft: 1 }}>
            <text fg={uiColors.textPrimary}>
              {state().message}
            </text>
          </box>

          <box style={{ width: '100%', height: 1, flexShrink: 0 }} />

          <For each={phaseOrder.filter((phase) => phase !== 'complete')}>
            {(phase) => {
              const status = () => phaseStatus(currentPhase(), phase);
              return (
                <box style={{ height: 1, flexDirection: 'row', flexShrink: 0, paddingLeft: 1 }}>
                  <Show when={status() === 'done'}>
                    <text fg={uiColors.success}>✓ </text>
                  </Show>
                  <Show when={status() === 'current'}>
                    <text fg={uiColors.primary} attributes={TextAttributes.BOLD}>{spinner()} </text>
                  </Show>
                  <Show when={status() === 'pending'}>
                    <text fg={uiColors.textMuted}>  </text>
                  </Show>
                  <HighlightedText
                    text={phaseLabels[phase]}
                    highlight={status() === 'done' ? 'positive' : status() === 'current' ? 'primary' : 'secondary'}
                  />
                </box>
              );
            }}
          </For>
        </box>
      </Show>
    </GenericModal>
  );
}
