import { For, Show } from 'solid-js';
import { TextAttributes } from '@opentui/core';
import { uiColors } from '@devenv/ui';
import type { AppStore, StartupPhase } from '../stores';

interface StartupSplashProps {
  appStore: AppStore;
}

const phaseLabels: Record<Exclude<StartupPhase, 'failed'>, string> = {
  connecting: 'Connecting to server',
  'server-ready': 'Server ready',
  'loading-applications': 'Loading applications',
  'loading-infrastructure': 'Loading infrastructure',
  complete: 'Startup complete',
};

const phaseOrder: Exclude<StartupPhase, 'failed'>[] = [
  'connecting',
  'server-ready',
  'loading-applications',
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

  return (
    <box
      style={{
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <box
        border
        borderStyle="rounded"
        borderColor={isFailed() ? uiColors.error : uiColors.primary}
        style={{
          width: 64,
          flexDirection: 'column',
          paddingLeft: 4,
          paddingRight: 4,
          paddingTop: 2,
          paddingBottom: 2,
          gap: 1,
        }}
      >
        <text fg={isFailed() ? uiColors.error : uiColors.primary} attributes={TextAttributes.BOLD}>
          DevEnv Startup
        </text>

        <Show
          when={!isFailed()}
          fallback={
            <box style={{ flexDirection: 'column', gap: 1 }}>
              <text fg={uiColors.error} attributes={TextAttributes.BOLD}>Connection failed</text>
              <text fg={uiColors.textPrimary}>{state().error || state().message}</text>
              <text fg={uiColors.textSecondary}>Quit and restart to retry.</text>
              <text fg={uiColors.textSecondary}>Inspect server logs at $DEVENV_HOME/logs/server.log or ~/devenv/logs/server.log.</text>
            </box>
          }
        >
          <box style={{ flexDirection: 'column', gap: 1 }}>
            <text fg={uiColors.textPrimary}>
              {state().message}
            </text>

            <For each={phaseOrder.filter((phase) => phase !== 'complete')}>
              {(phase) => {
                const status = () => phaseStatus(currentPhase(), phase);
                return (
                  <text fg={status() === 'done' ? uiColors.success : status() === 'current' ? uiColors.primary : uiColors.textSecondary}>
                    {status() === 'done' ? '[x]' : status() === 'current' ? '>' : ' '} {phaseLabels[phase]}
                  </text>
                );
              }}
            </For>
          </box>
        </Show>
      </box>
    </box>
  );
}
