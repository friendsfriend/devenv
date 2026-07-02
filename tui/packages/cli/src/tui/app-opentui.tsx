import {
	render,
	useKeyboard,
	usePaste,
	useRenderer,
	useTerminalDimensions,
} from "@opentui/solid";
import { createCliRenderer } from "@opentui/core";
import { setExitRenderer } from "./exit";
import { onMount, createEffect, on, onCleanup } from "solid-js";
import "opentui-spinner/solid";
import { APP_VERSION } from "../version";
import { createClient } from "@devenv/core";
import type { App } from "@devenv/types";
import {
	Header,
	StatusBar,
	Layout,
	getSelectableRows,
	setGlobalSelectionMouseUpHandler,
	uiColors,
} from "@devenv/ui";
import { createFrames } from "./spinner";
import {
	createAppStore,
	createIssueStore,
	createLogStore,
	createMrStore,
	createProviderStore,
	createUiStore,
	createAgentStore,
	createAppDetailStore,
} from "./stores";
import {
	createAppActions,
	createIssueActions,
	createLogActions,
	createMrActions,
	createDockerActions,
	createGitActions,
	createProviderActions,
	createAgentActions,
	createUtilActions,
	createPipelineActions,
	createHelpActions,
	initializeApp,
} from "./actions";
import { setupLogEffects } from "./effects/log-effects";
import { createColumns, createScriptColumns } from "./columns";
import {
	handleGlobalKeys,
	handleAddAppModalKeys,
	handleConnectProviderModalKeys,
	handleDiffModalKeys,
	handleLogModalKeys,
	handleJobsKeys,
	handleMrListKeys,
	handleMrDetailKeys,
	handleChangedFilesKeys,
	handleTestResultsKeys,
	handleDiscussionsKeys,
	handleIssueTimelineKeys,
	handleMiscModalKeys,
	handleWorktreeManagerKeys,
	handleIssueListKeys,
	handleIssueDetailKeys,
	handleLinkedMRsKeys,
	handleReferencesKeys,
	handleTableKeys,
	handlePaste,
	type KeyboardStores,
	type KeyboardActions,
	type KeyboardContext,
} from "./keyboard";
import {
	ContentRouter,
	ModalOverlays,
	getTabName,
	getTabBorderColor,
	getHeaderInfo,
} from "./views";
import type { ViewStores, ViewActions } from "./views";
import { applyTheme, loadCustomThemes, loadSystemTheme, loadThemeName, queryTerminalThemeColors } from "./theme-settings";

export interface TUIAppProps {
	serverUrl: string;
}

