import { uiColors } from "@devenv/ui";
import type { App, InfraService } from "@devenv/types";
import type { AppStore, AppDetailStore, IssueStore, MrStore } from "../stores";
import type { HelpActions } from "../actions";

export type TabType =
	| "applications"
	| "infrastructure"
	| "libraries"
	| "scripts";

export const getTabName = (tab: TabType): string => {
	switch (tab) {
		case "applications":
			return "Applications";
		case "infrastructure":
			return "Infrastructure";
		case "libraries":
			return "Libraries";
		case "scripts":
			return "Scripts";
	}
};

export function hasRunningAppInTab(tab: TabType, appStore: AppStore): boolean {
	const allApps = appStore.apps();
	if (tab === "scripts") return false;

	const appsInTab: (App | InfraService)[] =
		tab === "applications"
			? allApps.filter((app) => app.appType === "APP")
			: tab === "libraries"
				? allApps.filter((app) => app.appType === "LIB")
				: appStore.infraServices();

	return appsInTab.some((app) => {
		const status = app.dockerInfo?.Status?.toLowerCase();
		return status === "running" || status === "up";
	});
}

export function getTabBorderColor(tab: TabType, appStore: AppStore): string {
	return hasRunningAppInTab(tab, appStore)
		? uiColors.success
		: uiColors.primary;
}

export interface HeaderInfo {
	title: string;
	context?: string;
	detail?: string;
	details?: Array<Record<string, string | number | undefined | null>>;
	right?: string;
	severity?: "normal" | "success" | "warning" | "error";
}

interface HeaderSubtitleDeps {
	appStore: AppStore;
	issueStore: IssueStore;
	mrStore: MrStore;
	appDetailStore: AppDetailStore;
	helpActions: HelpActions;
	getSelectedApp: () => App | undefined;
}

const headerText = (value: unknown, _max?: number): string => String(value ?? "");

const appDetails = (app: App | undefined): Array<Record<string, string>> => {
	const details: Array<Record<string, string>> = [];
	const id = app?.dockerInfo?.ContainerID;
	if (id) details.push({ containerId: id.slice(0, 12) });
	if (app?.localDirectoryPath) details.push({ path: app.localDirectoryPath });
	return details;
};

