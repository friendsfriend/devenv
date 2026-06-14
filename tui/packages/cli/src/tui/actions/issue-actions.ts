import type { DevEnvClient } from "@devenv/core";
import type { AppStore } from "../stores/app-store";
import type { IssueStore } from "../stores/issue-store";
import type { IssueScope } from "@devenv/types";

const UNKNOWN_ERROR = "Unknown error";

function errMsg(e: unknown): string {
	return e instanceof Error ? e.message : UNKNOWN_ERROR;
}

export function createIssueActions(
	appStore: AppStore,
	issueStore: IssueStore,
	client: DevEnvClient,
	showError: (title: string, message: string) => void,
) {
	const getSelectedApp = () =>
		appStore.tableFilteredApps()[appStore.selectedIndex()];

	const loadAllIssues = async (
		scope: IssueScope = issueStore.issueScope(),
		page?: number,
		search?: string,
	) => {
		if (appStore.operationInProgressForApp()) {
			return showError(
				"Operation In Progress",
				"Another operation is already in progress. Please wait for it to complete.",
			);
		}
		const app = getSelectedApp();
		if (!app) return;

		const p = page ?? issueStore.currentPage();
		issueStore.setIssueLoading(true);
		issueStore.setIssueError("");
		issueStore.setSelectedIssueIndex(0);
		issueStore.setIssues([]);
		issueStore.setIssueScope(scope);
		appStore.setViewMode("issues");

		try {
			const result = await client.getIssues(
				app.ident,
				scope,
				app.sourceType,
				p,
				issueStore.perPage(),
				search,
			);
			issueStore.setIssues(result.items);
			// Derive totalPages from totalCount/perPage when server doesn't provide it.
			// When totalPages is -1 (cursor-based pagination, total unknown), keep -1.
			// The UI shows "Pg 1/?" for unknown totals and navigation is not blocked.
			let tp = result.totalPages;
			if (
				result.totalPages <= 0 &&
				result.totalCount > 0 &&
				result.perPage > 0
			) {
				tp = Math.ceil(result.totalCount / result.perPage);
			}
			issueStore.setTotalPages(tp);
			issueStore.setTotalCount(result.totalCount);
			issueStore.setCurrentPage(result.currentPage);
			issueStore.setPerPage(result.perPage);
		} catch (e) {
			issueStore.setIssueError(errMsg(e));
			issueStore.setIssues([]);
		} finally {
			issueStore.setIssueLoading(false);
		}
	};

	const showIssueDetail = async (
		issue: NonNullable<ReturnType<typeof issueStore.selectedIssue>>,
	) => {
		issueStore.setSelectedIssue(issue);
		issueStore.setIssueDetailLoading(true);
		issueStore.setIssueDetailError("");
		issueStore.setIssueCommentsLoading(true);
		issueStore.setIssueCommentsError("");
		issueStore.setIssueComments([]);
		appStore.setViewMode("issueDetail");

		const app = getSelectedApp();
		if (!app) {
			issueStore.setIssueDetailLoading(false);
			return;
		}

		try {
			const comments = await client.getIssueComments(
				app.ident,
				issue.iid,
				app.sourceType,
			);
			issueStore.setIssueComments(comments.items ?? []);
		} catch (e) {
			issueStore.setIssueCommentsError(errMsg(e));
		} finally {
			issueStore.setIssueDetailLoading(false);
			issueStore.setIssueCommentsLoading(false);
		}
	};

	const nextPage = async () => {
		const app = getSelectedApp();
		if (!app) return;
		const current = issueStore.currentPage();
		const total = issueStore.totalPages();
		if (total > 0 && current >= total) return;
		await loadAllIssues(
			issueStore.issueScope(),
			current + 1,
			issueStore.issueSearchTerm(),
		);
	};

	const prevPage = async () => {
		const app = getSelectedApp();
		if (!app) return;
		const current = issueStore.currentPage();
		if (current <= 1) return;
		await loadAllIssues(
			issueStore.issueScope(),
			current - 1,
			issueStore.issueSearchTerm(),
		);
	};

	const backToIssueList = () => {
		issueStore.setSelectedIssue(null);
		issueStore.setIssueSearchMode(false);
		issueStore.setIssueSearchQuery("");
		appStore.setViewMode("issues");
	};

	const selectScope = (scope: IssueScope) => {
		void loadAllIssues(scope);
	};

	return {
		loadAllIssues,
		showIssueDetail,
		nextPage,
		prevPage,
		backToIssueList,
		selectScope,
	};
}

export type IssueActions = ReturnType<typeof createIssueActions>;
