import { createMemo, createSignal } from "solid-js";
import type { Issue, IssueComment, IssueScope } from "@devenv/types";

export function createIssueStore() {
	const [issues, setIssues] = createSignal<Issue[]>([]);
	const [issueLoading, setIssueLoading] = createSignal(false);
	const [issueError, setIssueError] = createSignal("");

	// Pagination state
	const [currentPage, setCurrentPage] = createSignal(1);
	const [totalPages, setTotalPages] = createSignal(0);
	const [totalCount, setTotalCount] = createSignal(0);
	const [perPage, setPerPage] = createSignal(50);

	// Selection and search
	const [selectedIssue, setSelectedIssue] = createSignal<Issue | null>(null);
	const [selectedIssueIndex, setSelectedIssueIndex] = createSignal(0);
	const [issueSearchMode, setIssueSearchMode] = createSignal(false);
	const [issueSearchQuery, setIssueSearchQuery] = createSignal("");
	const [issueSearchTerm, setIssueSearchTerm] = createSignal("");

	// Scope
	const [issueScope, setIssueScope] = createSignal<IssueScope>("all");
	const [issueScopePickerIndex, setIssueScopePickerIndex] = createSignal(0);

	// Detail state
	const [issueDetailLoading, setIssueDetailLoading] = createSignal(false);
	const [issueDetailError, setIssueDetailError] = createSignal("");

	// Comments
	const [issueComments, setIssueComments] = createSignal<IssueComment[]>([]);
	const [issueCommentsLoading, setIssueCommentsLoading] = createSignal(false);
	const [issueCommentsError, setIssueCommentsError] = createSignal("");

	// ─── Mutation state ─────────────────────────────────────────────────────
	const [issueSubmitting, setIssueSubmitting] = createSignal(false);
	const [issueSubmitError, setIssueSubmitError] = createSignal("");
	const [availableLabels, setAvailableLabels] = createSignal<string[]>([]);
	const [availableCollaborators, setAvailableCollaborators] = createSignal<
		string[]
	>([]);

	// Comment modal
	const [showCommentModal, setShowCommentModal] = createSignal(false);
	const [commentText, setCommentText] = createSignal("");

	// Modal visibility
	const [showLabelPicker, setShowLabelPicker] = createSignal(false);
	const [labelPickerIndex, setLabelPickerIndex] = createSignal(0);
	const [assigneePickerIndex, setAssigneePickerIndex] = createSignal(0);
	const [showCloseReasonModal, setShowCloseReasonModal] = createSignal(false);
	const [closeReasonIndex, setCloseReasonIndex] = createSignal(0);
	const [showAssigneePicker, setShowAssigneePicker] = createSignal(false);

	const issuesFiltered = createMemo(() => {
		const q = issueSearchQuery().toLowerCase();
		if (!q) return issues();
		return issues().filter(
			(i) => i.title.toLowerCase().includes(q) || i.iid.toString().includes(q),
		);
	});

	return {
		issues,
		setIssues,
		issueLoading,
		setIssueLoading,
		issueError,
		setIssueError,
		currentPage,
		setCurrentPage,
		totalPages,
		setTotalPages,
		totalCount,
		setTotalCount,
		perPage,
		setPerPage,
		selectedIssue,
		setSelectedIssue,
		selectedIssueIndex,
		setSelectedIssueIndex,
		issueSearchMode,
		setIssueSearchMode,
		issueSearchQuery,
		setIssueSearchQuery,
		issueSearchTerm,
		setIssueSearchTerm,
		issueScope,
		setIssueScope,
		issueScopePickerIndex,
		setIssueScopePickerIndex,
		issueDetailLoading,
		setIssueDetailLoading,
		issueDetailError,
		setIssueDetailError,
		issueComments,
		setIssueComments,
		issueCommentsLoading,
		setIssueCommentsLoading,
		issueCommentsError,
		setIssueCommentsError,
		issueSubmitting,
		setIssueSubmitting,
		issueSubmitError,
		setIssueSubmitError,
		availableLabels,
		setAvailableLabels,
		availableCollaborators,
		setAvailableCollaborators,
		showCommentModal,
		setShowCommentModal,
		commentText,
		setCommentText,
		showLabelPicker,
		setShowLabelPicker,
		labelPickerIndex,
		setLabelPickerIndex,
		assigneePickerIndex,
		setAssigneePickerIndex,
		showCloseReasonModal,
		setShowCloseReasonModal,
		closeReasonIndex,
		setCloseReasonIndex,
		showAssigneePicker,
		setShowAssigneePicker,
		issuesFiltered,
	};
}

export type IssueStore = ReturnType<typeof createIssueStore>;
