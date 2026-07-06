import { createMemo, createSignal } from 'solid-js';
import type {
	App,
	InfraService,
	KubernetesClusterStatus,
	ScriptNode,
	ScriptVisibleRow,
	StatusLogEntry,
	TableRow,
} from '@devenv/types';
import type { TableTab } from '@devenv/ui';

export type ViewMode =
	| "table"
	| "changeRequests"
	| "changeRequestDetail"
	| "changedFiles"
	| "discussionsView"
	| "testResults"
	| "jobs"
	| "providers"
	| "help"
	| "agentView"
	| "sshPicker"
	| "appDetail"
	| "issues"
	| "issueDetail"
	| "issueTimeline"
	| "issueScopePicker"
	| "linkedChangeRequests"
	| "referencedIssues"
	| "changeRequestLinkedIssues"
	| "references";

export type TabType =
	| "applications"
	| "infrastructure"
	| "libraries"
	| "scripts"
	| "kubernetes";

type TableSortKey = "status" | "git" | "name" | "interpreter" | "path" | "params";
type TableSortDirection = "asc" | "desc" | "none";
export interface TableSortRule {
	key: TableSortKey;
	label: string;
	direction: TableSortDirection;
}

export type StartupPhase =
	| "connecting"
	| "server-ready"
	| "loading-applications"
	| "loading-infrastructure"
	| "complete"
	| "failed";

export interface StartupState {
	phase: StartupPhase;
	message: string;
	error: string | null;
}

function flattenScriptTree(
	nodes: ScriptNode[],
	expandedFolders: Set<string>,
	depth = 0,
): ScriptVisibleRow[] {
	const out: ScriptVisibleRow[] = [];
	for (const node of nodes) {
		out.push({
			name: node.name,
			relativePath: node.relativePath,
			absolutePath: node.absolutePath,
			nodeType: node.nodeType,
			interpreter: node.interpreter,
			parameters: node.parameters,
			depth,
		});

		if (
			node.nodeType === "folder" &&
			expandedFolders.has(node.relativePath) &&
			node.children?.length
		) {
			out.push(...flattenScriptTree(node.children, expandedFolders, depth + 1));
		}
	}
	return out;
}

function folderPaths(nodes: ScriptNode[]): string[] {
	const paths: string[] = [];
	for (const node of nodes) {
		if (node.nodeType === "folder") {
			paths.push(node.relativePath);
			if (node.children?.length) {
				paths.push(...folderPaths(node.children));
			}
		}
	}
	return paths;
}

function appStatusRank(app: TableRow): number {
	if (app.operationStatus?.status === "active") return 0;
	const status = (app.status || app.dockerInfo?.Status || "").toLowerCase();
	if (status.includes("up") || status.includes("running") || status.includes("healthy")) return 0;
	return 1;
}

function appGitRank(app: TableRow): number {
	const status = app.rowKind === "app" ? app.gitStatus?.trim() || "" : "";
	return status.includes("+") || status.includes("~") || status.includes("-") || status.includes("*") ? 0 : 1;
}

function compareByRule(a: TableRow, b: TableRow, rule: TableSortRule): number {
	let result = 0;
	if (rule.key === "status") result = appStatusRank(a) - appStatusRank(b);
	if (rule.key === "git") result = appGitRank(a) - appGitRank(b);
	if (rule.key === "name") result = a.displayName.localeCompare(b.displayName);
	if (rule.key === "interpreter") result = (a.rowKind === "script" ? a.interpreter || "" : "").localeCompare(b.rowKind === "script" ? b.interpreter || "" : "");
	if (rule.key === "path") result = (a.rowKind === "script" ? a.scriptRelativePath || "" : a.rowKind === "app" ? a.localDirectoryPath : "").localeCompare(b.rowKind === "script" ? b.scriptRelativePath || "" : b.rowKind === "app" ? b.localDirectoryPath : "");
	if (rule.key === "params") result = (a.scriptParameters?.length ?? 0) - (b.scriptParameters?.length ?? 0);
	return rule.direction === "desc" ? -result : result;
}

function sortApps(items: TableRow[], rules: TableSortRule[]): TableRow[] {
	const activeRules = rules.filter((rule) => rule.direction !== "none");
	return items
		.map((app, index) => ({ app, index }))
		.sort((a, b) => {
			for (const rule of activeRules) {
				const result = compareByRule(a.app, b.app, rule);
				if (result !== 0) return result;
			}
			return a.index - b.index;
		})
		.map(({ app }) => app);
}