export function TUIApp(props: TUIAppProps) {
	const dimensions = useTerminalDimensions();
	const renderer = useRenderer();

	// --- Stores ---
	const appStore = createAppStore();
	const issueStore = createIssueStore();
	const logStore = createLogStore();
	const mrStore = createMrStore();
	const providerStore = createProviderStore();
	const uiStore = createUiStore();
	const agentStore = createAgentStore();
	const appDetailStore = createAppDetailStore();
	loadCustomThemes();
	const initialTheme = loadThemeName();
	applyTheme(initialTheme);
	uiStore.setActiveThemeName(initialTheme);

	const showError = uiStore.showError;
	const client = createClient(props.serverUrl, undefined, showError);

	// --- Actions ---
	const appActions = createAppActions(
		appStore,
		appDetailStore,
		uiStore,
		client,
		showError,
	);
	const issueActions = createIssueActions(
		appStore,
		issueStore,
		client,
		showError,
	);
	const logActions = createLogActions(logStore, appStore, client, showError);
	const mrActions = createMrActions(
		appStore,
		mrStore,
		uiStore,
		client,
		showError,
	);
	const dockerActions = createDockerActions(appStore, uiStore, client, showError, (appIdent, appName) => logActions.openActionLogForApp(appIdent, appName, "Action Log"));
	const gitActions = createGitActions(appStore, uiStore, client, showError);
	const providerActions = createProviderActions(
		appStore,
		providerStore,
		client,
		showError,
	);
	const agentActions = createAgentActions(appStore, agentStore, client);
	const utilActions = createUtilActions(
		appStore,
		agentStore,
		uiStore,
		renderer,
		client,
	);
	const pipelineActions = createPipelineActions(
		appStore,
		mrStore,
		client,
		showError,
	);
	const helpActions = createHelpActions(
		appStore,
		issueStore,
		logStore,
		mrStore,
		uiStore,
	);

	const clearGlobalSelectionMouseUpHandler = setGlobalSelectionMouseUpHandler(
		utilActions.handleCopySelection,
	);
	onCleanup(clearGlobalSelectionMouseUpHandler);

	const launchPi = (sessionPath: string | null) =>
		agentActions.launchPi(sessionPath, renderer);

	const getSelectedApp = (): App | undefined =>
		(appStore.viewMode() === "table"
			? appStore.tableFilteredApps()
			: appStore.filteredApps())[appStore.selectedIndex()];

	// --- Effects ---
	setupLogEffects(logStore, client);

	const spinnerFrames = createFrames({
		color: uiColors.primary,
		style: "blocks",
		width: 6,
		inactiveFactor: 0.6,
		minAlpha: 0.3,
	});

	const spinnerInterval = setInterval(() => {
		appStore.setSpinnerFrame((prev) => (prev + 1) % spinnerFrames.length);
	}, 40);
	const runningTextInterval = setInterval(() => {
		if (uiStore.runningTextEnabled()) uiStore.setRunningTextOffset((prev) => prev + 1);
	}, 160);
	onCleanup(() => {
		clearInterval(spinnerInterval);
		clearInterval(runningTextInterval);
	});

	/* selectedLine removed — no cursor line / visual mode */

	// --- Initialization ---
	onMount(() => {
		void initializeApp({
			client,
			appStore,
			appActions,
			showError,
			serverUrl: props.serverUrl,
			refreshProviders: providerActions.refreshProviders,
		});
	});

	// --- Columns ---
	const columns = createColumns();
	const scriptColumns = createScriptColumns();

	// --- Keyboard dispatcher ---
	const kbStores: KeyboardStores = {
		appStore,
		issueStore,
		logStore,
		mrStore,
		providerStore,
		uiStore,
		agentStore,
		appDetailStore,
	};
	const kbActions: KeyboardActions = {
		appActions,
		issueActions,
		logActions,
		mrActions,
		dockerActions,
		gitActions,
		providerActions,
		agentActions,
		utilActions,
		pipelineActions,
		helpActions,
	};
	const kbCtx: KeyboardContext = {
		renderer,
		client,
		getSelectedApp,
		launchPi,
		getSelectableRows,
		showError,
	};

	useKeyboard(async (event) => {
		if (await handleGlobalKeys(event, kbStores, kbActions, kbCtx)) return;
		if (await handleAddAppModalKeys(event, kbStores, kbActions)) return;
		if (await handleConnectProviderModalKeys(event, kbStores, kbActions))
			return;
		if (await handleDiffModalKeys(event, kbStores, kbActions, kbCtx)) return;
		if (await handleLogModalKeys(event, kbStores, kbActions, kbCtx)) return;
		if (await handleJobsKeys(event, kbStores, kbActions, kbCtx)) return;
		if (await handleMrListKeys(event, kbStores, kbActions, kbCtx)) return;
		if (await handleMrDetailKeys(event, kbStores, kbActions, kbCtx)) return;
		if (await handleIssueListKeys(event, kbStores, kbActions, kbCtx)) return;
		if (await handleIssueDetailKeys(event, kbStores, kbActions, kbCtx)) return;
		if (await handleIssueTimelineKeys(event, kbStores, kbActions, kbCtx)) return;
		if (await handleLinkedMRsKeys(event, kbStores, kbActions, kbCtx)) return;
		if (await handleReferencesKeys(event, kbStores, kbActions, kbCtx)) return;
		if (await handleChangedFilesKeys(event, kbStores, kbActions, kbCtx)) return;
		if (await handleTestResultsKeys(event, kbStores, kbActions, kbCtx)) return;
		if (await handleDiscussionsKeys(event, kbStores, kbActions, kbCtx)) return;
		if (await handleMiscModalKeys(event, kbStores, kbActions, kbCtx)) return;
		if (await handleWorktreeManagerKeys(event, kbStores, kbActions, kbCtx))
			return;
		if (await handleTableKeys(event, kbStores, kbActions, kbCtx)) return;
	});

	usePaste((event) => handlePaste(event, providerStore));

	// --- View props ---
	const viewStores: ViewStores = {
		appStore,
		issueStore,
		logStore,
		mrStore,
		providerStore,
		uiStore,
		agentStore,
		appDetailStore,
	};
	const viewActions: ViewActions = {
		appActions,
		issueActions,
		logActions,
		mrActions,
		dockerActions,
		gitActions,
		providerActions,
		agentActions,
		utilActions,
		pipelineActions,
		helpActions,
	};

	const headerDeps = {
		appStore,
		issueStore,
		mrStore,
		appDetailStore,
		helpActions,
		getSelectedApp,
	};

	return (
		<box
			width={dimensions().width}
			height={dimensions().height}
			onMouseUp={utilActions.handleCopySelection}
		>
			<Layout
				header={
					<Header
						{...getHeaderInfo(headerDeps)}
						version={APP_VERSION}
						runningTextEnabled={uiStore.runningTextEnabled()}
						runningTextOffset={uiStore.runningTextOffset()}
					/>
				}
				content={
					<ContentRouter
						stores={viewStores}
						actions={viewActions}
						columns={columns}
						scriptColumns={scriptColumns}
						spinnerFrames={spinnerFrames}
						dimensions={dimensions()}
						runningTextEnabled={uiStore.runningTextEnabled()}
						runningTextOffset={uiStore.runningTextOffset()}
						getTabBorderColor={(tab) => getTabBorderColor(tab, appStore)}
					/>
				}
				footer={
					<StatusBar
						left={`${getTabName(appStore.activeTab())}: ${appStore.filteredApps().length}`}
						center={
							appStore.viewMode() === "providers"
								? "Providers"
								: appStore.viewMode() === "jobs"
									? `Pipeline #${mrStore.currentPipelineId() || "N/A"} \u2022 ${mrStore.jobs().length} jobs`
									: appStore.viewMode() === "mergeRequestDetail"
										? `Branch: ${appStore.filteredApps()[appStore.selectedIndex()]?.branch || "unknown"}`
										: appStore.viewMode() === "mergeRequests"
											? `Branch: ${appStore.filteredApps()[appStore.selectedIndex()]?.branch || "unknown"}`
											: appStore.viewMode() !== "table"
												? "Viewing Logs"
												: appStore.liveUpdatesActive()
													? `Last update: ${appStore.lastUpdateTime() ? `${appStore.lastUpdateTime()!.toLocaleTimeString()}` : ""}`
													: ""
						}
						right={
							appStore.viewMode() === "table"
								? `Selected: ${appStore.selectedIndex() + 1}/${appStore.filteredApps().length}`
								: ""
						}
						keybinds={helpActions.getKeybinds()}
						runningTextEnabled={uiStore.runningTextEnabled()}
						runningTextOffset={uiStore.runningTextOffset()}
					/>
				}
			/>

			<ModalOverlays
				stores={viewStores}
				actions={viewActions}
				spinnerFrames={spinnerFrames}
				dimensions={dimensions()}
			/>
		</box>
	);
}

