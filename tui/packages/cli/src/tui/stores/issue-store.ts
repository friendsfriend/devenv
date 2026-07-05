import { createMemo, createSignal } from 'solid-js';
import type {
	Issue,
	IssueComment,
	IssueScope,
	ChangeRequest,
} from '@devenv/types';

export type ReferenceItem =
	| { type: "cr"; data: ChangeRequest }
	| { type: "issue"; data: Issue };

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

	// State filter: "open", "closed", "all"
	const [issueState, setIssueState] = createSignal<string>("open");

	// Detail state
	const [issueDetailLoading, setIssueDetailLoading] = createSignal(false);
	const [issueDetailError, setIssueDetailError] = createSignal("");
	let issueDetailScrollBoxRef: import("@opentui/core").ScrollBoxRenderable | undefined;

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

	// Linked CRs
	const [linkedChangeRequests, setLinkedCRs] = createSignal<ChangeRequest[]>([]);
	const [linkedChangeRequestsLoading, setLinkedCRsLoading] = createSignal(false);
	const [linkedChangeRequestsError, setLinkedCRsError] = createSignal("");
	const [selectedLinkedCRIndex, setSelectedLinkedCRIndex] = createSignal(0);

	// Unified References — merged list of referenced issues + linked CRs
	const [references, setReferences] = createSignal<ReferenceItem[]>([]);
	const [selectedReferenceIndex, setSelectedReferenceIndex] = createSignal(0);

	// Referenced Issues
	const [referencedIssues, setReferencedIssues] = createSignal<Issue[]>([]);
	const [referencedIssuesLoading, setReferencedIssuesLoading] =
		createSignal(false);
	const [referencedIssuesError, setReferencedIssuesError] = createSignal("");
	const [selectedReferencedIssueIndex, setSelectedReferencedIssueIndex] =
		createSignal(0);

	// Timeline view state
	const [selectedTimelineIndex, setSelectedTimelineIndex] = createSignal(0);

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
		issueState,
		setIssueState,
		issueDetailLoading,
		setIssueDetailLoading,
		issueDetailError,
		setIssueDetailError,
		get issueDetailScrollBoxRef() {
			return issueDetailScrollBoxRef;
		},
		set issueDetailScrollBoxRef(value: import("@opentui/core").ScrollBoxRenderable | undefined) {
			issueDetailScrollBoxRef = value;
		},
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

		// Timeline
		selectedTimelineIndex,
		setSelectedTimelineIndex,

		// Linked CRs
		linkedChangeRequests,
		setLinkedCRs,
		linkedChangeRequestsLoading,
		setLinkedCRsLoading,
		linkedChangeRequestsError,
		setLinkedCRsError,
		selectedLinkedCRIndex,
		setSelectedLinkedCRIndex,

		// Referenced Issues
		referencedIssues,
		setReferencedIssues,
		referencedIssuesLoading,
		setReferencedIssuesLoading,
		referencedIssuesError,
		setReferencedIssuesError,
		selectedReferencedIssueIndex,
		setSelectedReferencedIssueIndex,

		// Unified References
		references,
		setReferences,
		selectedReferenceIndex,
		setSelectedReferenceIndex,
	};
}

export type IssueStore = ReturnType<typeof createIssueStore>;