export function createAppStore() {
	const [apps, setApps] = createSignal<App[]>([]);
	const [infraServices, setInfraServices] = createSignal<InfraService[]>([]);
	const [kubernetesClusterStatus, setKubernetesClusterStatus] = createSignal<KubernetesClusterStatus | null>(null);
	const [kubernetesClusterLoading, setKubernetesClusterLoading] = createSignal(false);
	const [kubernetesClusterError, setKubernetesClusterError] = createSignal<string | null>(null);
	const [kubernetesCPUHistory, setKubernetesCPUHistory] = createSignal<number[]>([]);
	const [kubernetesMemoryHistory, setKubernetesMemoryHistory] = createSignal<number[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [error, setError] = createSignal<string | null>(null);
	const [viewMode, setViewMode] = createSignal<ViewMode>("table");
	const [activeTab, setActiveTab] = createSignal<TabType>("applications");
	const [selectedIndex, setSelectedIndex] = createSignal(0);
	const [liveUpdatesActive, setLiveUpdatesActive] = createSignal(false);
	const [lastUpdateTime, setLastUpdateTime] = createSignal<Date | null>(null);
	const [previousViewMode, setPreviousViewMode] = createSignal<ViewMode | null>(
		"table",
	);
	const [helpSearchActive, setHelpSearchActive] = createSignal(false);
	const [helpSearchQuery, setHelpSearchQuery] = createSignal("");
	const [helpAllContexts, setHelpAllContexts] = createSignal(false);
	const [helpActiveTab, setHelpActiveTab] = createSignal<"keybinds" | "guides">("keybinds");
	const [helpGuideIndex, setHelpGuideIndex] = createSignal(-1);
	const [tableSearchMode, setTableSearchMode] = createSignal(false);
	const [tableSearchQuery, setTableSearchQuery] = createSignal("");
	const [showTableFilterModal, setShowTableFilterModal] = createSignal(false);
	const [tableFilterParameterIndex, setTableFilterParameterIndex] = createSignal(0);
	const [tableFilterValueIndex, setTableFilterValueIndex] = createSignal(0);
	const [tableFilterFocusedPane, setTableFilterFocusedPane] = createSignal<"parameter" | "value">("parameter");
	const [tableFiltersByTab, setTableFiltersByTab] = createSignal<Record<TabType, Record<string, string[]>>>(
		{ applications: {}, infrastructure: {}, libraries: {}, scripts: {}, kubernetes: {} },
	);
	const [showTableSortModal, setShowTableSortModal] = createSignal(false);
	const [tableSortSelectedIndex, setTableSortSelectedIndex] = createSignal(0);
	const appSortRules = (): TableSortRule[] => [
		{ key: "status", label: "Status", direction: "none" },
		{ key: "git", label: "Git", direction: "none" },
		{ key: "name", label: "Name", direction: "none" },
	];
	const scriptSortRules = (): TableSortRule[] => [
		{ key: "name", label: "Name", direction: "asc" },
		{ key: "interpreter", label: "Interpreter", direction: "none" },
		{ key: "params", label: "Parameters", direction: "none" },
		{ key: "path", label: "Path", direction: "none" },
	];
	const [tableSortRulesByTab, setTableSortRulesByTab] = createSignal<Record<TabType, TableSortRule[]>>({
		applications: appSortRules(),
		infrastructure: appSortRules(),
		libraries: appSortRules(),
		scripts: scriptSortRules(),
		kubernetes: appSortRules(),
	});
	const [statusLogEntries, setStatusLogEntries] = createSignal<
		StatusLogEntry[]
	>([]);
	const [statusLogMaximized, setStatusLogMaximized] = createSignal(false);
	const [operationInProgressForApp, setOperationInProgressForApp] =
		createSignal<string | null>(null);
	const [spinnerFrame, setSpinnerFrame] = createSignal(0);
	const [startupState, setStartupState] = createSignal<StartupState>({
		phase: "connecting",
		message: "Connecting to DevEnv server...",
		error: null,
	});
	const [scriptsTree, setScriptsTree] = createSignal<ScriptNode[]>([]);
	const [firstStepsDismissed, setFirstStepsDismissed] = createSignal(false);
	const [exampleConfigLoading, setExampleConfigLoading] = createSignal(false);
	const [exampleConfigMessage, setExampleConfigMessage] = createSignal<string | null>(null);
	const [firstStepsSelectedIndex, setFirstStepsSelectedIndex] = createSignal(0);
	const [expandedScriptFolders, setExpandedScriptFolders] = createSignal<
		Set<string>
	>(new Set());

	const scriptVisibleRows = createMemo(() =>
		flattenScriptTree(scriptsTree(), expandedScriptFolders()),
	);

	const scriptRows = createMemo<TableRow[]>(() =>
		scriptVisibleRows().map((row): TableRow => ({
			rowKind: "script",
			ident: `script:${row.relativePath}`,
			displayName: row.name,
			localDirectoryPath: row.absolutePath,
			repositoryPath: "",
			branch: row.nodeType === "script" ? row.interpreter || "" : "folder",
			nodeType: row.nodeType,
			resourceType: row.nodeType === "folder" ? "script-folder" : "script-file",
			scriptPath: row.absolutePath,
			scriptRelativePath: row.relativePath,
			scriptDepth: row.depth,
			scriptExpanded: row.nodeType === "folder" ? expandedScriptFolders().has(row.relativePath) : undefined,
			scriptExecutable: row.nodeType === "script",
			interpreter: row.interpreter,
			scriptParameters: row.parameters,
		})),
	);

	const appFilterValue = (app: TableRow, key: string) => {
		if (key === "status") {
			const status = (app.status || app.dockerInfo?.Status || "not found").toLowerCase();
			if (status.includes("up") || status.includes("running") || status.includes("healthy")) return "running";
			if (status.includes("exit") || status.includes("stop")) return "exited";
			return status;
		}
		if (key === "git" && app.rowKind === "app") return appGitRank(app) === 0 ? "dirty" : app.gitStatus === "✓" ? "clean" : "unknown";
		if (key === "provider" && app.rowKind === "app") return app.provider || app.sourceType || "unknown";
		if (key === "interpreter" && app.rowKind === "script") return app.interpreter || (app.nodeType === "folder" ? "folder" : "unknown");
		if (key === "params") {
			const count = app.scriptParameters?.length ?? 0;
			if (count === 0) return "none";
			if (count === 1) return "1 parameter";
			return "2+ parameters";
		}
		return "";
	};

	const tableFilters = createMemo(() => tableFiltersByTab()[activeTab()]);
	const setTableFilters = (value: Record<string, string[]> | ((filters: Record<string, string[]>) => Record<string, string[]>)) => {
		const tab = activeTab();
		setTableFiltersByTab((byTab) => ({
			...byTab,
			[tab]: typeof value === "function" ? value(byTab[tab]) : value,
		}));
	};
	const tableSortRules = createMemo(() => tableSortRulesByTab()[activeTab()]);
	const setTableSortRules = (value: TableSortRule[] | ((rules: TableSortRule[]) => TableSortRule[])) => {
		const tab = activeTab();
		setTableSortRulesByTab((byTab) => ({
			...byTab,
			[tab]: typeof value === "function" ? value(byTab[tab]) : value,
		}));
	};

	const applyTableFilters = (items: TableRow[]) => {
		const filters = tableFilters();
		return items.filter((app) =>
			Object.entries(filters).every(([key, values]) =>
				values.length === 0 || values.includes(appFilterValue(app, key)),
			),
		);
	};

	const filteredAppsUnsorted = createMemo(() => {
		const allApps = apps();
		const tab = activeTab();
		if (tab === "applications") return allApps.filter((app) => app.appType === "APP").map((app) => ({ ...app, rowKind: "app" as const }));
		if (tab === "libraries") return allApps.filter((app) => app.appType === "LIB").map((app) => ({ ...app, rowKind: "app" as const }));
		if (tab === "scripts") return scriptRows();
		if (tab === "kubernetes") return [];
		if (tab === "infrastructure") {
			return infraServices().map((svc): TableRow => ({
				rowKind: "infra",
				ident: svc.ident,
				displayName: svc.displayName,
				localDirectoryPath: "",
				repositoryPath: "",
				branch: "",
				containerBaseName: svc.containerBaseName || svc.ident,
				dockerInfo: svc.dockerInfo,
				operationStatus: svc.operationStatus,
				status: svc.status,
				type: svc.type,
				shellPath: svc.shellPath,
				powerShellPath: svc.powerShellPath,
				defaultRunner: svc.defaultRunner,
				logPath: svc.logPath,
			}));
		}
		return allApps.map((app) => ({ ...app, rowKind: "app" as const }));
	});

	const tableFilterParameters = createMemo(() => {
		const base = filteredAppsUnsorted();
		const params = activeTab() === "scripts"
			? [
				{ key: "interpreter", label: "Interpreter" },
				{ key: "params", label: "Parameters" },
			]
			: [
				{ key: "status", label: "Status" },
				{ key: "git", label: "Git" },
				{ key: "provider", label: "Provider" },
			];
		return params.map((param) => {
			const counts = new Map<string, number>();
			for (const app of base) {
				const value = appFilterValue(app, param.key);
				counts.set(value, (counts.get(value) ?? 0) + 1);
			}
			return {
				...param,
				values: Array.from(counts.entries()).map(([value, count]) => ({ value, label: value, count })),
			};
		});
	});

	const filteredApps = createMemo(() => sortApps(applyTableFilters(filteredAppsUnsorted()), tableSortRules()));

	const tableFilteredApps = createMemo(() => {
		const q = tableSearchQuery().toLowerCase();
		const items = q
			? filteredApps().filter((app) =>
				Object.values(app).some(
					(v) => v != null && String(v).toLowerCase().includes(q),
				),
			)
			: filteredApps();
		return sortApps(items, tableSortRules());
	});

	const showFirstSteps = createMemo(() =>
		!firstStepsDismissed() &&
		startupState().phase === "complete" &&
		apps().length === 0 &&
		infraServices().length === 0 &&
		scriptVisibleRows().length === 0,
	);

	const tableTabs = createMemo((): TableTab<TabType>[] => {
		const allApps = apps();
		return [
			{
				id: "applications",
				label: "Applications",
				count: allApps.filter((app) => app.appType === "APP").length,
			},
			{
				id: "infrastructure",
				label: "Infrastructure",
				count: infraServices().length,
			},
			{
				id: "libraries",
				label: "Libraries",
				count: allApps.filter((app) => app.appType === "LIB").length,
			},
			{ id: "scripts", label: "Tasks", count: scriptVisibleRows().length },
			{ id: "kubernetes", label: "Kubernetes", count: kubernetesClusterStatus()?.exists ? 1 : 0 },
		];
	});

	const setAllScriptFoldersExpanded = () => {
		setExpandedScriptFolders(new Set(folderPaths(scriptsTree())));
	};

	return {
		apps,
		setApps,
		infraServices,
		setInfraServices,
		kubernetesClusterStatus,
		setKubernetesClusterStatus,
		kubernetesClusterLoading,
		setKubernetesClusterLoading,
		kubernetesClusterError,
		setKubernetesClusterError,
		kubernetesCPUHistory,
		setKubernetesCPUHistory,
		kubernetesMemoryHistory,
		setKubernetesMemoryHistory,
		loading,
		startupState,
		setStartupState,
		setLoading,
		error,
		setError,
		viewMode,
		setViewMode,
		activeTab,
		setActiveTab,
		selectedIndex,
		setSelectedIndex,
		liveUpdatesActive,
		setLiveUpdatesActive,
		lastUpdateTime,
		setLastUpdateTime,
		previousViewMode,
		setPreviousViewMode,
		helpSearchActive,
		setHelpSearchActive,
		helpSearchQuery,
		setHelpSearchQuery,
		helpAllContexts,
		setHelpAllContexts,
		helpActiveTab,
		setHelpActiveTab,
		helpGuideIndex,
		setHelpGuideIndex,
		tableSearchMode,
		setTableSearchMode,
		tableSearchQuery,
		setTableSearchQuery,
		showTableFilterModal,
		setShowTableFilterModal,
		tableFilterParameterIndex,
		setTableFilterParameterIndex,
		tableFilterValueIndex,
		setTableFilterValueIndex,
		tableFilterFocusedPane,
		setTableFilterFocusedPane,
		tableFilters,
		setTableFilters,
		tableFilterParameters,
		showTableSortModal,
		setShowTableSortModal,
		tableSortSelectedIndex,
		setTableSortSelectedIndex,
		tableSortRules,
		setTableSortRules,
		statusLogEntries,
		setStatusLogEntries,
		statusLogMaximized,
		setStatusLogMaximized,
		operationInProgressForApp,
		setOperationInProgressForApp,
		spinnerFrame,
		setSpinnerFrame,
		scriptsTree,
		setScriptsTree,
		firstStepsDismissed,
		setFirstStepsDismissed,
		exampleConfigLoading,
		setExampleConfigLoading,
		exampleConfigMessage,
		setExampleConfigMessage,
		firstStepsSelectedIndex,
		setFirstStepsSelectedIndex,
		showFirstSteps,
		expandedScriptFolders,
		setExpandedScriptFolders,
		scriptVisibleRows,
		setAllScriptFoldersExpanded,
		filteredApps,
		tableFilteredApps,
		tableTabs,
	};
}

export type AppStore = ReturnType<typeof createAppStore>;
