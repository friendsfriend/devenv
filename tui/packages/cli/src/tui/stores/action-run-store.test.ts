import { describe, expect, test } from 'bun:test';
import { createActionRunStore } from './action-run-store';

describe('action run store', () => {
  const run = { id: 'r1', title: 'Run', status: 'active' as const, steps: [
    { id: 'one', label: 'One', command: 'one', status: 'pending' as const },
    { id: 'two', label: 'Two', command: 'two', status: 'pending' as const },
  ] };
  test('tracks lifecycle, output, and automatic focus', async () => {
    const store = createActionRunStore();
    store.handleEvent('action.started', { run });
    expect(store.focusedNode()).toBe('action');
    expect(store.focusedTreeKey()).toBe('action:r1');
    store.handleEvent('action.step.started', { runId: 'r1', stepId: 'one', command: 'one' });
    store.handleEvent('action.step.output', { runId: 'r1', stepId: 'one', output: 'hello', stream: 'stdout' });
    expect(store.focusedNode()).toBe('action');
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(store.run()!.steps[0].commands[0].stdout).toBe('hello');
    store.handleEvent('action.step.failed', { runId: 'r1', stepId: 'two', error: 'bad' });
    expect(store.focusedStepId()).toBe('two');
  });
  test('failed step focus and final status', () => {
    const store = createActionRunStore();
    store.handleEvent('action.started', { run });
    store.handleEvent('action.step.failed', { runId: 'r1', stepId: 'two', error: 'broken' });
    store.handleEvent('action.completed', { runId: 'r1', status: 'failed' });
    expect(store.focusedStepId()).toBe('two');
    expect(store.run()!.steps[1].status).toBe('failed');
    expect(store.run()!.status).toBe('failed');
  });
  test('retains multiple command streams per step', async () => {
    const store = createActionRunStore();
    store.handleEvent('action.started', { run: { ...run, steps: [{ id: 'one', label: 'Start dependency: db', status: 'pending', commands: [] }] } });
    store.handleEvent('action.command.started', { runId: 'r1', stepId: 'one', commandId: 'c1', command: 'docker-compose up db' });
    store.handleEvent('action.command.output', { runId: 'r1', stepId: 'one', commandId: 'c1', stream: 'stdout', output: 'started\n' });
    store.handleEvent('action.command.completed', { runId: 'r1', stepId: 'one', commandId: 'c1' });
    store.handleEvent('action.command.started', { runId: 'r1', stepId: 'one', commandId: 'c2', command: 'docker inspect db' });
    store.handleEvent('action.command.output', { runId: 'r1', stepId: 'one', commandId: 'c2', stream: 'stderr', output: 'waiting\n' });
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(store.run()!.steps[0].commands.map((c) => c.command)).toEqual(['docker-compose up db', 'docker inspect db']);
    expect(store.run()!.steps[0].commands[0].stdout).toBe('started\n');
    expect(store.run()!.steps[0].commands[1].stderr).toBe('waiting\n');
  });
  test('propagates failed status to step parents only', () => {
    const store = createActionRunStore();
    store.handleEvent('action.started', { run: { ...run, steps: [
      { id: 'root', label: 'root', status: 'active', commands: [], depth: 0 },
      { id: 'dep', label: 'dep', status: 'active', parentId: 'root', commands: [], depth: 1 },
      { id: 'leaf', label: 'leaf', status: 'pending', parentId: 'dep', commands: [], depth: 2 },
      { id: 'other', label: 'other', status: 'pending', parentId: 'root', commands: [], depth: 1 },
    ] } });
    store.handleEvent('action.step.failed', { runId: 'r1', stepId: 'leaf', error: 'failed' });
    expect(store.run()!.steps.find((s) => s.id === 'root')!.status).toBe('failed');
    expect(store.run()!.steps.find((s) => s.id === 'dep')!.status).toBe('failed');
    expect(store.run()!.steps.find((s) => s.id === 'other')!.status).toBe('pending');
  });
  test('manual focus disables automatic focus', () => {
    const store = createActionRunStore();
    store.handleEvent('action.started', { run });
    store.focusStep('one');
    store.handleEvent('action.step.started', { runId: 'r1', stepId: 'two', command: 'two' });
    expect(store.focusedStepId()).toBe('one');
  });
  test('loads older history once and removes loader node', async () => {
    const store = createActionRunStore();
    let loads = 0;
    store.configureHistoryLoader(async () => { loads++; });
    expect(store.visibleNodes()[0]?.kind).toBe('loadOlder');
    await store.loadOlderHistory();
    expect(loads).toBe(1);
    expect(store.hasOlderHistory()).toBe(false);
    expect(store.visibleNodes().some((node) => node.kind === 'loadOlder')).toBe(false);
  });
  test('isolates repeated actions by unique run id', () => {
    const store = createActionRunStore();
    store.handleEvent('action.started', { run: { ...run, id: 'first' } });
    store.handleEvent('action.started', { run: { ...run, id: 'second' } });
    store.handleEvent('action.step.completed', { runId: 'first', stepId: 'one' });
    expect(store.runs()).toHaveLength(2);
    expect(store.runs().find((item) => item.id === 'first')!.steps[0].status).toBe('completed');
    expect(store.runs().find((item) => item.id === 'second')!.steps[0].status).toBe('pending');
    expect(store.visibleNodes().filter((node) => node.kind === 'action').map((node) => node.key)).toEqual(['action:first', 'action:second']);
  });
  test('renders build, test, and stop as one action without a substep', () => {
    for (const action of ['build', 'test', 'stop'] as const) {
      const store = createActionRunStore();
      store.handleEvent('action.started', { run: { ...run, action, profile: 'default', steps: [{ id: action, label: `${action} app`, status: 'active', commands: [] }] } });
      expect(store.visibleNodes().filter((node) => node.kind !== 'loadOlder').map((node) => node.kind)).toEqual(['action']);
      expect(store.selectedNode()?.kind).toBe('action');
      store.handleEvent('action.step.failed', { runId: 'r1', stepId: action, error: 'failed' });
      expect(store.focusedNode()).toBe('action');
    }
  });
  test('flattens recursive tree and hides descendants of collapsed nodes', () => {
    const store = createActionRunStore();
    store.handleEvent('action.started', { run: { ...run, steps: [
      { id: 'dep', label: 'dependency', status: 'active', commands: [] },
      { id: 'sub', label: 'subdependency', status: 'active', parentId: 'dep', commands: [] },
      { id: 'other', label: 'other', status: 'pending', commands: [] },
    ] } });
    expect(store.visibleNodes().filter((node) => node.kind !== 'loadOlder').map((node) => node.kind === 'action' ? node.run.id : node.step.id)).toEqual(['r1', 'dep', 'sub', 'other']);
    store.focusStep('dep');
    store.toggleStep('dep');
    expect(store.visibleNodes().filter((node) => node.kind !== 'loadOlder').map((node) => node.kind === 'action' ? node.run.id : node.step.id)).toEqual(['r1', 'dep', 'other']);
  });
  test('collapses successful action only when another action is focused', () => {
    const store = createActionRunStore();
    store.handleEvent('action.started', { run });
    store.handleEvent('action.completed', { runId: 'r1', status: 'completed' });
    expect(store.run()!.collapsed).not.toBe(true);
    expect(store.run()!.steps.every((step) => step.status === 'completed')).toBe(true);
    store.handleEvent('action.started', { run: { ...run, id: 'r2' } });
    store.handleEvent('action.completed', { runId: 'r1', status: 'completed' });
    expect(store.runs().find((item) => item.id === 'r1')!.collapsed).toBe(true);
  });
  test('failure expands only ancestors leading to failed leaf', () => {
    const store = createActionRunStore();
    store.handleEvent('action.started', { run: { ...run, collapsed: true, steps: [
      { id: 'root', label: 'root', status: 'active', commands: [], collapsed: true },
      { id: 'dep', label: 'dep', status: 'active', parentId: 'root', commands: [], collapsed: true },
      { id: 'leaf', label: 'leaf', status: 'pending', parentId: 'dep', commands: [] },
      { id: 'other', label: 'other', status: 'active', parentId: 'root', commands: [], collapsed: false },
      { id: 'other-leaf', label: 'other leaf', status: 'pending', parentId: 'other', commands: [] },
    ] } });
    store.handleEvent('action.step.failed', { runId: 'r1', stepId: 'leaf', error: 'failed' });
    expect(store.run()!.collapsed).toBe(false);
    expect(store.run()!.steps.find((step) => step.id === 'root')!.collapsed).toBe(false);
    expect(store.run()!.steps.find((step) => step.id === 'dep')!.collapsed).toBe(false);
    expect(store.run()!.steps.find((step) => step.id === 'other')!.collapsed).toBe(true);
    expect(store.visibleNodes().filter((node) => node.kind !== 'loadOlder').map((node) => node.kind === 'action' ? node.run.id : node.step.id)).toEqual(['r1', 'root', 'dep', 'leaf', 'other']);
    expect(store.focusedStepId()).toBe('leaf');
    store.handleEvent('action.completed', { runId: 'r1', status: 'failed' });
    expect(store.visibleNodes().filter((node) => node.kind !== 'loadOlder').map((node) => node.kind === 'action' ? node.run.id : node.step.id)).toContain('leaf');
    expect(store.run()!.steps.find((step) => step.id === 'root')!.collapsed).toBe(false);
    expect(store.run()!.steps.find((step) => step.id === 'dep')!.collapsed).toBe(false);
  });
});
