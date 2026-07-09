import { describe, expect, test } from 'bun:test';
import { createTestKeymap } from '@opentui/keymap/testing';
import { setupDevenvKeymap } from './keymap-setup';
import { applyKeymapRuntimeSnapshot } from './keymap-runtime';
import { registerTableKeymapLayer } from './table-keymap-layer';
import type { KeyboardActions, KeyboardContext, KeyboardStores } from './types';

const signalStore = (overrides: Record<string, unknown> = {}) => new Proxy(overrides, {
	get(target, prop: string) {
		if (prop in target) return target[prop];
		return () => false;
	},
});

const actions = (): KeyboardActions => ({
	appActions: signalStore(), issueActions: signalStore(), logActions: signalStore(), crActions: signalStore(), dockerActions: signalStore(), gitActions: signalStore(), providerActions: signalStore(), agentActions: signalStore(), utilActions: signalStore(), pipelineActions: signalStore(), helpActions: signalStore(),
} as unknown as KeyboardActions);

const ctx = (): KeyboardContext => ({ renderer: {}, client: {}, getSelectedApp: () => undefined, launchPi: () => {}, getSelectableRows: () => [], showError: () => {} } as unknown as KeyboardContext);

const stores = (): KeyboardStores => ({
	appStore: signalStore({ viewMode: () => 'table', activeTab: () => 'kubernetes', isShuttingDown: () => false, kubernetesPanelIndex: () => 2, kubernetesPanelCount: 4, kubernetesScrollBoxRefs: [] }),
	issueStore: signalStore(), logStore: signalStore(), changeRequestStore: signalStore(), providerStore: signalStore(), uiStore: signalStore(), agentStore: signalStore(), appDetailStore: signalStore(),
} as unknown as KeyboardStores);

const setRuntime = (keymap: any, focusedPanel: string) => applyKeymapRuntimeSnapshot(keymap, {
	viewMode: 'table', activeTab: 'kubernetes', activeModal: 'none', textEntryActive: false, shutdownActive: false, focusedPanel, focusedList: 'table', worktreeManagerActive: false,
});

describe('panel-gated keymap layers', () => {
	test('focused panel layer only exposes current panel metadata', () => {
		const { keymap, cleanup } = createTestKeymap({ defaultKeys: true });
		try {
			setupDevenvKeymap(keymap as never);
			registerTableKeymapLayer(keymap as never, { stores: stores(), actions: actions(), ctx: ctx() });
			setRuntime(keymap, 'kubernetes:2');
			const activeCommands = keymap.getActiveKeys({ includeMetadata: true, includeBindings: true })
				.flatMap((active) => active.bindings ?? [])
				.map((binding) => binding.command)
				.filter((command): command is string => typeof command === 'string');
			expect(activeCommands).toContain('kubernetes.panel.2.scroll');
			expect(activeCommands).not.toContain('kubernetes.panel.1.scroll');
		} finally { cleanup(); }
	});
});
