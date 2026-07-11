import { For, Show } from 'solid-js';
import type { ActionRunStore } from '../stores/action-run-store';

export function ActionsView(props: { store: ActionRunStore }) {
  const focused = () => props.store.run()?.steps.find((step) => step.id === props.store.focusedStepId());
  return <box flexDirection="row" width="100%" height="100%">
    <box flexDirection="column" width="38%" borderStyle="single" padding={1}>
      <text>Steps</text>
      <For each={props.store.run()?.steps ?? []}>{(step) =>
        <text>{`${step.id === props.store.focusedStepId() ? '› ' : '  '}${step.status === 'completed' ? '✓' : step.status === 'failed' ? '✗' : step.status === 'active' ? '⟳' : '○'} ${step.label}${step.error ? ` — ${step.error}` : ''}`}</text>
      }</For>
    </box>
    <box flexDirection="column" width="62%" borderStyle="single" padding={1}>
      <text>{`Log: ${focused()?.label ?? 'none'}`}</text>
      <For each={focused()?.commands ?? []}>{(command) => <box flexDirection="column">
        <text>{`$ ${command.command}`}</text>
        <Show when={command.stdout}><text>{command.stdout}</text></Show>
        <Show when={command.stderr}><text>{command.stderr}</text></Show>
      </box>}</For>
    </box>
  </box>;
}
