import { createSignal } from 'solid-js';
import type { ActionCommand, ActionRun, ActionStep, ActionRunStatus } from '@devenv/types';

export type ActionTreeNode =
  | { key: string; kind: 'action'; run: ActionRun; depth: 0; hasChildren: boolean }
  | { key: string; kind: 'step'; run: ActionRun; step: ActionStep; depth: number; hasChildren: boolean }
  | { key: 'load-older-actions'; kind: 'loadOlder'; depth: 0; hasChildren: false };

export function createActionRunStore() {
  const [runs, setRuns] = createSignal<ActionRun[]>([]);
  const [selectedRunId, setSelectedRunId] = createSignal<string | null>(null);
  const [focusedStepId, setFocusedStepId] = createSignal<string | null>(null);
  const [focusedStepKey, setFocusedStepKey] = createSignal<string | null>(null);
  const [focusedPanel, setFocusedPanel] = createSignal<0 | 1>(0);
  const [focusedNode, setFocusedNode] = createSignal<'action' | 'step' | 'loadOlder'>('action');
  const [hasOlderHistory, setHasOlderHistory] = createSignal(true);
  let loadOlderHistoryHandler: (() => Promise<void>) | undefined;
  const [userMovedFocus, setUserMovedFocus] = createSignal(false);
  let logScrollBoxRef: import('@opentui/core').ScrollBoxRenderable | undefined;
  const pendingOutput = new Map<string, { runId: string; commandId: string; stdout: string; stderr: string }>();
  let outputFlushTimer: ReturnType<typeof setTimeout> | undefined;

  const run = () => runs().find((candidate) => candidate.id === selectedRunId()) ?? null;
  const stepKey = (runId: string, stepId: string) => `step:${runId}:${stepId}`;
  const actionKey = (runId: string) => `action:${runId}`;
  const setRunById = (id: string, update: (current: ActionRun) => ActionRun) => setRuns((current) => current.map((candidate) => candidate.id === id ? update(candidate) : candidate));

  const flushOutput = () => {
    outputFlushTimer = undefined;
    if (pendingOutput.size === 0) return;
    const updates = new Map(pendingOutput);
    pendingOutput.clear();
    setRuns((current) => current.map((item) => ({ ...item, steps: item.steps.map((step) => ({
      ...step,
      commands: step.commands.map((command) => {
        const pending = updates.get(`${item.id}:${command.id}`);
        return pending ? { ...command, stdout: command.stdout + pending.stdout, stderr: command.stderr + pending.stderr } : command;
      }),
    })) })));
  };
  const queueOutput = (runId: string, commandId: string, stream: 'stdout' | 'stderr', output: string) => {
    const key = `${runId}:${commandId}`;
    const pending = pendingOutput.get(key) ?? { runId, commandId, stdout: '', stderr: '' };
    pending[stream] += output;
    pendingOutput.set(key, pending);
    if (!outputFlushTimer) outputFlushTimer = setTimeout(flushOutput, 50);
  };

  const childMap = (action: ActionRun) => {
    const hiddenRoots = new Set(action.steps.filter((step) => !step.parentId && /^Start application: /.test(step.label)).map((step) => step.id));
    const children = new Map<string, ActionStep[]>();
    for (const step of action.steps) {
      if (hiddenRoots.has(step.id)) continue;
      const parent = step.parentId && hiddenRoots.has(step.parentId) ? '' : (step.parentId ?? '');
      const list = children.get(parent) ?? [];
      list.push(step);
      children.set(parent, list);
    }
    return children;
  };
  const entriesForRun = (action: ActionRun) => {
    const children = childMap(action);
    const result: Array<{ step: ActionStep; key: string; depth: number; hasChildren: boolean }> = [];
    const visited = new Set<string>();
    const visit = (parentId: string, depth: number) => {
      for (const step of children.get(parentId) ?? []) {
        if (visited.has(step.id)) continue;
        visited.add(step.id);
        result.push({ step, key: stepKey(action.id, step.id), depth, hasChildren: (children.get(step.id)?.length ?? 0) > 0 });
        if (!step.collapsed) visit(step.id, depth + 1);
      }
    };
    visit('', 1);
    return result;
  };
  const orderedEntries = () => {
    const selected = run();
    return selected ? entriesForRun(selected).map(({ step, key }) => ({ step, key })) : [];
  };
  const orderedSteps = () => orderedEntries().map((entry) => entry.step);
  const isSingleNodeAction = (action: ActionRun) => action.action === 'build' || action.action === 'test' || action.action === 'stop';
  const visibleNodes = (): ActionTreeNode[] => {
    const nodes = runs().flatMap((action): ActionTreeNode[] => {
      const showsSteps = !isSingleNodeAction(action);
      const actionNode: ActionTreeNode = { key: actionKey(action.id), kind: 'action', run: action, depth: 0, hasChildren: showsSteps && action.steps.length > 0 };
      if (action.collapsed || !showsSteps) return [actionNode];
      return [actionNode, ...entriesForRun(action).map((entry): ActionTreeNode => ({ kind: 'step', run: action, ...entry }))];
    });
    return hasOlderHistory() ? [{ key: 'load-older-actions', kind: 'loadOlder', depth: 0, hasChildren: false }, ...nodes] : nodes;
  };
  const focusedTreeKey = () => focusedNode() === 'action' ? (selectedRunId() ? actionKey(selectedRunId()!) : null) : focusedNode() === 'loadOlder' ? 'load-older-actions' : focusedStepKey();
  const selectedNode = () => visibleNodes().find((node) => node.key === focusedTreeKey()) ?? null;

  const selectRun = (id: string) => {
    if (!runs().some((candidate) => candidate.id === id)) return;
    setSelectedRunId(id);
    setFocusedNode('action');
    setFocusedStepId(null);
    setFocusedStepKey(null);
    setUserMovedFocus(true);
  };
  const focusStep = (id: string, key?: string, runId = selectedRunId()) => {
    if (!runId) return;
    setSelectedRunId(runId);
    setFocusedNode('step');
    setFocusedStepId(id);
    setFocusedStepKey(key ?? stepKey(runId, id));
    setUserMovedFocus(true);
  };
  const focusTreeNode = (node: ActionTreeNode) => {
    if (node.kind === 'action') selectRun(node.run.id);
    else if (node.kind === 'step') focusStep(node.step.id, node.key, node.run.id);
    else { setFocusedNode('loadOlder'); setFocusedStepId(null); setFocusedStepKey(null); setUserMovedFocus(true); }
  };
  const configureHistoryLoader = (loader: () => Promise<void>) => { loadOlderHistoryHandler = loader; setHasOlderHistory(true); };
  const loadOlderHistory = async () => { if (!loadOlderHistoryHandler || !hasOlderHistory()) return; await loadOlderHistoryHandler(); setHasOlderHistory(false); };
  const autoFocus = (runId: string, id: string) => {
    if (userMovedFocus()) return;
    setSelectedRunId(runId);
    setFocusedNode('step');
    setFocusedStepId(id);
    setFocusedStepKey(stepKey(runId, id));
  };

  const expandFailurePath = (action: ActionRun, failedId: string): ActionRun => {
    const byId = new Map(action.steps.map((step) => [step.id, step]));
    const path = new Set<string>();
    let current: ActionStep | undefined = byId.get(failedId);
    while (current) {
      path.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    const parentIds = new Set(action.steps.map((step) => step.parentId).filter((id): id is string => Boolean(id)));
    return { ...action, collapsed: false, steps: action.steps.map((step) => parentIds.has(step.id) ? { ...step, collapsed: !path.has(step.id) } : step) };
  };
  const deepestFailedStep = (action: ActionRun) => {
    const failedIds = new Set(action.steps.filter((item) => item.status === 'failed').map((item) => item.id));
    return action.steps
      .filter((item) => item.status === 'failed' && !action.steps.some((candidate) => candidate.parentId === item.id && failedIds.has(candidate.id)))
      .sort((a, b) => (b.depth ?? 0) - (a.depth ?? 0))[0];
  };
  const updateStep = (runId: string, id: string, update: (step: ActionStep) => ActionStep, revealFailure = false) => setRunById(runId, (current) => {
    let steps = current.steps.map((step) => step.id === id ? update(step) : step);
    const failed = new Set(steps.filter((step) => step.status === 'failed').map((step) => step.id));
    let changed = true;
    while (changed) {
      changed = false;
      for (const step of steps) if (step.parentId && failed.has(step.id) && !failed.has(step.parentId)) { failed.add(step.parentId); changed = true; }
    }
    steps = steps.map((step) => failed.has(step.id) && step.status !== 'failed' ? { ...step, status: 'failed' as const } : step);
    const next = { ...current, steps };
    return revealFailure ? expandFailurePath(next, id) : next;
  });
  const normalizeStep = (step: ActionStep & { command?: string; output?: string }): ActionStep => ({ ...step, commands: step.commands ?? (step.command ? [{ id: `${step.id}-command-0`, command: step.command, status: step.status, stdout: step.output ?? '', stderr: '' }] : []) });

  const handleEvent = (type: string, properties: Record<string, unknown>) => {
    if (type === 'action.started') {
      const incoming = properties.run as ActionRun;
      const normalized = { ...incoming, startedAt: incoming.startedAt ?? new Date().toISOString(), steps: incoming.steps.map(normalizeStep) };
      const failedStep = deepestFailedStep(normalized);
      const next = failedStep ? expandFailurePath(normalized, failedStep.id) : normalized;
      setRuns((current) => [...current.filter((candidate) => candidate.id !== next.id), next]);
      setSelectedRunId(next.id);
      setFocusedNode(failedStep ? 'step' : 'action');
      setFocusedStepId(failedStep?.id ?? null);
      setFocusedStepKey(failedStep ? stepKey(next.id, failedStep.id) : null);
      setUserMovedFocus(true);
      setFocusedPanel(0);
      return;
    }
    const runId = String(properties.runId ?? selectedRunId() ?? '');
    const current = runs().find((candidate) => candidate.id === runId);
    if (!current) return;
    const stepId = String(properties.stepId ?? '');
    const step = current.steps.find((candidate) => candidate.id === stepId);
    const commandId = String(properties.commandId ?? step?.commands.at(-1)?.id ?? `${stepId}-command-0`);
    if (type === 'action.step.started') { updateStep(runId, stepId, (s) => ({ ...s, status: 'active' })); autoFocus(runId, stepId); }
    else if (type === 'action.command.started') {
      const command: ActionCommand = { id: commandId, command: String(properties.command ?? ''), status: 'active', stdout: '', stderr: '' };
      updateStep(runId, stepId, (s) => ({ ...s, status: 'active', commands: [...s.commands, command] })); autoFocus(runId, stepId);
    } else if (type === 'action.step.output' || type === 'action.command.output') {
      if (!step?.commands.some((command) => command.id === commandId)) updateStep(runId, stepId, (s) => ({ ...s, status: 'active', commands: [...s.commands, { id: commandId, command: String(properties.command ?? ''), status: 'active', stdout: '', stderr: '' }] }));
      queueOutput(runId, commandId, properties.stream === 'stderr' ? 'stderr' : 'stdout', String(properties.output ?? ''));
    } else if (type === 'action.command.completed') updateStep(runId, stepId, (s) => {
      const commands = s.commands.map((command) => command.id === commandId ? { ...command, status: 'completed' as const } : command);
      return { ...s, commands, status: commands.every((command) => command.status === 'completed') ? 'completed' : s.status };
    });
    else if (type === 'action.command.failed') {
      updateStep(runId, stepId, (s) => ({ ...s, status: 'failed', error: String(properties.error ?? ''), commands: s.commands.map((command) => command.id === commandId ? { ...command, status: 'failed', error: String(properties.error ?? '') } : command) }), true);
      setSelectedRunId(runId); setFocusedNode(isSingleNodeAction(current) ? 'action' : 'step'); setFocusedStepId(isSingleNodeAction(current) ? null : stepId); setFocusedStepKey(isSingleNodeAction(current) ? null : stepKey(runId, stepId));
    } else if (type === 'action.step.completed') updateStep(runId, stepId, (s) => ({ ...s, status: 'completed' }));
    else if (type === 'action.step.failed') {
      updateStep(runId, stepId, (s) => ({ ...s, status: 'failed', error: String(properties.error ?? '') }), true);
      setSelectedRunId(runId); setFocusedNode(isSingleNodeAction(current) ? 'action' : 'step'); setFocusedStepId(isSingleNodeAction(current) ? null : stepId); setFocusedStepKey(isSingleNodeAction(current) ? null : stepKey(runId, stepId));
    } else if (type === 'action.completed') setRunById(runId, (action) => {
      const status = properties.status as ActionRunStatus;
      const next = {
        ...action,
        status,
        finishedAt: action.finishedAt ?? new Date().toISOString(),
        collapsed: status === 'completed' && selectedRunId() !== runId ? true : action.collapsed,
        steps: action.steps.map((item) => {
          if (status === 'completed' && item.status !== 'failed' && item.status !== 'canceled') return { ...item, status: 'completed' as const };
          if (status === 'failed' && item.status === 'active') return { ...item, status: 'failed' as const };
          return item;
        }),
      };
      const failedStep = deepestFailedStep(next);
      return status === 'failed' && failedStep ? expandFailurePath(next, failedStep.id) : next;
    });
  };

  const cancelSelected = () => { const id = selectedRunId(); if (id) setRunById(id, (action) => ({ ...action, status: 'canceled', collapsed: true })); };
  const toggleStep = (id: string) => { const runId = selectedRunId(); if (runId) setRunById(runId, (action) => ({ ...action, steps: action.steps.map((step) => step.id === id ? { ...step, collapsed: !step.collapsed } : step) })); };
  const toggleRunCollapsed = (id: string) => setRunById(id, (action) => ({ ...action, collapsed: !action.collapsed }));
  return { run, runs, selectedRunId, focusedNode, focusedTreeKey, selectedNode, visibleNodes, hasOlderHistory, configureHistoryLoader, loadOlderHistory, cancelSelected, toggleStep, toggleRunCollapsed, selectRun, focusTreeNode, orderedSteps, orderedEntries, focusedStepId, focusedStepKey, focusedPanel, setFocusedPanel, userMovedFocus, focusStep, handleEvent, get logScrollBoxRef() { return logScrollBoxRef; }, set logScrollBoxRef(value) { logScrollBoxRef = value; } };
}
export type ActionRunStore = ReturnType<typeof createActionRunStore>;
