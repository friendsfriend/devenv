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

const actions = (overrides: Partial<KeyboardActions> = {}): KeyboardActions => ({
	appActions: signalStore(), issueActions: signalStore(), logActions: signalStore(), crActions: signalStore(), dockerActions: signalStore(), gitActions: signalStore(), providerActions: signalStore(), agentActions: signalStore(), utilActions: signalStore(), pipelineActions: signalStore(), helpActions: signalStore(), ...overrides,
} as unknown as KeyboardActions);

const ctx = (): KeyboardContext => ({
	renderer: {}, client: {}, getSelectedApp: () => undefined, launchPi: () => {}, getSelectableRows: () => [], showError: () => {},
} as unknown as KeyboardContext);

function makeStores(appOverrides: Record<string, unknown> = {}): KeyboardStores {
	let searchMode = false;
	let searchQuery = 'old';
	let filterOpen = false;
	let sortOpen = false;
	let selectedIndex = 3;
	return {
		appStore: signalStore({
			viewMode: () => 'table', activeTab: () => 'applications', isShuttingDown: () => false,
			tableSearchMode: () => searchMode, setTableSearchMode: (v: boolean) => { searchMode = v; },
			tableSearchQuery: () => searchQuery, setTableSearchQuery: (v: string | ((prev: string) => string)) => { searchQuery = typeof v === 'function' ? v(searchQuery) : v; },
			setSelectedIndex: (v: number | ((prev: number) => number)) => { selectedIndex = typeof v === 'function' ? v(selectedIndex) : v; },
			selectedIndex: () => selectedIndex, tableFilteredApps: () => [], filteredApps: () => [],
			showTableFilterModal: () => filterOpen, setShowTableFilterModal: (v: boolean) => { filterOpen = v; },
			showTableSortModal: () => sortOpen, setShowTableSortModal: (v: boolean) => { sortOpen = v; },
			kubernetesPanelCount: 1,
			...appOverrides,
		}),
		issueStore: signalStore(), logStore: signalStore(), changeRequestStore: signalStore(), providerStore: signalStore(), uiStore: signalStore({ activeThemeName: () => 'default' }), agentStore: signalStore(), appDetailStore: signalStore(),
	} as unknown as KeyboardStores;
}

const setRuntime = (keymap: any, activeTab = 'applications', viewMode = 'table', activeModal = 'none') => applyKeymapRuntimeSnapshot(keymap, {
	viewMode, activeTab, activeModal, textEntryActive: false, shutdownActive: false, focusedPanel: 'none', focusedList: viewMode, worktreeManagerActive: false,
});

describe('table keymap layer', () => {
	test('standard list controls route through table layer', () => {
		const { keymap, host, cleanup } = createTestKeymap({ defaultKeys: true });
		const stores = makeStores();
		try {
			setupDevenvKeymap(keymap as never);
			setRuntime(keymap);
			registerTableKeymapLayer(keymap as never, { stores, actions: actions(), ctx: ctx() });
					host.press('/');
			expect(stores.appStore.tableSearchMode()).toBe(true);
			expect(stores.appStore.tableSearchQuery()).toBe('');
			stores.appStore.setTableSearchMode(false);
			host.press('f', { shift: true });
			expect(stores.appStore.showTableFilterModal()).toBe(true);
			stores.appStore.setShowTableFilterModal(false);
			host.press('o', { shift: true });
			expect(stores.appStore.showTableSortModal()).toBe(true);
		} finally {
			cleanup();
		}
	});

	test('inactive view layer does not handle table keys', () => {
		const { keymap, host, cleanup } = createTestKeymap({ defaultKeys: true });
		const stores = makeStores();
		try {
			setupDevenvKeymap(keymap as never);
			setRuntime(keymap, 'applications', 'help');
			registerTableKeymapLayer(keymap as never, { stores, actions: actions(), ctx: ctx() });
			host.press('/');
			expect(stores.appStore.tableSearchMode()).toBe(false);
		} finally {
			cleanup();
		}
	});

	test('kubernetes actions gate on active tab', () => {
		const { keymap, host, cleanup } = createTestKeymap({ defaultKeys: true });
		let refreshed = 0;
		let activeTab = 'kubernetes';
		const stores = makeStores({ activeTab: () => activeTab });
		try {
			setupDevenvKeymap(keymap as never);
			setRuntime(keymap, 'kubernetes');
			registerTableKeymapLayer(keymap as never, { stores, actions: actions({ dockerActions: signalStore({ refreshKubernetesCluster: () => { refreshed += 1; } }) as never }), ctx: ctx() });
			host.press('r');
			expect(refreshed).toBe(1);
			activeTab = 'applications';
			setRuntime(keymap, 'applications');
			host.press('r');
			expect(refreshed).toBe(1);
		} finally {
			cleanup();
		}
	});
});
