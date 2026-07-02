import { getLogger } from "@devenv/core";
import type { DevEnvClient } from "@devenv/core";
import type { AppStore } from "../stores/app-store";
import type { MrStore } from "../stores/mr-store";
import type { UiStore } from "../stores/ui-store";

const AI_ATTRIBUTION_HEADER = `> 🤖 *This review was generated automatically by AI. Please verify all suggestions before acting on them.*

---

`;

const UNKNOWN_ERROR = "Unknown error";

/** Extract error message safely. */
function errMsg(e: unknown): string {
	return e instanceof Error ? e.message : UNKNOWN_ERROR;
}

export function createMrActions(
	appStore: AppStore,
	mrStore: MrStore,
	uiStore: UiStore,
	client: DevEnvClient,
	showError: (title: string, message: string) => void,
) {
	const getSelectedApp = () =>
		appStore.tableFilteredApps()[appStore.selectedIndex()];

	const loadMergeRequestForCurrentBranch = async () => {
		if (appStore.operationInProgressForApp())
			return showError(
				"Operation In Progress",
				"Another operation is already in progress. Please wait for it to complete.",
			);
		const app = getSelectedApp();
		if (!app) return;
		mrStore.setMrLoading(true);
		mrStore.setMrError("");
		mrStore.setSelectedMRIndex(0);
		mrStore.setMergeRequests([]);
		mrStore.setCurrentPage(1);
		mrStore.setTotalPages(0);
		mrStore.setTotalCount(0);
		appStore.setViewMode("mergeRequests");
		try {
			const result = await client.getMergeRequests(
				app.ident,
				"opened",
				"current",
				app.sourceType,
				1,
				mrStore.perPage(),
			);
			if (result.items.length > 0) {
				mrStore.setMergeRequests(result.items);
				mrStore.setTotalPages(result.totalPages);
				mrStore.setTotalCount(result.totalCount);
				mrStore.setCurrentPage(result.currentPage);
				mrStore.setPerPage(result.perPage);
				showMRDetail(result.items[0]);
			} else {
				const allResult = await client.getMergeRequests(
					app.ident,
					"opened",
					"all",
					app.sourceType,
					1,
					mrStore.perPage(),
				);
				mrStore.setMergeRequests(allResult.items);
				mrStore.setTotalPages(allResult.totalPages);
				mrStore.setTotalCount(allResult.totalCount);
				mrStore.setCurrentPage(allResult.currentPage);
				mrStore.setPerPage(allResult.perPage);
			}
		} catch {
			try {
				const allResult = await client.getMergeRequests(
					app.ident,
					"opened",
					"all",
					app.sourceType,
					1,
					mrStore.perPage(),
				);
				mrStore.setMergeRequests(allResult.items);
				mrStore.setTotalPages(allResult.totalPages);
				mrStore.setTotalCount(allResult.totalCount);
				mrStore.setCurrentPage(allResult.currentPage);
				mrStore.setPerPage(allResult.perPage);
			} catch {
				mrStore.setMergeRequests([]);
			}
		} finally {
			mrStore.setMrLoading(false);
		}
	};

	const loadAllMergeRequests = async (page?: number, search?: string, state?: string) => {
		if (appStore.operationInProgressForApp())
			return showError(
				"Operation In Progress",
				"Another operation is already in progress. Please wait for it to complete.",
			);
		const app = getSelectedApp();
		if (!app) return;
		const p = page ?? mrStore.currentPage();
		const s = state ?? mrStore.mrState();
		mrStore.setMrState(s);
		mrStore.setMrLoading(true);
		mrStore.setMrError("");
		mrStore.setSelectedMRIndex(0);
		appStore.setViewMode("mergeRequests");
		try {
			const result = await client.getMergeRequests(
				app.ident,
				s,
				"all",
				app.sourceType,
				p,
				mrStore.perPage(),
				search,
			);
			mrStore.setMergeRequests(result.items);
			mrStore.setTotalPages(result.totalPages);
			mrStore.setTotalCount(result.totalCount);
			mrStore.setCurrentPage(result.currentPage);
			mrStore.setPerPage(result.perPage);
		} catch (e) {
			mrStore.setMrError(errMsg(e));
			mrStore.setMergeRequests([]);
		} finally {
			mrStore.setMrLoading(false);
		}
	};

	const showMRDetail = (
		mr: NonNullable<ReturnType<typeof mrStore.selectedMR>>,
	) => {
		mrStore.setSelectedMR(mr);
		mrStore.setMrChangesLoading(true);
		mrStore.setMrTestLoading(!!mr.head_pipeline);
		mrStore.setMrJobsForDetailLoading(!!mr.head_pipeline);
		mrStore.setMrDiscussionsLoading(true);
		mrStore.setMrChanges([]);
		mrStore.setMrChangesError("");
		mrStore.setMrTestSummary(null);
		mrStore.setMrTestError("");
		mrStore.setMrJobsForDetail([]);
		mrStore.setMrJobsForDetailError("");
		mrStore.setMrDiscussions([]);
		mrStore.setMrDiscussionsError("");
		appStore.setViewMode("mergeRequestDetail");
		void loadMRDetailData(mr);
	};

	const loadMRDetailData = async (
		mr: NonNullable<ReturnType<typeof mrStore.selectedMR>>,
	) => {
		const app = getSelectedApp();
		if (!app) return;
		const changesPromise = (async () => {
			try {
				mrStore.setMrChanges(
					await client.getMRChanges(app.ident, mr.iid, app.sourceType),
				);
			} catch (e) {
				mrStore.setMrChangesError(errMsg(e));
			} finally {
				mrStore.setMrChangesLoading(false);
			}
		})();
		const jobsPromise = (async () => {
			if (!mr.head_pipeline) return;
			try {
				mrStore.setMrJobsForDetail(
					await client.getPipelineJobs(
						app.ident,
						mr.head_pipeline.id,
						app.sourceType,
					),
				);
			} catch (e) {
				mrStore.setMrJobsForDetailError(errMsg(e));
			} finally {
				mrStore.setMrJobsForDetailLoading(false);
			}
		})();
		const testSummaryPromise = (async () => {
			if (!mr.head_pipeline) return;
			try {
				mrStore.setMrTestSummary(
					await client.getTestSummary(
						app.ident,
						mr.head_pipeline.id,
						app.sourceType,
					),
				);
			} catch (e) {
				mrStore.setMrTestError(errMsg(e));
			} finally {
				mrStore.setMrTestLoading(false);
			}
		})();
		const linkedIssuesPromise = (async () => {
			try {
				mrStore.setMrLinkedIssues(
					await client.getMRLinkedIssues(app.ident, mr.iid, app.sourceType),
				);
			} catch (e) {
				mrStore.setMrLinkedIssuesError(errMsg(e));
			} finally {
				mrStore.setMrLinkedIssuesLoading(false);
			}
		})();
		const discussionsPromise = (async () => {
			try {
				mrStore.setMrDiscussions(
					await client.getMRDiscussions(app.ident, mr.iid, app.sourceType),
				);
			} catch (e) {
				mrStore.setMrDiscussionsError(errMsg(e));
			} finally {
				mrStore.setMrDiscussionsLoading(false);
			}
		})();
		await Promise.all([
			changesPromise,
			jobsPromise,
			testSummaryPromise,
			discussionsPromise,
			linkedIssuesPromise,
		]);
	};

	const submitComment = async () => {
		const app = appStore.filteredApps()[appStore.selectedIndex()];
		const mr = mrStore.selectedMR();
		const comment = mrStore.commentText().trim();
		const diffFile = mrStore.currentDiffFile();
		if (!comment)
			return showError(
				"Empty Comment",
				"Please enter a comment before submitting",
			);
		if (!app || !mr || !diffFile)
			return showError(
				"Invalid State",
				"Missing required data for creating comment",
			);
		mrStore.setCommentSubmitting(true);
		try {
			const versions = await client.getMRVersions(app.ident, mr.iid);
			if (!versions.length)
				return showError("No Versions", "Could not fetch MR versions");
			const latest = versions[0];
			const position = {
				baseSHA: latest.base_commit_sha,
				headSHA: latest.head_commit_sha,
				startSHA: latest.start_commit_sha,
				positionType: "text",
				newPath: diffFile.new_path,
				oldPath: diffFile.old_path,
				newLine:
					diffFile.diff_lines?.[mrStore.diffModalSelectedLine()]?.new_line,
				oldLine:
					diffFile.diff_lines?.[mrStore.diffModalSelectedLine()]?.old_line,
			};
			await client.createMRComment(app.ident, mr.iid, comment, position);
			showError(
				"Comment Posted",
				"Your comment was successfully added to the merge request",
			);
			mrStore.setShowCommentModal(false);
			mrStore.setCommentText("");
			mrStore.setDiffModalVisualMode(false);
		} catch (e) {
			showError("Comment Failed", `Failed to create comment: ${errMsg(e)}`);
		} finally {
			mrStore.setCommentSubmitting(false);
		}
	};

	const replyToDiscussion = async (discussionID: string, body: string) => {
		const app = appStore.filteredApps()[appStore.selectedIndex()];
		const mr = mrStore.selectedMR();
		if (!app || !mr)
			return showError(
				"Invalid State",
				"Missing required data for replying to discussion",
			);
		if (!body.trim())
			return showError("Empty Reply", "Please enter a reply before submitting");
		try {
			await client.replyToDiscussion(app.ident, mr.iid, discussionID, body);
			mrStore.setMrDiscussions(
				await client.getMRDiscussions(app.ident, mr.iid, app.sourceType),
			);
			showError("Reply Posted", "Your reply was successfully added");
		} catch (e) {
			showError("Reply Failed", `Failed to post reply: ${errMsg(e)}`);
		}
	};

	const resolveDiscussion = async (
		discussionID: string,
		resolveAction: "resolve" | "unresolve",
	) => {
		const app = appStore.filteredApps()[appStore.selectedIndex()];
		const mr = mrStore.selectedMR();
		if (!app || !mr)
			return showError(
				"Invalid State",
				"Missing required data for resolving discussion",
			);
		try {
			await client.resolveDiscussion(
				app.ident,
				mr.iid,
				discussionID,
				resolveAction,
			);
			mrStore.setMrDiscussions(
				await client.getMRDiscussions(app.ident, mr.iid, app.sourceType),
			);
		} catch (e) {
			showError("Resolve Failed", `Failed to resolve discussion: ${errMsg(e)}`);
		}
	};

	const nextPage = async () => {
		const app = getSelectedApp();
		if (!app) return;
		const current = mrStore.currentPage();
		const total = mrStore.totalPages();
		if (total > 0 && current >= total) return;
		await loadAllMergeRequests(current + 1, mrStore.searchTerm());
	};

	const prevPage = async () => {
		const app = getSelectedApp();
		if (!app) return;
		const current = mrStore.currentPage();
		if (current <= 1) return;
		await loadAllMergeRequests(current - 1, mrStore.searchTerm());
	};

	const backToMRList = () => {
		mrStore.setSelectedMR(null);
		mrStore.setMrSearchMode(false);
		mrStore.setMrSearchQuery("");
		appStore.setViewMode("mergeRequests");
	};

	const toggleMRApproval = async () => {
		const app = getSelectedApp();
		const mr = mrStore.selectedMR();
		if (!app || !mr) return;
		try {
			uiStore.setLoadingModalMessage("Toggling approval");
			uiStore.setShowLoadingModal(true);
			await client.toggleMRApproval(app.ident, mr.iid, app.sourceType);
			const fetched = await client.getMergeRequests(
				app.ident,
				mrStore.mrState(),
				"all",
				app.sourceType,
				mrStore.currentPage(),
				mrStore.perPage(),
			);
			const updated = fetched.items.find((m) => m.iid === mr.iid);
			if (updated) {
				mrStore.setSelectedMR(updated);
				mrStore.setMergeRequests((mrs) =>
					mrs.map((m) => (m.iid === updated.iid ? updated : m)),
				);
			}
			await loadMRDetailData(updated || mr);
		} catch (e) {
			showError("Approval Toggle Failed", errMsg(e));
		} finally {
			uiStore.setShowLoadingModal(false);
		}
	};

	const rebaseMR = async () => {
		const app = getSelectedApp();
		const mr = mrStore.selectedMR();
		if (!app || !mr) return;
		try {
			uiStore.setLoadingModalMessage("Rebasing merge request");
			uiStore.setShowLoadingModal(true);
			await client.rebaseMR(app.ident, mr.iid);
			await new Promise((resolve) => setTimeout(resolve, 1000));
			const fetched = await client.getMergeRequests(
				app.ident,
				mrStore.mrState(),
				"all",
				app.sourceType,
				mrStore.currentPage(),
				mrStore.perPage(),
			);
			const updated = fetched.items.find((m) => m.iid === mr.iid);
			if (updated) {
				mrStore.setSelectedMR(updated);
				mrStore.setMergeRequests((mrs) =>
					mrs.map((m) => (m.iid === updated.iid ? updated : m)),
				);
				if (updated.merge_error)
					showError("Rebase Failed", updated.merge_error);
				else if (updated.rebase_in_progress)
					showError(
						"Rebase In Progress",
						"Rebase operation has been queued and is currently in progress. Please wait for it to complete.",
					);
				else
					showError(
						"Rebase Successful",
						"Merge request has been rebased successfully.",
					);
			}
			await loadMRDetailData(updated || mr);
		} catch (e) {
			showError("Rebase Failed", errMsg(e));
			getLogger().write(
				"ERROR",
				`Failed to rebase MR: ${e instanceof Error ? e.message : String(e)}`,
			);
		} finally {
			uiStore.setShowLoadingModal(false);
		}
	};

	const getDiscussionAtCurrentLine = () => {
		const diffFile = mrStore.currentDiffFile();
		const lineIndex = mrStore.diffModalSelectedLine();
		if (!diffFile || !diffFile.diff_lines || !mrStore.mrDiscussions())
			return null;
		const diffLine = diffFile.diff_lines[lineIndex];
		if (!diffLine) return null;
		for (const discussion of mrStore.mrDiscussions()) {
			const position = discussion.position || discussion.notes[0]?.position;
			if (!position) continue;
			const matchesFile =
				position.new_path === diffFile.new_path ||
				position.old_path === diffFile.old_path;
			if (!matchesFile) continue;
			if (diffLine.type === "new" && position.new_line === diffLine.new_line)
				return discussion;
			if (diffLine.type === "old" && position.old_line === diffLine.old_line)
				return discussion;
			if (
				diffLine.type === "match" &&
				(position.new_line === diffLine.new_line ||
					position.old_line === diffLine.old_line)
			)
				return discussion;
		}
		return null;
	};

	const getLinesWithComments = (): number[] => {
		const diffFile = mrStore.currentDiffFile();
		if (!diffFile || !mrStore.mrDiscussions()) return [];
		const discussions = mrStore.mrDiscussions();
		const linesWithComments: number[] = [];
		const diffLines = diffFile.diff.split("\n");
		let selectableIndex = 0;
		let oldLineNum = 0;
		let newLineNum = 0;

		/** Check if a discussion has a comment at the given diff position. */
		const hasLineCommentFn = (
			discussion: (typeof discussions)[number],
			lt: "added" | "removed" | "context" | null,
			curOld: number | undefined,
			curNew: number | undefined,
		) => {
			const position = discussion.position || discussion.notes[0]?.position;
			if (!position) return false;
			const matchesFile =
				position.new_path === diffFile.new_path ||
				position.old_path === diffFile.old_path;
			if (!matchesFile) return false;
			const matchesNewLine =
				lt === "added" && curNew && position.new_line === curNew;
			const matchesOldLine =
				lt === "removed" && curOld && position.old_line === curOld;
			const matchesContext =
				lt === "context" &&
				(position.new_line === curNew || position.old_line === curOld);
			return matchesNewLine || matchesOldLine || matchesContext;
		};

		for (const line of diffLines) {
			if (line.startsWith("---") || line.startsWith("+++")) continue;
			if (line.startsWith("@@")) {
				const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
				if (match) {
					oldLineNum = parseInt(match[1], 10) - 1;
					newLineNum = parseInt(match[2], 10) - 1;
				}
				continue;
			}
			let lineType: "added" | "removed" | "context" | null = null;
			let currentOldLine: number | undefined;
			let currentNewLine: number | undefined;
			if (line.startsWith("+")) {
				newLineNum++;
				lineType = "added";
				currentNewLine = newLineNum;
			} else if (line.startsWith("-")) {
				oldLineNum++;
				lineType = "removed";
				currentOldLine = oldLineNum;
			} else if (line.startsWith(" ")) {
				oldLineNum++;
				newLineNum++;
				lineType = "context";
				currentOldLine = oldLineNum;
				currentNewLine = newLineNum;
			} else if (line.trim()) {
				selectableIndex++;
				continue;
			} else {
				continue;
			}
			const hasComment = discussions.some((d) =>
				hasLineCommentFn(d, lineType, currentOldLine, currentNewLine),
			);
			if (hasComment) linesWithComments.push(selectableIndex);
			selectableIndex++;
		}
		return linesWithComments;
	};

	const runMrAiReview = async (prompt?: string) => {
		const mr = mrStore.selectedMR();
		const app = getSelectedApp();
		if (!mr || !app) return;

		const { buildMrReviewPrompt } = await import("./mr-ai-utils");
		const reviewPrompt = prompt ?? buildMrReviewPrompt(mr);

		mrStore.setMrAiVisible(true);
		mrStore.setMrAiLoading(true);
		mrStore.setMrAiStreaming(false);
		mrStore.setMrAiSummary(null);
		mrStore.setMrAiError(null);
		mrStore.mrAiAtBottom = true;
		mrStore.mrAiLastScrollTop = 0;

		try {
			let firstDelta = true;
			for await (const delta of client.analyzeMRWithAIStream(
				app.ident,
				mr.iid,
				mr.source_branch,
				mr.target_branch,
				reviewPrompt,
			)) {
				if (firstDelta) {
					mrStore.setMrAiLoading(false);
					mrStore.setMrAiStreaming(true);
					mrStore.setMrAiSummary("");
					firstDelta = false;
				}
				mrStore.setMrAiSummary((prev) => (prev ?? "") + delta);
				if (mrStore.mrAiAtBottom && mrStore.mrAiScrollBoxRef) {
					if (
						mrStore.mrAiScrollBoxRef.scrollTop !== mrStore.mrAiLastScrollTop
					) {
						mrStore.mrAiAtBottom = false;
					} else {
						mrStore.mrAiScrollBoxRef.scrollTo(
							mrStore.mrAiScrollBoxRef.scrollHeight,
						);
						mrStore.mrAiLastScrollTop = mrStore.mrAiScrollBoxRef.scrollTop;
					}
				}
			}
			if (firstDelta) {
				// No output at all — set empty summary so overlay shows done state
				mrStore.setMrAiLoading(false);
				mrStore.setMrAiSummary("");
			}
		} catch (e) {
			mrStore.setMrAiError(e instanceof Error ? e.message : "AI review failed");
		} finally {
			mrStore.setMrAiLoading(false);
			mrStore.setMrAiStreaming(false);
		}
	};

	const postMrAiComments = async () => {
		const summary = mrStore.mrAiSummary();
		const app = getSelectedApp();
		const mr = mrStore.selectedMR();
		if (!summary || !app || !mr) return;
		if (app.sourceType === "github") {
			showError(
				"Not Supported",
				"Posting AI review comments is only supported for GitLab MRs.",
			);
			return;
		}
		mrStore.setMrAiPostingComments(true);
		try {
			const body = AI_ATTRIBUTION_HEADER + summary;
			await client.createMRComment(app.ident, mr.iid, body);
			mrStore.setMrAiCommentsPosted(true);
		} catch (e) {
			mrStore.setMrAiError(`Failed to post comments: ${errMsg(e)}`);
		} finally {
			mrStore.setMrAiPostingComments(false);
		}
	};

	return {
		loadMergeRequestForCurrentBranch,
		loadAllMergeRequests,
		nextPage,
		prevPage,
		showMRDetail,
		loadMRDetailData,
		submitComment,
		replyToDiscussion,
		resolveDiscussion,
		backToMRList,
		toggleMRApproval,
		rebaseMR,
		getDiscussionAtCurrentLine,
		getLinesWithComments,
		runMrAiReview,
		postMrAiComments,
	};
}

export type MrActions = ReturnType<typeof createMrActions>;
