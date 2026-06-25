import type { HelpSection } from "@devenv/ui";
import { KEYBINDS } from "../keyboard/registry";
import type { AppStore } from "../stores/app-store";
import type { IssueStore } from "../stores/issue-store";
import type { LogStore } from "../stores/log-store";
import type { MrStore } from "../stores/mr-store";
import type { UiStore } from "../stores/ui-store";

const COMMON_NAVIGATION_ITEMS: HelpSection["items"] = [
	{ key: "j/k, ↑/↓", description: "Move selection or scroll one line" },
	{ key: "u/d", description: "Page or half-page up/down where supported" },
	{ key: "g/G", description: "Go to top/bottom where supported" },
	{ key: "/", description: "Search/filter current list where supported" },
	{ key: "h/l, ←/→", description: "Move left/right, switch page, file, or stage where supported" },
];

// ponytail: context titles map, extend when new view modes are added
const CONTEXT_TITLES: Record<string, string> = {
	global: "Global",
	table: "Application Table",
	mergeRequests: "Merge Request List",
	mergeRequestDetail: "Merge Request Detail",
	jobs: "Pipeline Jobs",
	testResults: "Test Results",
	changedFiles: "Changed Files",
	discussionsView: "Discussions/Comments",
	appDetail: "Application Details",
	providers: "Providers",
	issues: "Issues",
	issueDetail: "Issue Detail",
	issueScopePicker: "Issue Scope Picker",
	linkedMRs: "Linked Merge Requests",
	referencedIssues: "Referenced Issues",
	mrLinkedIssues: "MR Linked Issues",
	references: "References",
	agentView: "AI Agent",
	sshPicker: "SSH Host Picker",
	logModal: "Log Modal",
	passphraseModal: "Passphrase Modal",
	branchSelector: "Branch Selector",
	createBranchModal: "Create Branch Modal",
	diffModal: "Diff Modal",
	worktreeManager: "Worktree Manager",
	connectProvider: "Provider Connect Modal",
	addAppModal: "Add App Modal",
	scriptArgsModal: "Script Args Modal",
	scriptAddModal: "Script Add Modal",
	editorPicker: "Editor Picker",
	issueSubView: "Issue Sub-View",
	firstSteps: "First Steps",
	help: "Help",
	markdownModal: "Markdown Modal",
	errorDialog: "Error Dialog",
	confirmDialog: "Confirm Dialog",
	profilePicker: "Profile Picker",
};

function keyTokens(key: string): string[] {
	return key
		.split(/[,/]| or /)
		.map((token) => token.trim())
		.filter(Boolean);
}

function overlapsKey(a: string, b: string): boolean {
	const bTokens = new Set(keyTokens(b));
	return keyTokens(a).some((token) => bTokens.has(token));
}

function getSectionsForContext(context: string): HelpSection[] {
	const groups = new Map<string, Array<{ key: string; description: string }>>();

	for (const def of KEYBINDS) {
		if (def.context !== "global" && def.context !== context) continue;
		const key = def.keys.join(", ");
		if (!groups.has(def.category)) groups.set(def.category, []);
		const items = groups.get(def.category)!;
		if (!items.some((item) => item.key === key && item.description === def.description)) {
			items.push({ key, description: def.description });
		}
	}

	const navItems = groups.get("Navigation") ?? [];
	groups.set("Navigation", [
		...COMMON_NAVIGATION_ITEMS.filter(
			(common) => !navItems.some((item) => overlapsKey(common.key, item.key)),
		),
		...navItems,
	]);

	return Array.from(groups.entries()).map(([title, items]) => ({
		title,
		items,
	}));
}

function getKeybindsForContext(context: string): Array<{ key: string; action: string }> {
	return KEYBINDS
		.filter((d) => d.context === "global" || d.context === context)
		.map((d) => ({ key: d.keys.join(", "), action: d.description }));
}