export function getHeaderInfo(deps: HeaderSubtitleDeps): HeaderInfo {
	const {
		appStore,
		issueStore,
		mrStore,
		appDetailStore,
		helpActions,
		getSelectedApp,
	} = deps;
	const view = appStore.viewMode();
	const selectedApp = getSelectedApp();
	const live = appStore.liveUpdatesActive() ? "live" : "paused";
	const branch = selectedApp?.branch ? ` · ${selectedApp.branch}` : "";

	if (appStore.loading()) {
		return { title: "Starting", context: appStore.startupState().message, right: live };
	}
	if (appStore.error()) {
		return { title: "Error", context: headerText(appStore.error(), 90), right: "? help", severity: "error" };
	}
	if (view === "table") {
		const search = appStore.tableSearchQuery();
		return {
			title: getTabName(appStore.activeTab()),
			details: search ? [{ search }] : appDetails(selectedApp),
			right: live,
		};
	}
	if (view === "help") {
		const helpData = helpActions.getHelpContent(appStore.helpAllContexts());
		return { title: "Help", context: appStore.helpActiveTab(), detail: helpData.title, right: appStore.helpSearchQuery() ? `Search: ${appStore.helpSearchQuery()}` : "? close" };
	}
	if (view === "providers") {
		return { title: "Providers", context: "configured providers", detail: "add/edit/delete provider connections" };
	}
	if (view === "jobs") {
		const failed = mrStore.jobs().filter((j: any) => j.status === "failed").length;
		const running = mrStore.jobs().filter((j: any) => j.status === "running").length;
		return { title: `Pipeline #${mrStore.currentPipelineId() || "N/A"}`, context: `${mrStore.jobs().length} jobs · ${running} running · ${failed} failed`, detail: headerText(selectedApp?.displayName), severity: failed ? "error" : running ? "warning" : "normal" };
	}
	if (view === "issues") {
		return { title: "Issues", context: `${issueStore.issueScope()} · page ${issueStore.currentPage()}/${issueStore.totalPages() || 1}`, detail: issueStore.issueSearchQuery() ? `Search: "${issueStore.issueSearchQuery()}"` : headerText(`${selectedApp?.displayName ?? "All apps"}${branch}`), right: `${issueStore.totalCount()} total` };
	}
	if (view === "issueDetail") {
		const issue: any = issueStore.selectedIssue();
		return issue ? { title: issue.reference ?? `#${issue.iid}`, context: headerText(issue.title), detail: `comments: ${issueStore.issueComments().length} · linked MRs: ${issueStore.linkedMRs().length} · refs: ${issueStore.references().length}`, right: issue.state ?? "" } : { title: "Issue detail" };
	}
	if (view === "mergeRequests") {
		return { title: "Merge requests", context: `${selectedApp?.displayName ?? "All apps"}${branch}`, detail: mrStore.mrSearchQuery() ? `Search: "${mrStore.mrSearchQuery()}"` : `page ${mrStore.currentPage()}/${mrStore.totalPages() || 1}`, right: `${mrStore.totalCount()} total` };
	}
	if (view === "mergeRequestDetail") {
		const mr: any = mrStore.selectedMR();
		return mr ? { title: `MR !${mr.iid}`, context: headerText(mr.title), detail: `changes: ${mrStore.mrChanges().length} · discussions: ${mrStore.mrDiscussions().length} · jobs: ${mrStore.mrJobsForDetail().length}`, right: mr.state ?? "" } : { title: "Merge request" };
	}
	if (view === "changedFiles") {
		const files = mrStore.changedFilesFiltered();
		const file: any = files[mrStore.selectedChangedFileIndex()];
		return { title: "Changed files", context: `${files.length} files`, detail: mrStore.changedFilesSearchQuery() ? `Search: "${mrStore.changedFilesSearchQuery()}"` : headerText(file?.new_path ?? file?.old_path ?? "No file"), right: mrStore.selectedMR() ? `MR !${(mrStore.selectedMR() as any).iid}` : "" };
	}
	if (view === "discussionsView") {
		return { title: "Discussions", context: `${mrStore.mrDiscussions().length} threads`, detail: mrStore.discussionsShowOnlyComments() ? "comments only" : "all discussions", right: mrStore.selectedMR() ? `MR !${(mrStore.selectedMR() as any).iid}` : "" };
	}
	if (view === "testResults") {
		const test: any = mrStore.selectedTestForDetail();
		return { title: "Test results", context: mrStore.mrTestSummary() ? "loaded" : "no summary", detail: headerText(test?.name ?? test?.classname ?? "No test selected"), right: mrStore.selectedMR() ? `MR !${(mrStore.selectedMR() as any).iid}` : "" };
	}
	if (view === "appDetail") {
		const app = appDetailStore.appDetailApp();
		return { title: "App detail", context: headerText(`${app?.displayName ?? "Unknown"}${app?.branch ? ` · ${app.branch}` : ""}`), detail: `MRs: ${appDetailStore.appDetailMRs().length} · logs: ${appDetailStore.appDetailLogs().length}`, details: appDetails(app) };
	}
	if (view === "linkedMRs") return { title: "Linked MRs", context: `${issueStore.linkedMRs().length} items`, detail: headerText(issueStore.selectedIssue()?.title) };
	if (view === "referencedIssues") return { title: "Referenced issues", context: `${issueStore.referencedIssues().length} items`, detail: headerText(issueStore.selectedIssue()?.title) };
	if (view === "mrLinkedIssues") return { title: "MR linked issues", context: `${mrStore.mrLinkedIssues().length} items`, detail: headerText(mrStore.selectedMR()?.title) };
	if (view === "references") return { title: "References", context: `${issueStore.references().length} items`, detail: headerText(issueStore.selectedIssue()?.title) };
	if (view === "agentView") return { title: "AI agent", context: "sessions", detail: "launch or resume pi" };
	if (view === "sshPicker") return { title: "SSH hosts", context: "connect", detail: "select host" };
	if (view === "issueScopePicker") return { title: "Issue scope", context: "select scope" };
	return { title: getTabName(appStore.activeTab()), detail: headerText(`${selectedApp?.displayName ?? "No selection"}${branch}`), right: live };
}

export function getHeaderSubtitle(deps: HeaderSubtitleDeps): string {
	const {
		appStore,
		issueStore,
		mrStore,
		appDetailStore,
		helpActions,
		getSelectedApp,
	} = deps;

	if (appStore.viewMode() === "help") {
		const helpData = helpActions.getHelpContent();
		return `Help: ${helpData.title}`;
	}
	if (appStore.viewMode() === "providers") {
		return "Providers";
	}
	if (appStore.viewMode() === "jobs") {
		const app = getSelectedApp();
		return `Pipeline Jobs: ${app?.displayName || "Unknown"} (#${mrStore.currentPipelineId() || "N/A"})`;
	}
	if (appStore.viewMode() === "issues") {
		const app = appStore.filteredApps()[appStore.selectedIndex()];
		return `Issues: ${app?.displayName || "Unknown"} (${issueStore.issueScope()})`;
	}
	if (appStore.viewMode() === "issueDetail") {
		const issue = issueStore.selectedIssue();
		return issue ? `Issue #${issue.iid}: ${issue.title}` : "Issue Detail";
	}
	if (appStore.viewMode() === "issueScopePicker") {
		return "Select Issue Scope";
	}
	if (appStore.viewMode() === "mergeRequestDetail") {
		const mr = mrStore.selectedMR();
		return mr ? `MR !${mr.iid}: ${mr.title}` : "Merge Request Detail";
	}
	if (appStore.viewMode() === "mergeRequests") {
		const app = appStore.filteredApps()[appStore.selectedIndex()];
		return `Merge Request: ${app?.displayName || "Unknown"} (${app?.branch || "unknown"})`;
	}
	if (appStore.viewMode() === "appDetail") {
		const app = appDetailStore.appDetailApp();
		return `Details: ${app?.displayName || "Unknown"}`;
	}
	// Show active tab name in table view
	return getTabName(appStore.activeTab());
}
