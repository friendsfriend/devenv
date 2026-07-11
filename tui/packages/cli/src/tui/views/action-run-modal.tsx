import { For, Show, createMemo } from 'solid-js';
import { TextAttributes } from '@opentui/core';
import { GenericModal, PanelBox, ScrollableContent, uiColors, highlightColor, formatProfileLabel } from '@devenv/ui';
import type { ActionRunStore } from '../stores/action-run-store';

export function ActionRunModal(props: { store: ActionRunStore; onClose: () => void; spinner?: string }) {
  const icon = (status: string) => status === 'completed' ? '✓' : status === 'failed' || status === 'canceled' ? '✗' : status === 'active' ? (props.spinner ?? '⟳') : '○';
  const statusColor = (status: string) => status === 'completed' ? highlightColor('positive') : status === 'failed' || status === 'canceled' ? highlightColor('negative') : status === 'active' ? highlightColor('primary') : highlightColor('secondary');
  const actionLabel = (action: string | undefined) => action === 'run' ? 'Start' : action ? `${action[0].toUpperCase()}${action.slice(1)}` : '';
  const runLabel = (run: NonNullable<ReturnType<ActionRunStore['run']>>) => {
    const action = actionLabel(run.action);
    return action && ['run', 'start', 'build', 'test'].includes(run.action ?? '') ? `${action} ${run.targetLabel || formatProfileLabel(run.profile)}` : action || run.title;
  };
  const selected = () => props.store.selectedNode();
  const selectedStep = createMemo(() => {
    const node = selected();
    if (node?.kind === 'step') return node.step;
    if (node?.kind !== 'action') return undefined;
    if (['build', 'test', 'stop'].includes(node.run.action ?? '')) return node.run.steps[0];
    return node.run.steps.find((step) => !step.parentId && /^Start application: /.test(step.label));
  });
  const logTitle = () => {
    const node = selected();
    if (!node) return 'waiting';
    return node.kind === 'action' ? runLabel(node.run) : node.kind === 'step' ? node.step.label : 'older actions';
  };

  return <GenericModal hideHeader title={props.store.run()?.title ?? 'Action'} helpText={[{ key: 'J/K', action: 'Panel' }, { key: 'j/k', action: 'Scroll/select' }, { key: 'Enter', action: 'Collapse' }, { key: 'd/u', action: 'Half page' }, { key: 'g/G', action: 'Top/bottom' }, { key: 'Esc', action: 'Close' }]} widthPercent={0.9} heightPercent={0.9} onBackdropClick={props.onClose}>
    <box backgroundColor={uiColors.bgMantle} style={{ width: '100%', height: '100%', flexDirection: 'column', minHeight: 0 }}>
      <box backgroundColor={uiColors.bgBase} style={{ width: '100%', flexGrow: 1, flexDirection: 'row', minHeight: 0 }}>
        <box backgroundColor={uiColors.bgBase} style={{ width: '38%', height: '100%', flexDirection: 'column' }}>
          <PanelBox title="Steps" active={props.store.focusedPanel() === 0}>
            <box style={{ width: '100%', flexGrow: 1, flexDirection: 'column', overflow: 'hidden' }}>
              <For each={props.store.visibleNodes()}>{(node) => {
                const activeSelection = () => node.key === props.store.focusedTreeKey() && props.store.focusedPanel() === 0;
                const status = () => node.kind === 'action' ? node.run.status : node.kind === 'step' ? node.step.status : 'pending';
                const collapsed = () => node.kind === 'action' ? node.run.collapsed : node.kind === 'step' ? node.step.collapsed : false;
                const label = () => node.kind === 'action' ? runLabel(node.run) : node.kind === 'step' ? node.step.label : 'Load actions from last 24 hours';
                return <box onMouseUp={() => { props.store.focusTreeNode(node); props.store.setFocusedPanel(0); }} backgroundColor={activeSelection() ? uiColors.bgSurface0 : undefined} style={{ width: '100%', height: 1, flexDirection: 'row' }}>
                  <box backgroundColor={activeSelection() ? highlightColor('highlight') : undefined} style={{ width: 1, height: '100%', flexShrink: 0 }} />
                  <box style={{ flexGrow: 1, flexDirection: 'row', paddingRight: 1, minWidth: 0 }}>
                    <text fg={statusColor(status())}>{node.kind === 'loadOlder' ? '  + ' : `${'  '.repeat(node.depth)}${node.hasChildren ? (collapsed() ? '▸' : '▾') : ' '} ${icon(status())} `}</text>
                    <text fg={uiColors.textPrimary} attributes={activeSelection() ? TextAttributes.BOLD : undefined}>{label()}</text>
                  </box>
                </box>;
              }}</For>
            </box>
          </PanelBox>
        </box>
        <box backgroundColor={uiColors.bgBase} style={{ width: '62%', height: '100%', flexDirection: 'column' }}>
          <box onMouseUp={() => props.store.setFocusedPanel(1)} style={{ width: '100%', height: '100%', flexDirection: 'column', minHeight: 0 }}>
            <PanelBox title={`Log: ${logTitle()}`} active={props.store.focusedPanel() === 1}>
              <ScrollableContent axes={['x', 'y']} keyboardAxes={['x']} stickyScroll stickyStart="bottom" viewportCulling style={{ width: '100%', flexGrow: 1, minHeight: 0 }} onScrollBoxReady={(ref) => { props.store.logScrollBoxRef = ref; }}>
                <box style={{ flexDirection: 'column', paddingLeft: 1, paddingRight: 1 }}>
                  <For each={selectedStep()?.commands ?? []}>{(command) => <box style={{ flexDirection: 'column' }}>
                    <text fg={uiColors.textPrimary}>{`$ ${command.command}`}</text>
                    <For each={command.stdout.replace(/\s+$/, '').split('\n').filter(Boolean)}>{(line) => <text>{line}</text>}</For>
                    <For each={command.stderr.replace(/\s+$/, '').split('\n').filter(Boolean)}>{(line) => <text fg={highlightColor('negative')}>{line}</text>}</For>
                    <Show when={command.status === 'completed'}><text fg={highlightColor('positive')}>[exit 0]</text></Show>
                    <Show when={command.status === 'failed'}><text fg={highlightColor('negative')}>{`[exit failed]${command.error ? ` ${command.error}` : ''}`}</text></Show>
                  </box>}</For>
                </box>
              </ScrollableContent>
            </PanelBox>
          </box>
        </box>
      </box>
      <box backgroundColor={uiColors.bgMantle} style={{ width: '100%', height: 1, flexShrink: 0 }} />
    </box>
  </GenericModal>;
}
