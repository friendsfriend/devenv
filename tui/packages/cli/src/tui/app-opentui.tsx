import {
	render,
	usePaste,
	useRenderer,
	useTerminalDimensions,
} from '@opentui/solid';
import { createCliRenderer } from '@opentui/core';
import { createDefaultOpenTuiKeymap } from '@opentui/keymap/opentui';
import { KeymapProvider, useKeymap } from '@opentui/keymap/solid';
import { abortExitSignal, destroyExitRenderer, exitApp, getExitSignal, registerGracefulShutdownHandler, setExitRenderer } from "./exit";
import { onMount, createEffect, on, onCleanup } from 'solid-js';
import "opentui-spinner/solid";
import { APP_VERSION } from "../version";
import { createClient, registerFatalCleanup } from '@devenv/core';
import type { App } from '@devenv/types';
import {
	Header,
	StatusBar,
	Layout,
	getSelectableRows,
	setGlobalSelectionMouseUpHandler,
	uiColors,
} from '@devenv/ui';
import { createFrames } from "./spinner";
import {
	createAppStore,
	createIssueStore,
	createLogStore,
	createChangeRequestStore,
	createProviderStore,
	createUiStore,
	createAgentStore,
	createAppDetailStore,
} from "./stores";
import {
	createAppActions,
	createIssueActions,
	createLogActions,
	createCrActions,
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
	handleAddRepositoryModalKeys,
	handleConnectProviderModalKeys,
	handleDiffModalKeys,
	handleLogModalKeys,
	handleJobsKeys,
	handleCrListKeys,
	handleCrDetailKeys,
	handleChangedFilesKeys,
	handleTestResultsKeys,
	handleDiscussionsKeys,
	handleIssueTimelineKeys,
	handleMiscModalKeys,
	handleWorktreeManagerKeys,
	handleIssueListKeys,
	handleIssueDetailKeys,
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
import { applyTheme, loadCustomThemes, loadRendererThemeColors, loadSystemTheme, loadThemeName } from "./theme-settings";

interface TUIAppProps {
	serverUrl: string;
	managedServer?: import('../server-lifecycle').ManagedServer;
}

interface StartTUIOptions {
	managedServer?: import('../server-lifecycle').ManagedServer;
}

function TUIApp(props: TUIAppProps) {
	const dimensions = useTerminalDimensions();
	const renderer = useRenderer();

	// --- Stores ---
	const appStore = createAppStore();
	const issueStore = createIssueStore();
	const logStore = createLogStore();
	const changeRequestStore = createChangeRequestStore();
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
	const crActions = createCrActions(
		appStore,
		changeRequestStore,
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
		uiStore,
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
		changeRequestStore,
		client,
		showError,
	);
	const helpActions = createHelpActions(
		appStore,
		issueStore,
		logStore,
		changeRequestStore,
		uiStore,
	);

	const clearGlobalSelectionMouseUpHandler = setGlobalSelectionMouseUpHandler(
		utilActions.handleCopySelection,
	);
	onCleanup(clearGlobalSelectionMouseUpHandler);

	const launchPi = (sessionPath: string | null) =>
		agentActions.launchPi(sessionPath, renderer);

	const getSelectedApp = (): App | undefined => {
		const row = (appStore.viewMode() === "table"
			? appStore.tableFilteredApps()
			: appStore.filteredApps())[appStore.selectedIndex()];
		return row?.rowKind === "app" ? row : undefined;
	};

	// --- Effects ---
	setupLogEffects(logStore, client);

	const spinnerFrames = createFrames({
		color: uiColors.primary,
		style: "blocks",
		width: 6,
		inactiveFactor: 0.6,
		minAlpha: 0.3,
	});

	const hasActiveSpinner = () =>
		appStore.loading() ||
		appStore.startupState().phase !== "complete" ||
		appStore.exampleConfigLoading() ||
		!!appStore.operationInProgressForApp() ||
		appStore.isShuttingDown() ||
		appStore.hasActiveOperation() ||
		changeRequestStore.crLoading() ||
		changeRequestStore.crChangesLoading() ||
		changeRequestStore.crTestLoading() ||
		changeRequestStore.crJobsForDetailLoading() ||
		changeRequestStore.crDiscussionsLoading() ||
		changeRequestStore.jobsLoading() ||
		changeRequestStore.crAiLoading() ||
		logStore.logAiLoading() ||
		logStore.logAiStreaming();

	const spinnerInterval = setInterval(() => {
		if (hasActiveSpinner()) {
			appStore.setSpinnerFrame((prev) => (prev + 1) % spinnerFrames.length);
		}
	}, 80);
	onCleanup(() => clearInterval(spinnerInterval));

	createEffect(() => {
		if (!uiStore.runningTextEnabled()) return;
		const runningTextInterval = setInterval(() => {
			uiStore.setRunningTextOffset((prev) => prev + 1);
		}, 160);
		onCleanup(() => clearInterval(runningTextInterval));
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
			abortSignal: getExitSignal(),
		});
	});

	const shutdownDelay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
	const runWithTimeout = async (label: string, fn: () => void | Promise<void>, timeoutMs = 2000) => {
		let timeout: ReturnType<typeof setTimeout> | undefined;
		try {
			await Promise.race([
				Promise.resolve().then(fn),
				new Promise<never>((_, reject) => {
					timeout = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
				}),
			]);
		} finally {
			if (timeout) clearTimeout(timeout);
		}
	};
	const runShutdownStep = async (
		phase: "preparing" | "canceling-background-work" | "stopping-input" | "stopping-server" | "destroying-renderer" | "complete",
		message: string,
		fn: () => void | Promise<void>,
		timeoutMs?: number,
	) => {
		appStore.setShutdownState({ phase, message, error: null });
		await shutdownDelay(50);
		await runWithTimeout(message, fn, timeoutMs);
	};
	onMount(() => {
		const unregister = registerGracefulShutdownHandler(async () => {
			appStore.setIsShuttingDown(true);
			try {
				await runShutdownStep("preparing", "Preparing DevEnv shutdown...", () => shutdownDelay(50));
				await runShutdownStep("canceling-background-work", "Canceling background work...", () => abortExitSignal());
				await runShutdownStep("stopping-input", "Stopping input handlers...", () => shutdownDelay(50));
				if (props.managedServer) {
					appStore.setShutdownState({ phase: "stopping-server", message: "Stopping DevEnv server...", error: null });
					await shutdownDelay(50);
					await props.managedServer.stop(2000);
				}
				appStore.setShutdownState({ phase: "destroying-renderer", message: "Destroying terminal renderer...", error: null });
				await shutdownDelay(50);
				appStore.setShutdownState({ phase: "complete", message: "Shutdown complete.", error: null });
				await shutdownDelay(120);
				renderer.destroy();
			} catch (error) {
				const currentShutdownPhase = appStore.shutdownState().phase;
				const failedPhase = currentShutdownPhase === "failed" || currentShutdownPhase === "idle"
					? "preparing"
					: currentShutdownPhase;
				appStore.setShutdownState({
					phase: "failed",
					message: "Shutdown failed.",
					error: error instanceof Error ? error.message : String(error),
					failedPhase,
				});
				abortExitSignal();
				await shutdownDelay(600);
				renderer.destroy();
			}
		});
		onCleanup(unregister);
	});

	// --- Columns ---
	const columns = createColumns();
	const scriptColumns = createScriptColumns();

	// --- Keyboard dispatcher ---
	const kbStores: KeyboardStores = {
		appStore,
		issueStore,
		logStore,
		changeRequestStore,
		providerStore,
		uiStore,
		agentStore,
		appDetailStore,
	};
	const kbActions: KeyboardActions = {
		appActions,
		issueActions,
		logActions,
		crActions,
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

	const keymap = useKeymap();
	onMount(() => {
		const dispose = keymap.intercept("key", (input) => {
			if (appStore.isShuttingDown()) {
				input.consume();
				return;
			}
			void (async () => {
				const event = input.event;
				const handled =
					(await handleGlobalKeys(event, kbStores, kbActions, kbCtx)) ||
					(await handleAddRepositoryModalKeys(event, kbStores, kbActions)) ||
					(await handleConnectProviderModalKeys(event, kbStores, kbActions)) ||
					(await handleDiffModalKeys(event, kbStores, kbActions, kbCtx)) ||
					(await handleLogModalKeys(event, kbStores, kbActions, kbCtx)) ||
					(await handleJobsKeys(event, kbStores, kbActions, kbCtx)) ||
					(await handleCrListKeys(event, kbStores, kbActions, kbCtx)) ||
					(await handleCrDetailKeys(event, kbStores, kbActions, kbCtx)) ||
					(await handleIssueListKeys(event, kbStores, kbActions, kbCtx)) ||
					(await handleIssueDetailKeys(event, kbStores, kbActions, kbCtx)) ||
					(await handleIssueTimelineKeys(event, kbStores, kbActions, kbCtx)) ||
					(await handleReferencesKeys(event, kbStores, kbActions, kbCtx)) ||
					(await handleChangedFilesKeys(event, kbStores, kbActions, kbCtx)) ||
					(await handleTestResultsKeys(event, kbStores, kbActions, kbCtx)) ||
					(await handleDiscussionsKeys(event, kbStores, kbActions, kbCtx)) ||
					(await handleMiscModalKeys(event, kbStores, kbActions, kbCtx)) ||
					(await handleWorktreeManagerKeys(event, kbStores, kbActions, kbCtx)) ||
					(await handleTableKeys(event, kbStores, kbActions, kbCtx));
				if (handled) input.consume();
			})();
		});
		onCleanup(dispose);
	});

	usePaste((event) => {
		if (appStore.isShuttingDown()) return;
		handlePaste(event, providerStore);
	});

	// --- View props ---
	const viewStores: ViewStores = {
		appStore,
		issueStore,
		logStore,
		changeRequestStore,
		providerStore,
		uiStore,
		agentStore,
		appDetailStore,
	};
	const viewActions: ViewActions = {
		appActions,
		issueActions,
		logActions,
		crActions,
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
		changeRequestStore,
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
									? `Pipeline #${changeRequestStore.currentPipelineId() || "N/A"} \u2022 ${changeRequestStore.jobs().length} jobs`
									: appStore.viewMode() === "changeRequestDetail"
										? `Branch: ${appStore.filteredApps()[appStore.selectedIndex()]?.branch || "unknown"}`
										: appStore.viewMode() === "changeRequests"
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

export async function startTUI(serverUrl: string, options: StartTUIOptions = {}) {
	try {
		// Force enable color support for terminal
		process.env.FORCE_COLOR = "3"; // Force truecolor

		const useConsole = process.env.DEVENV_TUI_CONSOLE === "1";
		const renderer = await createCliRenderer({
			targetFps: 60,
			gatherStats: true,
			exitOnCtrlC: false,
			consoleMode: useConsole ? "console-overlay" : "disabled",
			useKittyKeyboard: {},
			exitSignals: [],
			...(useConsole ? {
				consoleOptions: {
					onCopySelection: (text: string) => {
						import("@devenv/core")
							.then(({ copyToClipboard }) => copyToClipboard(text))
							.catch(() => {});
					},
				},
			} : {}),
		});

		loadSystemTheme(await loadRendererThemeColors(renderer));
		setExitRenderer(renderer);

		let destroyed = false;
		const cleanup = () => {
			if (destroyed) return;
			destroyed = true;
			process.off("SIGINT", gracefulSignalCleanup);
			process.off("SIGTERM", gracefulSignalCleanup);
			process.off("SIGHUP", cleanup);
			abortExitSignal();
			destroyExitRenderer();
		};
		const gracefulSignalCleanup = () => {
			void exitApp();
		};
		process.on("SIGINT", gracefulSignalCleanup);
		process.on("SIGTERM", gracefulSignalCleanup);
		process.on("SIGHUP", cleanup);
		const unregisterFatalCleanup = registerFatalCleanup(cleanup);

		const rendererDestroyed = new Promise<void>((resolve) => {
			renderer.once("destroy", () => {
				destroyed = true;
				resolve();
			});
		});

		const keymap = createDefaultOpenTuiKeymap(renderer);

		try {
			await render(
				() => (
					<KeymapProvider keymap={keymap}>
						<TUIApp serverUrl={serverUrl} managedServer={options.managedServer} />
					</KeymapProvider>
				),
				renderer,
			);
			await rendererDestroyed;
			await new Promise<void>((resolve) => queueMicrotask(resolve));
		} finally {
			unregisterFatalCleanup();
			process.off("SIGINT", gracefulSignalCleanup);
			process.off("SIGTERM", gracefulSignalCleanup);
			process.off("SIGHUP", cleanup);
			cleanup();
		}
	} catch (error) {
		console.error("Fatal error in TUI:", error);
		throw error;
	}
}