export async function startTUI(serverUrl: string) {
	try {
		// Force enable color support for terminal
		process.env.FORCE_COLOR = "3"; // Force truecolor
		const terminalThemeColors = await queryTerminalThemeColors();
		loadSystemTheme(terminalThemeColors);

		const renderer = await createCliRenderer({
			exitOnCtrlC: false,
			useKittyKeyboard: {},
			consoleOptions: {
				keyBindings: [
					// Kitty protocol may send uppercase 'C' for Ctrl+Shift+C
					{ name: "c", ctrl: true, shift: true, action: "copy-selection" },
					{ name: "C", ctrl: true, shift: true, action: "copy-selection" },
				],
				onCopySelection: (text: string) => {
					import("@devenv/core")
						.then(({ copyToClipboard }) => copyToClipboard(text))
						.catch(() => {});
				},
			},
		});

		setExitRenderer(renderer);

		let destroyed = false;
		const cleanup = () => {
			if (destroyed) return;
			destroyed = true;
			process.off("SIGINT", cleanup);
			process.off("SIGTERM", cleanup);
			process.off("SIGHUP", cleanup);
			renderer.destroy();
		};
		process.on("SIGINT", cleanup);
		process.on("SIGTERM", cleanup);
		process.on("SIGHUP", cleanup);

		try {
			await render(() => <TUIApp serverUrl={serverUrl} />, renderer);
		} finally {
			process.off("SIGINT", cleanup);
			process.off("SIGTERM", cleanup);
			process.off("SIGHUP", cleanup);
		}
	} catch (error) {
		console.error("Fatal error in TUI:", error);
		throw error;
	}
}
