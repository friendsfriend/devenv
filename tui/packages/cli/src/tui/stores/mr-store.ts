import { createMemo, createSignal } from "solid-js";
import type {
	Discussion,
	Issue,
	Job,
	MergeRequest,
	MRChange,
	TestCase,
	TestSummary,
} from "@devenv/types";

export function createMrStore() {
	const [mergeRequests, setMergeRequests] = createSignal<MergeRequest[]>([]);
	const [mrLoading, setMrLoading] = createSignal(false);
	const [mrError, setMrError] = createSignal("");

	// Pagination state
	const [currentPage, setCurrentPage] = createSignal(1);
	const [totalPages, setTotalPages] = createSignal(0);
	const [totalCount, setTotalCount] = createSignal(0);
	const [perPage, setPerPage] = createSignal(50);
	// Active server-side search term (set when user presses Enter in search mode)
	const [searchTerm, setSearchTerm] = createSignal("");
	const [selectedMR, setSelectedMR] = createSignal<MergeRequest | null>(null);
	const [selectedMRIndex, setSelectedMRIndex] = createSignal(0);
	const [mrChanges, setMrChanges] = createSignal<MRChange[]>([]);
	const [mrChangesLoading, setMrChangesLoading] = createSignal(false);
	const [mrChangesError, setMrChangesError] = createSignal("");
	const [mrTestSummary, setMrTestSummary] = createSignal<TestSummary | null>(
		null,
	);
	const [mrTestLoading, setMrTestLoading] = createSignal(false);
	const [mrTestError, setMrTestError] = createSignal("");
	const [mrJobsForDetail, setMrJobsForDetail] = createSignal<Job[]>([]);
	const [mrJobsForDetailLoading, setMrJobsForDetailLoading] =
		createSignal(false);
	const [mrJobsForDetailError, setMrJobsForDetailError] = createSignal("");
	const [mrLinkedIssues, setMrLinkedIssues] = createSignal<Issue[]>([]);
	const [mrLinkedIssuesLoading, setMrLinkedIssuesLoading] = createSignal(false);
	const [mrLinkedIssuesError, setMrLinkedIssuesError] = createSignal("");
	const [selectedMrLinkedIssueIndex, setSelectedMrLinkedIssueIndex] =
		createSignal(0);
	const [mrDiscussions, setMrDiscussions] = createSignal<Discussion[]>([]);
	const [mrDiscussionsLoading, setMrDiscussionsLoading] = createSignal(false);
	const [mrDiscussionsError, setMrDiscussionsError] = createSignal("");
	const [jobs, setJobs] = createSignal<Job[]>([]);
	const [jobsLoading, setJobsLoading] = createSignal(false);
	const [jobsError, setJobsError] = createSignal("");
	const [currentPipelineId, setCurrentPipelineId] = createSignal<number | null>(
		null,
	);
	const [selectedJobStageIndex, setSelectedJobStageIndex] = createSignal(0);
	const [selectedJobIndex, setSelectedJobIndex] = createSignal(0);
	const [selectedTestIndex, setSelectedTestIndex] = createSignal(0);
	const [showTestDetailModal, setShowTestDetailModal] = createSignal(false);
	const [testDetailCopyStatus, setTestDetailCopyStatus] = createSignal<
		string | null
	>(null);
	const [selectedChangedFileIndex, setSelectedChangedFileIndex] =
		createSignal(0);
	const [selectedDiscussionIndex, setSelectedDiscussionIndex] = createSignal(0);
	const [showDiffModal, setShowDiffModal] = createSignal(false);
	const [currentDiffFile, setCurrentDiffFile] = createSignal<MRChange | null>(
		null,
	);
	const [diffModalSelectedLine, setDiffModalSelectedLine] = createSignal(0);
	const [diffModalVisualMode, setDiffModalVisualMode] = createSignal(false);
	const [diffModalVisualStart, setDiffModalVisualStart] = createSignal(0);
	const [diffModalForceSplitView, setDiffModalForceSplitView] =
		createSignal<boolean>(false);
	const [showCommentModal, setShowCommentModal] = createSignal(false);
	const [commentText, setCommentText] = createSignal("");
	const [commentSubmitting, setCommentSubmitting] = createSignal(false);
	const [replyMode, setReplyMode] = createSignal<string | null>(null);
	const [replyText, setReplyText] = createSignal("");
	const [collapsedThreads, setCollapsedThreads] = createSignal<Set<string>>(
		new Set(),
	);
	const [discussionsShowOnlyComments, setDiscussionsShowOnlyComments] =
		createSignal(false);
	const [mrSearchMode, setMrSearchMode] = createSignal(false);
	const [mrSearchQuery, setMrSearchQuery] = createSignal("");
	const [changedFilesSearchMode, setChangedFilesSearchMode] =
		createSignal(false);
	const [changedFilesSearchQuery, setChangedFilesSearchQuery] =
		createSignal("");
	const [testSearchMode, setTestSearchMode] = createSignal(false);
	const [testSearchQuery, setTestSearchQuery] = createSignal("");
	const [jobsSearchMode, setJobsSearchMode] = createSignal(false);
	const [jobsSearchQuery, setJobsSearchQuery] = createSignal("");

	// MR AI review overlay state
	const [mrAiVisible, setMrAiVisible] = createSignal(false);
	const [mrAiLoading, setMrAiLoading] = createSignal(false);
	const [mrAiStreaming, setMrAiStreaming] = createSignal(false);
	const [mrAiSummary, setMrAiSummary] = createSignal<string | null>(null);
	const [mrAiError, setMrAiError] = createSignal<string | null>(null);
	const [mrAiFollowupText, setMrAiFollowupText] = createSignal("");
	const [mrAiPostingComments, setMrAiPostingComments] = createSignal(false);
	const [mrAiCommentsPosted, setMrAiCommentsPosted] = createSignal(false);

	let mrAiScrollBoxRef: import("@opentui/core").ScrollBoxRenderable | undefined;
	let mrAiAtBottom = true;
	let mrAiLastScrollTop = 0;

	const changedFilesFiltered = createMemo(() => {
		const q = changedFilesSearchQuery().toLowerCase();
		if (!q) return mrChanges();
		return mrChanges().filter((c) =>
			[c.new_path, c.old_path].some((v) => v && v.toLowerCase().includes(q)),
		);
	});

	const selectedTestForDetail = createMemo(() => {
		const testSuites = mrTestSummary()?.test_suites || [];
		const allTests: Array<TestCase & { suiteName: string }> = [];
		for (const suite of testSuites) {
			for (const testCase of suite.test_cases) {
				allTests.push({ ...testCase, suiteName: suite.name });
			}
		}
		allTests.sort((a, b) => {
			const aIsFailed = a.status === "failed" || a.status === "error";
			const bIsFailed = b.status === "failed" || b.status === "error";
			if (aIsFailed && !bIsFailed) return -1;
			if (!aIsFailed && bIsFailed) return 1;
			const classCompare = a.classname.localeCompare(b.classname);
			if (classCompare !== 0) return classCompare;
			return a.name.localeCompare(b.name);
		});
		return allTests[selectedTestIndex()] ?? null;
	});

	return {
		mergeRequests,
		setMergeRequests,
		mrLoading,
		setMrLoading,
		mrError,
		setMrError,
		// Pagination state
		currentPage,
		setCurrentPage,
		totalPages,
		setTotalPages,
		totalCount,
		setTotalCount,
		perPage,
		setPerPage,
		searchTerm,
		setSearchTerm,
		selectedMR,
		setSelectedMR,
		selectedMRIndex,
		setSelectedMRIndex,
		mrChanges,
		setMrChanges,
		mrChangesLoading,
		setMrChangesLoading,
		mrChangesError,
		setMrChangesError,
		mrTestSummary,
		setMrTestSummary,
		mrTestLoading,
		setMrTestLoading,
		mrTestError,
		setMrTestError,
		mrJobsForDetail,
		setMrJobsForDetail,
		mrJobsForDetailLoading,
		setMrJobsForDetailLoading,
		mrJobsForDetailError,
		setMrJobsForDetailError,
		mrLinkedIssues,
		setMrLinkedIssues,
		mrLinkedIssuesLoading,
		setMrLinkedIssuesLoading,
		mrLinkedIssuesError,
		setMrLinkedIssuesError,
		selectedMrLinkedIssueIndex,
		setSelectedMrLinkedIssueIndex,
		mrDiscussions,
		setMrDiscussions,
		mrDiscussionsLoading,
		setMrDiscussionsLoading,
		mrDiscussionsError,
		setMrDiscussionsError,
		jobs,
		setJobs,
		jobsLoading,
		setJobsLoading,
		jobsError,
		setJobsError,
		currentPipelineId,
		setCurrentPipelineId,
		selectedJobStageIndex,
		setSelectedJobStageIndex,
		selectedJobIndex,
		setSelectedJobIndex,
		selectedTestIndex,
		setSelectedTestIndex,
		showTestDetailModal,
		setShowTestDetailModal,
		testDetailCopyStatus,
		setTestDetailCopyStatus,
		selectedChangedFileIndex,
		setSelectedChangedFileIndex,
		selectedDiscussionIndex,
		setSelectedDiscussionIndex,
		showDiffModal,
		setShowDiffModal,
		currentDiffFile,
		setCurrentDiffFile,
		diffModalSelectedLine,
		setDiffModalSelectedLine,
		diffModalVisualMode,
		setDiffModalVisualMode,
		diffModalVisualStart,
		setDiffModalVisualStart,
		diffModalForceSplitView,
		setDiffModalForceSplitView,
		showCommentModal,
		setShowCommentModal,
		commentText,
		setCommentText,
		commentSubmitting,
		setCommentSubmitting,
		replyMode,
		setReplyMode,
		replyText,
		setReplyText,
		collapsedThreads,
		setCollapsedThreads,
		discussionsShowOnlyComments,
		setDiscussionsShowOnlyComments,
		mrSearchMode,
		setMrSearchMode,
		mrSearchQuery,
		setMrSearchQuery,
		changedFilesSearchMode,
		setChangedFilesSearchMode,
		changedFilesSearchQuery,
		setChangedFilesSearchQuery,
		testSearchMode,
		setTestSearchMode,
		testSearchQuery,
		setTestSearchQuery,
		jobsSearchMode,
		setJobsSearchMode,
		jobsSearchQuery,
		setJobsSearchQuery,
		changedFilesFiltered,
		selectedTestForDetail,

		// MR AI review overlay
		mrAiVisible,
		setMrAiVisible,
		mrAiLoading,
		setMrAiLoading,
		mrAiStreaming,
		setMrAiStreaming,
		mrAiSummary,
		setMrAiSummary,
		mrAiError,
		setMrAiError,
		mrAiFollowupText,
		setMrAiFollowupText,
		mrAiPostingComments,
		setMrAiPostingComments,
		mrAiCommentsPosted,
		setMrAiCommentsPosted,
		get mrAiScrollBoxRef() {
			return mrAiScrollBoxRef;
		},
		set mrAiScrollBoxRef(v:
			| import("@opentui/core").ScrollBoxRenderable
			| undefined) {
			mrAiScrollBoxRef = v;
		},
		get mrAiAtBottom() {
			return mrAiAtBottom;
		},
		set mrAiAtBottom(v: boolean) {
			mrAiAtBottom = v;
		},
		get mrAiLastScrollTop() {
			return mrAiLastScrollTop;
		},
		set mrAiLastScrollTop(v: number) {
			mrAiLastScrollTop = v;
		},
	};
}

export type MrStore = ReturnType<typeof createMrStore>;
