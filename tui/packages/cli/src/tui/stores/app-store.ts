import { createMemo, createSignal } from "solid-js";
import type {
	App,
	InfraService,
	ScriptNode,
	ScriptVisibleRow,
	StatusLogEntry,
} from "@devenv/types";
import type { TableTab } from "@devenv/ui";

export type ViewMode =
	| "table"
	| "mergeRequests"
	| "mergeRequestDetail"
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
	| "issueScopePicker"
	| "linkedMRs"
	| "referencedIssues"
	| "mrLinkedIssues"
	| "references";

export type TabType =
	| "applications"
	| "infrastructure"
	| "libraries"
	| "scripts";

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

export function createAppStore() {
	const [apps, setApps] = createSignal<App[]>([]);
	const [infraServices, setInfraServices] = createSignal<InfraService[]>([]);
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
	const [tableSearchMode, setTableSearchMode] = createSignal(false);
	const [tableSearchQuery, setTableSearchQuery] = createSignal("");
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

	const scriptRowsAsApps = createMemo<App[]>(() =>
		scriptVisibleRows().map(
			(row): App => ({
				ident: `script:${row.relativePath}`,
				displayName: row.name,
				localDirectoryPath: row.absolutePath,
				repositoryPath: "",
				branch: row.nodeType === "script" ? row.interpreter || "" : "folder",
				appType: "LIB" as const,
				containerBaseName: "",
				resourceType:
					row.nodeType === "folder"
						? ("script-folder" as const)
						: ("script-file" as const),
				scriptPath: row.absolutePath,
				scriptRelativePath: row.relativePath,
				scriptDepth: row.depth,
				scriptExpanded:
					row.nodeType === "folder"
						? expandedScriptFolders().has(row.relativePath)
						: undefined,
				scriptExecutable: row.nodeType === "script",
				interpreter: row.interpreter,
				scriptParameters: row.parameters,
			}),
		),
	);

	const filteredApps = createMemo(() => {
		const allApps = apps();
		const tab = activeTab();
		if (tab === "applications")
			return allApps.filter((app) => app.appType === "APP");
		if (tab === "libraries")
			return allApps.filter((app) => app.appType === "LIB");
		if (tab === "scripts") return scriptRowsAsApps();
		if (tab === "infrastructure") {
			return infraServices().map((svc) => ({
				ident: svc.ident,
				displayName: svc.displayName,
				localDirectoryPath: "",
				repositoryPath: "",
				branch: "",
				appType: "LIB" as const,
				containerBaseName: svc.containerBaseName,
				dockerInfo: svc.dockerInfo,
			})) as App[];
		}
		return allApps;
	});

	const tableFilteredApps = createMemo(() => {
		const q = tableSearchQuery().toLowerCase();
		if (!q) return filteredApps();
		return filteredApps().filter((app) =>
			Object.values(app).some(
				(v) => v != null && String(v).toLowerCase().includes(q),
			),
		);
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
			{ id: "scripts", label: "Scripts", count: scriptVisibleRows().length },
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
		tableSearchMode,
		setTableSearchMode,
		tableSearchQuery,
		setTableSearchQuery,
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
