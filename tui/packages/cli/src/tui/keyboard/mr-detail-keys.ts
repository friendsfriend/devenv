import { getLogger } from "@devenv/core";
import type {
	KeyboardEvent,
	KeyboardStores,
	KeyboardActions,
	KeyboardContext,
} from "./types";
import { handleHorizontalScrollKey } from "./horizontal-scroll";

/**
 * Handles keyboard events for the MR detail view.
 * Shift+A starts the pi-powered AI review overlay.
 * While the overlay is open all keys are forwarded to it.
 */
export async function handleMrDetailKeys(
	event: KeyboardEvent,
	stores: KeyboardStores,
	actions: KeyboardActions,
	_ctx: KeyboardContext,
): Promise<boolean> {
	const { appStore, mrStore } = stores;
	const { appActions, mrActions, pipelineActions, helpActions } = actions;

	if (appStore.viewMode() !== "mergeRequestDetail") return false;

	getLogger().write(
		"DEBUG",
		`[MR DETAIL] Key: name="${event.name}", sequence="${event.sequence}", shift=${event.shift}, ctrl=${event.ctrl}`,
	);

	// --- AI review overlay intercepts all keys while open ---
	if (mrStore.mrAiVisible()) {
		const name = event.name;

		// Dismiss
		const isEsc =
			name === "escape" ||
			name === "Escape" ||
			name === "esc" ||
			event.sequence === "\x1b" ||
			event.raw === "\x1b";
		if (isEsc) {
			mrStore.setMrAiVisible(false);
			return true;
		}

		// Scroll when review is visible
		if (mrStore.mrAiSummary() !== null && mrStore.mrAiScrollBoxRef) {
			const sb = mrStore.mrAiScrollBoxRef;
			if (handleHorizontalScrollKey(event, sb)) return true;
			if (event.ctrl && name === "j") {
				mrStore.mrAiAtBottom = false;
				sb.scrollBy(1);
				mrStore.mrAiLastScrollTop = sb.scrollTop;
				return true;
			}
			if (event.ctrl && name === "k") {
				mrStore.mrAiAtBottom = false;
				sb.scrollBy(-1);
				mrStore.mrAiLastScrollTop = sb.scrollTop;
				return true;
			}
			if (event.ctrl && name === "g") {
				mrStore.mrAiAtBottom = false;
				sb.scrollTo(0);
				mrStore.mrAiLastScrollTop = 0;
				return true;
			}
			if (event.ctrl && name === "G") {
				mrStore.mrAiAtBottom = true;
				sb.scrollTo(sb.scrollHeight);
				mrStore.mrAiLastScrollTop = sb.scrollTop;
				return true;
			}
		}

		// Enter — close completed review
		if (
			name === "return" ||
			name === "Return" ||
			name === "enter" ||
			name === "Enter"
		) {
			if (
				mrStore.mrAiSummary() !== null &&
				!mrStore.mrAiLoading() &&
				!mrStore.mrAiStreaming()
			) {
				mrStore.setMrAiVisible(false);
			}
			return true;
		}

		return true; // consume everything else while overlay is open
	}

	// --- Normal MR detail keys ---

	if (event.name === "q" || event.name === "Q") {
		appActions.exitApp();
		return true;
	}
	if (event.name === "?" || event.sequence === "?") {
		helpActions.showHelp();
		return true;
	}

	if (event.sequence === "C") {
		const changes = mrStore.mrChanges();
		if (changes && changes.length > 0) {
			mrStore.setSelectedChangedFileIndex(0);
			appStore.setViewMode("changedFiles");
		}
		return true;
	}

	if (event.sequence === "J") {
		const mr = mrStore.selectedMR();
		if (mr?.head_pipeline) pipelineActions.loadPipelineJobs();
		return true;
	}

	if (event.sequence === "T") {
		const testData = mrStore.mrTestSummary();
		if (testData?.test_suites?.length) appStore.setViewMode("testResults");
		return true;
	}

	if (event.sequence === "D") {
		getLogger().write(
			"DEBUG",
			`Shift+D pressed! event.sequence="${event.sequence}"`,
		);
		const discussions = mrStore.mrDiscussions();
		getLogger().write(
			"DEBUG",
			`Discussions count: ${discussions?.length || 0}`,
		);
		try {
			if (Array.isArray(discussions) && discussions.length > 0) {
				mrStore.setSelectedDiscussionIndex(0);
				mrStore.setDiscussionsShowOnlyComments(false);
				appStore.setViewMode("discussionsView");
				getLogger().write(
					"INFO",
					`Switched to discussionsView mode with ${discussions.length} discussions`,
				);
			}
		} catch (e) {
			getLogger().write("ERROR", `Error switching to discussions view: ${e}`);
		}
		return true;
	}

	// 'a' (lowercase only) — toggle approval; Shift+A is AI review
	if (event.name === "a" && event.sequence !== "A") {
		await mrActions.toggleMRApproval();
		return true;
	}

	// Shift+A — start the MR AI review immediately with the predefined prompt
	if (event.sequence === "A") {
		const mr = mrStore.selectedMR();
		if (mr) {
			const { buildMrReviewPrompt } = await import("../actions/mr-ai-utils");
			void mrActions.runMrAiReview(buildMrReviewPrompt(mr));
		}
		return true;
	}

	if (event.name === "r") {
		await mrActions.rebaseMR();
		return true;
	}

	// I (Shift+I) — open linked issues sub-view
	if ((event.name === "i" && event.shift) || event.name === "I") {
		mrStore.setSelectedMrLinkedIssueIndex(0);
		appStore.setViewMode("mrLinkedIssues");
		return true;
	}

	if (
		event.name === "escape" ||
		event.name === "Escape" ||
		event.name === "esc" ||
		event.sequence === "\x1b" ||
		event.raw === "\x1b"
	) {
		mrActions.backToMRList();
		return true;
	}

	return true;
}
