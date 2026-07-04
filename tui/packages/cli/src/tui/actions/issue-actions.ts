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

	const getSelectedAppSafe = (): {
		app: NonNullable<ReturnType<typeof getSelectedApp>>;
		sourceType: string | undefined;
	} | null => {
		const app = getSelectedApp();
		if (!app) return null;
		return { app, sourceType: app.sourceType };
	};

	const loadAllIssues = async (
		scope: IssueScope = issueStore.issueScope(),
		page?: number,
		search?: string,
		state?: string,
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
		const s = state ?? issueStore.issueState();
		issueStore.setIssueState(s);
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
				s,
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
		issueStore.issueDetailScrollBoxRef = undefined;
		issueStore.setIssueDetailLoading(true);
		issueStore.setIssueDetailError("");
		issueStore.setIssueCommentsLoading(true);
		issueStore.setIssueCommentsError("");
		issueStore.setIssueComments([]);
		issueStore.setLinkedCRs([]);
		issueStore.setLinkedCRsError("");
		issueStore.setLinkedCRsLoading(true);
		issueStore.setReferencedIssues([]);
		issueStore.setReferencedIssuesError("");
		issueStore.setReferencedIssuesLoading(true);
		issueStore.setReferences([]);
		appStore.setViewMode("issueDetail");

		const app = getSelectedApp();
		if (!app) {
			issueStore.setIssueDetailLoading(false);
			return;
		}

		// Fetch comments, linked CRs, and referenced issues independently
		// so one failure doesn't block the others.
		const [commentsResult, linkedChangeRequestsResult, referencedIssuesResult] =
			await Promise.allSettled([
				client.getIssueComments(app.ident, issue.iid, app.sourceType),
				client.getIssueLinkedCRs(app.ident, issue.iid, app.sourceType),
				client.getIssueReferencedIssues(app.ident, issue.iid, app.sourceType),
			]);

		const comments =
			commentsResult.status === "fulfilled" ? commentsResult.value : null;
		const linkedChangeRequests =
			linkedChangeRequestsResult.status === "fulfilled" ? linkedChangeRequestsResult.value : null;
		const referencedIssues =
			referencedIssuesResult.status === "fulfilled"
				? referencedIssuesResult.value
				: null;

		issueStore.setIssueComments(comments?.items ?? []);
		if (linkedChangeRequestsResult.status === "rejected") {
			issueStore.setLinkedCRsError(errMsg(linkedChangeRequestsResult.reason));
		}
		issueStore.setLinkedCRs(linkedChangeRequests ?? []);
		if (referencedIssuesResult.status === "rejected") {
			issueStore.setReferencedIssuesError(
				errMsg(referencedIssuesResult.reason),
			);
		}
		issueStore.setReferencedIssues(referencedIssues ?? []);

		// Merge into unified references list
		const refs: import("../stores/issue-store").ReferenceItem[] = [
			...(linkedChangeRequests ?? []).map((cr) => ({
				type: "cr" as const,
				data: cr,
			})),
			...(referencedIssues ?? []).map((iss) => ({
				type: "issue" as const,
				data: iss,
			})),
		];
		issueStore.setReferences(refs);

		// Also handle comments errors independently
		if (commentsResult.status === "rejected") {
			issueStore.setIssueCommentsError(errMsg(commentsResult.reason));
		}

		issueStore.setIssueDetailLoading(false);
		issueStore.setIssueCommentsLoading(false);
		issueStore.setLinkedCRsLoading(false);
		issueStore.setReferencedIssuesLoading(false);
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
		issueStore.issueDetailScrollBoxRef = undefined;
		issueStore.setSelectedIssue(null);
		issueStore.setIssueSearchMode(false);
		issueStore.setIssueSearchQuery("");
		appStore.setViewMode("issues");
	};

	const selectScope = (scope: IssueScope) => {
		void loadAllIssues(scope);
	};

	// ─── Mutation Actions ───────────────────────────────────────────────────

	const closeIssue = async (number: number, reason?: string) => {
		const ctx = getSelectedAppSafe();
		if (!ctx) return;

		issueStore.setIssueSubmitting(true);
		issueStore.setIssueSubmitError("");

		try {
			const issue = await client.closeIssue(
				ctx.app.ident,
				number,
				ctx.sourceType,
				reason,
			);
			issueStore.setIssueSubmitting(false);
			issueStore.setSelectedIssue(issue);
			void loadAllIssues(issueStore.issueScope());
		} catch (e) {
			issueStore.setIssueSubmitError(errMsg(e));
			issueStore.setIssueSubmitting(false);
		}
	};

	const reopenIssue = async (number: number) => {
		const ctx = getSelectedAppSafe();
		if (!ctx) return;

		issueStore.setIssueSubmitting(true);
		issueStore.setIssueSubmitError("");

		try {
			const issue = await client.reopenIssue(
				ctx.app.ident,
				number,
				ctx.sourceType,
			);
			issueStore.setIssueSubmitting(false);
			issueStore.setSelectedIssue(issue);
			void loadAllIssues(issueStore.issueScope());
		} catch (e) {
			issueStore.setIssueSubmitError(errMsg(e));
			issueStore.setIssueSubmitting(false);
		}
	};

	const setIssueLabels = async (number: number, labels: string[]) => {
		const ctx = getSelectedAppSafe();
		if (!ctx) return;

		issueStore.setIssueSubmitting(true);
		issueStore.setIssueSubmitError("");

		try {
			const issue = await client.setIssueLabels(
				ctx.app.ident,
				number,
				ctx.sourceType,
				labels,
			);
			issueStore.setIssueSubmitting(false);
			issueStore.setShowLabelPicker(false);
			issueStore.setSelectedIssue(issue);
			void loadAllIssues(issueStore.issueScope());
		} catch (e) {
			issueStore.setIssueSubmitError(errMsg(e));
			issueStore.setIssueSubmitting(false);
		}
	};

	const setIssueAssignee = async (number: number, assignee: string) => {
		const ctx = getSelectedAppSafe();
		if (!ctx) return;

		issueStore.setIssueSubmitting(true);
		issueStore.setIssueSubmitError("");

		try {
			const issue = await client.setIssueAssignee(
				ctx.app.ident,
				number,
				ctx.sourceType,
				assignee,
			);
			issueStore.setIssueSubmitting(false);
			issueStore.setShowAssigneePicker(false);
			issueStore.setSelectedIssue(issue);
			void loadAllIssues(issueStore.issueScope());
		} catch (e) {
			issueStore.setIssueSubmitError(errMsg(e));
			issueStore.setIssueSubmitting(false);
		}
	};

	const removeIssueAssignee = async (number: number) => {
		const ctx = getSelectedAppSafe();
		if (!ctx) return;

		issueStore.setIssueSubmitting(true);
		issueStore.setIssueSubmitError("");

		try {
			const issue = await client.removeIssueAssignee(
				ctx.app.ident,
				number,
				ctx.sourceType,
			);
			issueStore.setIssueSubmitting(false);
			issueStore.setShowAssigneePicker(false);
			issueStore.setSelectedIssue(issue);
			void loadAllIssues(issueStore.issueScope());
		} catch (e) {
			issueStore.setIssueSubmitError(errMsg(e));
			issueStore.setIssueSubmitting(false);
		}
	};

	const fetchRepoLabels = async () => {
		const ctx = getSelectedAppSafe();
		if (!ctx) return;

		try {
			const labels = await client.getRepoLabels(ctx.app.ident, ctx.sourceType);
			issueStore.setAvailableLabels(labels);
		} catch (e) {
			showError("Failed to fetch labels", errMsg(e));
		}
	};

	const fetchRepoCollaborators = async () => {
		const ctx = getSelectedAppSafe();
		if (!ctx) return;

		try {
			const collaborators = await client.getRepoCollaborators(
				ctx.app.ident,
				ctx.sourceType,
			);
			issueStore.setAvailableCollaborators(collaborators);
		} catch (e) {
			showError("Failed to fetch collaborators", errMsg(e));
		}
	};

	// ─── Comment Actions ──────────────────────────────────────────────────

	const addComment = async () => {
		const issue = issueStore.selectedIssue();
		const ctx = getSelectedAppSafe();
		if (!issue || !ctx) return;

		const body = issueStore.commentText().trim();
		if (!body) return;

		issueStore.setIssueSubmitting(true);
		issueStore.setIssueSubmitError("");

		try {
			await client.addIssueComment(
				ctx.app.ident,
				issue.iid,
				ctx.sourceType,
				body,
			);
			issueStore.setShowCommentModal(false);
			issueStore.setCommentText("");
			issueStore.setIssueSubmitting(false);

			// Refresh comments
			try {
				const comments = await client.getIssueComments(
					ctx.app.ident,
					issue.iid,
					ctx.sourceType,
				);
				issueStore.setIssueComments(comments.items ?? []);
			} catch {
				// Comments refresh is best-effort
			}
		} catch (e) {
			issueStore.setIssueSubmitError(errMsg(e));
			issueStore.setIssueSubmitting(false);
		}
	};

	const openCommentModal = () => {
		issueStore.setCommentText("");
		issueStore.setIssueSubmitError("");
		issueStore.setShowCommentModal(true);
	};

	// ─── Modal Actions ──────────────────────────────────────────────────────

	const openLabelPicker = () => {
		issueStore.setIssueSubmitError("");
		issueStore.setLabelPickerIndex(0);
		void fetchRepoLabels();
		issueStore.setShowLabelPicker(true);
	};

	const openAssigneePicker = () => {
		issueStore.setIssueSubmitError("");
		issueStore.setAssigneePickerIndex(0);
		void fetchRepoCollaborators();
		issueStore.setShowAssigneePicker(true);
	};

	// ─── Linked CRs Actions ────────────────────────────────────────────────

	const loadIssueLinkedCRs = async (issueIID: number) => {
		const app = getSelectedApp();
		if (!app) return;

		issueStore.setLinkedCRsLoading(true);
		issueStore.setLinkedCRsError("");
		issueStore.setLinkedCRs([]);

		try {
			const crs = await client.getIssueLinkedCRs(
				app.ident,
				issueIID,
				app.sourceType,
			);
			issueStore.setLinkedCRs(crs ?? []);
		} catch (e) {
			issueStore.setLinkedCRsError(errMsg(e));
		} finally {
			issueStore.setLinkedCRsLoading(false);
		}
	};

	const showLinkedCRsSubView = () => {
		appStore.setViewMode("linkedChangeRequests");
	};

	const backToIssueDetailFromLinkedCRs = () => {
		issueStore.setSelectedLinkedCRIndex(0);
		appStore.setViewMode("issueDetail");
	};

	const showReferencedIssuesSubView = () => {
		appStore.setViewMode("referencedIssues");
	};

	const showReferencesSubView = () => {
		appStore.setViewMode("references");
	};

	const backToIssueDetailFromReferences = () => {
		issueStore.setSelectedReferencedIssueIndex(0);
		issueStore.setSelectedReferenceIndex(0);
		appStore.setViewMode("issueDetail");
	};

	return {
		loadAllIssues,
		showIssueDetail,
		nextPage,
		prevPage,
		backToIssueList,
		selectScope,
		closeIssue,
		reopenIssue,
		setIssueLabels,
		setIssueAssignee,
		removeIssueAssignee,
		fetchRepoLabels,
		fetchRepoCollaborators,
		addComment,
		openCommentModal,
		openLabelPicker,
		openAssigneePicker,

		// Linked CRs
		loadIssueLinkedCRs,
		showLinkedCRsSubView,
		backToIssueDetailFromLinkedCRs,

		// Referenced Issues
		showReferencedIssuesSubView,
		showReferencesSubView,
		backToIssueDetailFromReferences,
	};
}

export type IssueActions = ReturnType<typeof createIssueActions>;
