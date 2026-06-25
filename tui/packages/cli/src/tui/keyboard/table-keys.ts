import { getLogger } from "@devenv/core";
import { isDownKey, isUpKey } from './nav-keys';
import type {
	KeyboardEvent,
	KeyboardStores,
	KeyboardActions,
	KeyboardContext,
} from "./types";

/**
 * Handles keyboard events for table-level views:
 * - Branch selector overlay (ESC/q to close, Enter to checkout, j/k navigation)
 * - App detail escape/quit
 * - Table search mode (type query, clear)
 * - Main table navigation (switch with j/k/tab, app operations, view launchers)
 */
export async function handleTableKeys(
	event: KeyboardEvent,
	stores: KeyboardStores,
	actions: KeyboardActions,
	ctx: KeyboardContext,
): Promise<boolean> {
	const { appStore, uiStore } = stores;
	const {
		appActions,
		issueActions,
		logActions,
		mrActions,
		dockerActions,
		gitActions,
		providerActions,
		agentActions,
		utilActions,
		helpActions,
	} = actions;
	const { client, getSelectedApp, showError } = ctx;

	// Branch selector overlay keyboard handler (runs while viewMode stays 'table')
	if (uiStore.showBranchSelector()) {
		// Create branch sub-modal guard — intercept all keys while the modal is open
		if (uiStore.showCreateBranchModal()) {
			if (
				event.name === "escape" ||
				event.name === "Escape" ||
				event.name === "esc" ||
				event.sequence === "\x1b" ||
				event.raw === "\x1b"
			) {
				uiStore.setShowCreateBranchModal(false);
				uiStore.setCreateBranchName("");
				return true;
			}
			if (
				event.name === "return" ||
				event.name === "Return" ||
				event.name === "enter" ||
				event.name === "Enter"
			) {
				void gitActions.createBranch();
				return true;
			}
			// All other keys (including printable chars) fall through to the
			// BranchCreateModal's focused <input> element.
			return false;
		}

		const isEsc =
			event.name === "escape" ||
			event.name === "Escape" ||
			event.name === "esc" ||
			event.sequence === "\x1b" ||
			event.raw === "\x1b";

		if (isEsc) {
			if (uiStore.branchFilterActive() || uiStore.branchFilterQuery()) {
				uiStore.setBranchFilterActive(false);
				uiStore.setBranchFilterQuery("");
				uiStore.setBranchSelectorIndex(0);
				return true;
			}
			// Second Esc (or Esc with no active filter): close the selector
			gitActions.closeBranchSelector();
			return true;
		}
		if (
			event.name === "return" ||
			event.name === "Return" ||
			event.name === "enter" ||
			event.name === "Enter"
		) {
			if (uiStore.branchFilterActive()) {
				// Enter in filter mode: finish filtering, return focus to the list
				uiStore.setBranchFilterActive(false);
				return true;
			}
			if (uiStore.branchSelectorWorktreeCreateMode()) {
				void gitActions.createWorktreeFromBranchSelector();
			} else {
				void gitActions.performCheckout();
			}
			return true;
		}
		if (
			isDownKey(event)
		) {
			uiStore.setBranchSelectorIndex((prev) =>
				Math.min(prev + 1, uiStore.filteredBranches().length - 1),
			);
			return true;
		}
		if (
			isUpKey(event)
		) {
			uiStore.setBranchSelectorIndex((prev) => Math.max(prev - 1, 0));
			return true;
		}
		// ctrl+n: open the create branch sub-modal — only in normal branch mode, not worktree create mode
		if (
			event.ctrl &&
			event.name === "n" &&
			!uiStore.branchSelectorWorktreeCreateMode()
		) {
			uiStore.setCreateBranchName("");
			uiStore.setShowCreateBranchModal(true);
			return true;
		}
		// / — activate filter mode (focuses the ListViewModal built-in filter input)
		if (event.sequence === "/" && !uiStore.branchFilterActive()) {
			uiStore.setBranchFilterQuery("");
			uiStore.setBranchFilterActive(true);
			return true;
		}
		// When filter is active: let the focused <input> handle printable keys
		if (uiStore.branchFilterActive()) {
			return false;
		}
		// Normal mode only: letter-based navigation
		const branchMaxIdx = uiStore.filteredBranches().length - 1;
		const branchPageSize = (() => {
			const rows = process.stdout.rows ?? 24;
			return Math.max(1, Math.max(5, Math.floor(rows * 0.7) - 5 - 2));
		})();
		if (isDownKey(event)) {
			uiStore.setBranchSelectorIndex((prev) =>
				Math.min(prev + 1, branchMaxIdx),
			);
			return true;
		}
		if (isUpKey(event)) {
			uiStore.setBranchSelectorIndex((prev) => Math.max(prev - 1, 0));
			return true;
		}
		if (event.name === "d") {
			uiStore.setBranchSelectorIndex((prev) =>
				Math.min(prev + Math.floor(branchPageSize / 2), branchMaxIdx),
			);
			return true;
		}
		if (event.name === "u") {
			uiStore.setBranchSelectorIndex((prev) =>
				Math.max(prev - Math.floor(branchPageSize / 2), 0),
			);
			return true;
		}
		// Action keybinds (non-worktree mode only)
		if (!uiStore.branchSelectorWorktreeCreateMode()) {
			// s — switch/checkout the selected branch
			if (event.sequence === "s") {
				void gitActions.performCheckout();
				return true;
			}
			// l — open lazygit log for the selected branch
			if (event.sequence === "l") {
				const selectedBranch =
					uiStore.filteredBranches()[uiStore.branchSelectorIndex()];
				if (selectedBranch)
					utilActions.launchLazygitBranchLog(selectedBranch.name);
				return true;
			}
			// f — git fetch
			if (event.sequence === "f") {
				void gitActions.performGitFetch();
				return true;
			}
			// p — git pull
			if (event.sequence === "p") {
				void gitActions.performGitPull();
				return true;
			}
			// P — git push (Shift+P)
			if (event.sequence === "P") {
				void gitActions.performGitPush();
				return true;
			}
			// g — open lazygit on the status panel
			if (event.sequence === "g") {
				utilActions.launchLazygitStatus();
				return true;
			}
		}
		// Normal mode: consume all other keys (no accidental typing)
		return true;
	}

	// Table view navigation
	// Note: For case-sensitive letter detection, we need to check event.sequence
	// For special keys (arrows, etc), event.name is reliable
	// Strategy: If sequence is a single letter, use it; otherwise use name

	if (appStore.viewMode() === "appDetail") {
		if (
			event.name === "escape" ||
			event.name === "esc" ||
			event.sequence === "\x1b"
		) {
			appActions.closeAppDetail();
		}
		if (event.name === "q" || event.name === "Q") {
			appActions.exitApp();
		}
		return true;
	}

	// Only handle table mode from here
	if (appStore.viewMode() !== "table") return false;

	// Table search mode — capture all keys while user is typing
	if (appStore.tableSearchMode()) {
		if (
			event.name === "escape" ||
			event.name === "Escape" ||
			event.name === "esc" ||
			event.sequence === "\x1b"
		) {
			appStore.setTableSearchMode(false);
			appStore.setTableSearchQuery("");
			appStore.setSelectedIndex(0);
			return true;
		}
		if (event.name === "return" || event.name === "enter") {
			appStore.setTableSearchMode(false);
			appStore.setSelectedIndex(0);
			return true;
		}
		if (event.name === "backspace" || event.name === "delete") {
			appStore.setTableSearchQuery((q) => q.slice(0, -1));
			appStore.setSelectedIndex(0);
			return true;
		}
		const ch = event.sequence ?? event.name ?? "";
		if (ch.length === 1 && ch >= " ") {
			appStore.setTableSearchQuery((q) => q + ch);
			appStore.setSelectedIndex(0);
			return true;
		}
		return true; // swallow all other keys
	}

	const appList = appStore.tableFilteredApps();
	const isLetter =
		event.sequence &&
		event.sequence.length === 1 &&
		/[a-zA-Z]/.test(event.sequence);
	const key = isLetter ? event.sequence : event.name;
	if (event.sequence === "?" || event.name === "?" || (event.name === "/" && event.shift)) {
		helpActions.showHelp();
		return true;
	}

	switch (key) {
		case "q":
		case "Q":
			appActions.exitApp();
			break;
		case "/":
			appStore.setTableSearchMode(true);
			appStore.setTableSearchQuery("");
			appStore.setSelectedIndex(0);
			break;
		case "return":
		case "enter":
			if (appStore.activeTab() === "scripts") {
				const selected = appList[appStore.selectedIndex()];
				if (selected?.resourceType === "script-folder") {
					appActions.toggleScriptFolder();
				} else if (selected?.resourceType === "script-file") {
					// openScriptArgsModal fetches metadata from server and shows modal if params exist
					void utilActions.openScriptArgsModal();
				}
			} else if (appList.length > 0) {
				void appActions.openAppDetail();
			}
			break;
		case "escape":
			if (appStore.tableSearchQuery()) {
				// Clear active search on first Esc
				appStore.setTableSearchQuery("");
				appStore.setSelectedIndex(0);
			} else {
				appStore.setViewMode("table"); // no-op if already table, but harmless
			}
			break;
		case "tab":
		case "\t":
			// Cycle through tabs
			appStore.setActiveTab((tab) => {
				if (tab === "applications") return "infrastructure";
				if (tab === "infrastructure") return "libraries";
				if (tab === "libraries") return "scripts";
				return "applications";
			});
			appStore.setSelectedIndex(0); // Reset selection when switching tabs
			appStore.setTableSearchQuery("");
			appStore.setTableSearchMode(false);
			if (appStore.activeTab() === "scripts") void appActions.loadScripts();
			break;
		case "1":
			appStore.setActiveTab("applications");
			appStore.setSelectedIndex(0);
			appStore.setTableSearchQuery("");
			appStore.setTableSearchMode(false);
			break;
		case "2":
			appStore.setActiveTab("infrastructure");
			appStore.setSelectedIndex(0);
			appStore.setTableSearchQuery("");
			appStore.setTableSearchMode(false);
			break;
		case "3":
			appStore.setActiveTab("libraries");
			appStore.setSelectedIndex(0);
			appStore.setTableSearchQuery("");
			appStore.setTableSearchMode(false);
			break;
		case "4":
			appStore.setActiveTab("scripts");
			appStore.setSelectedIndex(0);
			appStore.setTableSearchQuery("");
			appStore.setTableSearchMode(false);
			void appActions.loadScripts();
			break;
		case "down":
		case "Down":
		case "j":
			if (appList.length > 0) {
				appStore.setSelectedIndex((prev) =>
					Math.min(prev + 1, appList.length - 1),
				);
			}
			break;
		case "up":
		case "Up":
		case "k":
			if (appList.length > 0) {
				appStore.setSelectedIndex((prev) => Math.max(prev - 1, 0));
			}
			break;
		case "l":
			if (appStore.activeTab() !== "scripts" && appList.length > 0)
				logActions.loadContainerLogs();
			break;
		case "L":
			// Toggle status log maximize (uppercase L)
			appStore.setStatusLogMaximized((prev) => !prev);
			break;
		case "o":
			if (appStore.activeTab() !== "scripts" && appList.length > 0)
				logActions.loadOperationLogs();
			break;
		case "m":
			// Show MR detail for current branch (lowercase m)
			if (appStore.activeTab() !== "scripts" && appList.length > 0)
				mrActions.loadMergeRequestForCurrentBranch();
			break;
		case "M":
			// Show all open MRs list (uppercase M / Shift+M)
			if (appStore.activeTab() !== "scripts" && appList.length > 0)
				mrActions.loadAllMergeRequests();
			break;
		case "i":
			// Open issue scope picker (lowercase i)
			if (appStore.activeTab() !== "scripts" && appList.length > 0)
				appStore.setViewMode("issueScopePicker");
			break;
		case "I":
			// Load all issues directly (uppercase I / Shift+I)
			if (appStore.activeTab() !== "scripts" && appList.length > 0)
				issueActions.loadAllIssues();
			break;
		case "c":
			providerActions.loadProviders();
			break;
		case "s":
			if (appStore.activeTab() === "scripts") {
				if (appList.length > 0) {
					// openScriptArgsModal fetches metadata from server and shows modal if params exist
					void utilActions.openScriptArgsModal();
				}
				break;
			}
			// Start container — open profile picker
			if (appList.length > 0) {
				const app = getSelectedApp();
				if (!app) break;
				if (appStore.operationInProgressForApp()) {
					showError(
						"Operation In Progress",
						"Another operation is already in progress. Please wait for it to complete.",
					);
					break;
				}
				uiStore.setProfilePickerLoading(true);
				uiStore.setProfilePickerProfiles([]);
				uiStore.setProfilePickerHasDockerfile(false);
				uiStore.setProfilePickerSelectedIndex(0);
				uiStore.setProfilePickerAppIdent(app.ident);
				uiStore.setShowProfilePicker(true);
				client
					.getProfiles(app.ident)
					.then((result) => {
						uiStore.setProfilePickerProfiles(result.profiles);
						uiStore.setProfilePickerHasDockerfile(result.hasDockerfile);
					})
					.catch((e) => {
						getLogger().write("WARN", `Failed to fetch profiles: ${e}`);
						uiStore.setProfilePickerProfiles([]);
						uiStore.setProfilePickerHasDockerfile(false);
					})
					.finally(() => {
						uiStore.setProfilePickerLoading(false);
					});
			}
			break;
		case "S":
			if (appStore.activeTab() === "scripts") {
				if (appList.length > 0) void utilActions.openScriptArgsModal();
				break;
			}
			// Stop container (uppercase S)
			if (appStore.activeTab() !== "scripts" && appList.length > 0)
				dockerActions.requestDockerOperation("stop");
			break;
		case "r":
			// Manual refresh (lowercase r)
			if (appStore.activeTab() === "scripts") void appActions.loadScripts();
			else appActions.fetchStatus();
			break;
		case "R":
			// Restart container (uppercase R / Shift+R)
			if (appStore.activeTab() !== "scripts" && appList.length > 0)
				dockerActions.requestDockerOperation("restart");
			break;
		case "f":
			// Git fetch (lowercase f)
			if (appStore.activeTab() !== "scripts" && appList.length > 0)
				gitActions.performGitFetch();
			break;
		case "g":
			// Branch selector (lowercase g)
			if (appStore.activeTab() !== "scripts" && appList.length > 0)
				gitActions.openBranchSelector();
			break;
		case "w": {
			// Worktree manager (lowercase w)
			if (appStore.activeTab() !== "scripts" && appList.length > 0) {
				const app = getSelectedApp();
				if (app) {
					uiStore.setWorktreeManagerAppId(app.ident);
					uiStore.setWorktreeManagerSelectedIndex(0);
					uiStore.setWorktreeManagerWorktrees([]);
					uiStore.setShowWorktreeManagerModal(true);
					client
						.listWorktrees(app.ident)
						.then((wts) => {
							uiStore.setWorktreeManagerWorktrees(wts);
							// Re-clamp the index in case the user pressed j/k before the list arrived
							uiStore.setWorktreeManagerSelectedIndex((prev) =>
								Math.min(Math.max(prev, 0), Math.max(0, wts.length - 1)),
							);
						})
						.catch((e) => {
							uiStore.setShowWorktreeManagerModal(false);
							uiStore.setWorktreeManagerAppId(null);
							showError(
								"Failed to Load Worktrees",
								`Could not load worktrees for ${app.displayName}.\n\nError: ${e instanceof Error ? e.message : "Unknown error"}`,
							);
						});
				}
			}
			break;
		}
		case "e":
			// Open selected app directory in default editor ($EDITOR)
			if (appList.length > 0) utilActions.openInEditor();
			break;
		case "E":
			// Open editor picker to choose which editor to use (Shift+E)
			if (appList.length > 0) utilActions.openEditorPicker();
			break;
		case "G":
			// Open selected app repository in lazygit (Shift+G)
			if (appStore.activeTab() !== "scripts" && appList.length > 0)
				utilActions.launchLazygit();
			break;
		case "d":
			// Open lazydocker for selected app
			if (appStore.activeTab() !== "scripts" && appList.length > 0)
				utilActions.launchLazydocker();
			break;
		case "B":
			// Build (uppercase B)
			if (appStore.activeTab() !== "scripts" && appList.length > 0)
				dockerActions.performBuild();
			break;
		case "A":
			// Open Agent view (uppercase A)
			agentActions.openAgentView();
			break;
		case "H":
			// Open SSH host picker (uppercase H)
			utilActions.openSshPicker();
			break;
		case "+":
			if (appStore.activeTab() === "scripts")
				void appActions.openAddScriptModal();
			else void providerActions.openAddAppModal();
			break;
		case "-":
			if (appStore.activeTab() === "scripts") appActions.requestRemoveScript();
			else appActions.requestRemoveApp();
			break;
	}

	return true;
}