export function createHelpActions(
	appStore: AppStore,
	issueStore: IssueStore,
	logStore: LogStore,
	mrStore: MrStore,
	uiStore: UiStore,
) {
	const showHelp = () => {
		appStore.setPreviousViewMode(appStore.viewMode());
		appStore.setViewMode("help");
	};

	const closeHelp = () => {
		appStore.setViewMode(appStore.previousViewMode() ?? "table");
	};

	const getHelpContent = (
		allContexts?: boolean,
	): { sections: HelpSection[]; title: string } => {
		if (allContexts) {
			// Group all keybinds by context name with context as section title
			const contextGroups = new Map<string, Array<{ key: string; description: string }>>();
			for (const def of KEYBINDS) {
				const ctxTitle = CONTEXT_TITLES[def.context] ?? def.context;
				if (!contextGroups.has(ctxTitle)) contextGroups.set(ctxTitle, []);
				contextGroups.get(ctxTitle)!.push({
					key: def.keys.join(", "),
					description: def.description,
				});
			}
			return {
				title: "All Contexts",
				sections: [
					{ title: "Navigation", items: COMMON_NAVIGATION_ITEMS },
					...Array.from(contextGroups.entries()).map(([title, items]) => ({
						title,
						items,
					})),
				],
			};
		}
		const currentView = appStore.previousViewMode() ?? "table";
		const title = CONTEXT_TITLES[currentView] ?? "Help";
		return { title, sections: getSectionsForContext(currentView) };
	};

	const getKeybinds = () => {
		// Modal state overrides — these depend on runtime state, not registry
		if (uiStore.showPassphraseModal())
			return [
				{ key: "Enter", action: "Unlock Key" },
				{ key: "Esc", action: "Cancel" },
			];
		if (appStore.viewMode() === "help") return getKeybindsForContext("help");
		if (appStore.viewMode() === "discussionsView") {
			if (mrStore.replyMode())
				return [
					{ key: "Ctrl+Enter", action: "Submit Reply" },
					{ key: "Esc", action: "Cancel Reply" },
				];
			return getKeybindsForContext("discussionsView");
		}
		if (logStore.showLogModal()) {
			if (logStore.logSearchMode())
				return [
					{ key: "Enter", action: "Confirm Search" },
					{ key: "Backspace", action: "Delete Char" },
					{ key: "Esc", action: "Cancel Search" },
				];
			if (logStore.logVisualModeActive())
				return [
					{ key: "j/k", action: "Extend Selection" },
					{ key: "c", action: "Copy Selection" },
					{ key: "v/Esc", action: "Exit Visual" },
					{ key: "q", action: "Quit" },
				];
			return getKeybindsForContext("logModal");
		}
		if (appStore.viewMode() === "issueDetail") {
			if (issueStore.showCloseReasonModal())
				return [
					{ key: "j/k", action: "Navigate" },
					{ key: "Enter", action: "Select Reason" },
					{ key: "Esc", action: "Cancel" },
				];
			if (issueStore.showLabelPicker())
				return [
					{ key: "j/k", action: "Navigate" },
					{ key: "Enter", action: "Toggle" },
					{ key: "Esc", action: "Confirm" },
				];
			if (issueStore.showAssigneePicker())
				return [
					{ key: "j/k", action: "Navigate" },
					{ key: "Enter", action: "Assign/Unassign" },
					{ key: "Esc", action: "Cancel" },
				];
			if (issueStore.showCommentModal())
				return [
					{ key: "Enter", action: "New line" },
					{ key: "Ctrl+Enter", action: "Submit" },
					{ key: "Esc", action: "Cancel" },
				];
			return getKeybindsForContext("issueDetail");
		}

		const viewMode = appStore.viewMode();
		const binds = getKeybindsForContext(viewMode);
		if (binds.length > 0) return binds;

		// Fallback for table with sub-modes
		if (viewMode === "table" && appStore.tableSearchMode()) {
			return [
				{ key: "Enter", action: "Confirm" },
				{ key: "Backspace", action: "Delete Char" },
				{ key: "Esc", action: "Cancel" },
			];
		}

		return binds;
	};

	return { showHelp, closeHelp, getHelpContent, getKeybinds };
}

export type HelpActions = ReturnType<typeof createHelpActions>;
