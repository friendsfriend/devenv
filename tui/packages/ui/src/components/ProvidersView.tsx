import { TextAttributes } from '@opentui/core';
import { Show, For } from 'solid-js';
import { uiColors } from '../colors';
import type { Provider } from '@devenv/types';

interface ProvidersViewProps {
  providers: Provider[];
  loading?: boolean;
  error?: string;
  onClose: () => void;
  selectedProviderIndex?: number;
}

export function ProvidersView(props: ProvidersViewProps) {
  const renderSecret = (hasValue: boolean): string => {
    return hasValue ? '••••••••' : 'Not configured';
  };

  const getSecretColor = (hasValue: boolean) => {
    return hasValue ? uiColors.success : uiColors.error;
  };

  return (
    <box
      border={true}
      borderStyle="rounded"
      borderColor={uiColors.textMuted}
      style={{
        width: '100%',
        height: '100%',
        flexDirection: 'column',
      }}
    >
      <Show when={props.loading}>
        <box
          style={{
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <text style={{ fg: uiColors.primary }}>Loading providers...</text>
        </box>
      </Show>

      <Show when={!props.loading && props.error}>
        <box
          style={{
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <text style={{ fg: uiColors.error }}>{props.error}</text>
        </box>
      </Show>

      <Show when={!props.loading && !props.error}>
        <box
          style={{
            width: '100%',
            height: '100%',
            flexDirection: 'column',
            paddingLeft: 2,
            paddingRight: 2,
          }}
        >
          <box style={{ width: '100%' }}>
            <text fg={uiColors.borderHighlight} attributes={TextAttributes.BOLD}>
              Providers
            </text>
            <text fg={uiColors.textMuted}>{'  (a: add, e: edit, d: delete)'}</text>
          </box>

          <Show when={props.providers.length === 0}>
            <box style={{ width: '100%', height: 1, flexShrink: 0 }}>
              <text fg={uiColors.textMuted}>No providers configured. Press 'a' to add one.</text>
            </box>
          </Show>

          <For each={props.providers}>
            {(provider: Provider, idx) => {
              const isSelected = () => (props.selectedProviderIndex ?? -1) === idx();
              const typeLabel = provider.type === 'github' ? 'GitHub' : 'GitLab';

              return (
                <box style={{ width: '100%', flexDirection: 'row', height: 1, flexShrink: 0 }}>
                  <text fg={isSelected() ? uiColors.primary : uiColors.textMuted}>
                    {isSelected() ? '▸ ' : '  '}
                  </text>
                  <box style={{ width: 20 }}>
                    <text
                      fg={isSelected() ? uiColors.primary : uiColors.textPrimary}
                      attributes={isSelected() ? TextAttributes.BOLD : undefined}
                    >
                      {provider.name}
                    </text>
                  </box>
                  <box style={{ width: 10 }}>
                    <text fg={uiColors.textSecondary}>{typeLabel}</text>
                  </box>
                  <box style={{ width: 20 }}>
                    <text fg={uiColors.textSecondary}>
                      {provider.username || '(no user)'}
                    </text>
                  </box>
                  <text fg={getSecretColor(provider.has_token)}>
                    {renderSecret(provider.has_token)}
                  </text>
                </box>
              );
            }}
          </For>
        </box>
      </Show>
    </box>
  );
}
