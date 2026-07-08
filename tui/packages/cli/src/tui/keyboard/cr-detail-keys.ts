import { getLogger } from '@devenv/core';
import type {
	KeyboardEvent,
	KeyboardStores,
	KeyboardActions,
	KeyboardContext,
} from "./types";
import { handleHorizontalScrollKey } from "./horizontal-scroll";

/**
 * Handles keyboard events for the CR detail view.
 * Shift+A starts the pi-powered AI review overlay.
 * While the overlay is open all keys are forwarded to it.
 */
export async function handleCrDetailKeys(
	event: KeyboardEvent,
	stores: KeyboardStores,
	actions: KeyboardActions,
	_ctx: KeyboardContext,
): Promise<boolean> {
	const { appStore, changeRequestStore } = stores;
	const { crActions, pipelineActions, helpActions } = actions;

	if (appStore.viewMode() !== "changeRequestDetail") return false;

	getLogger().write(
		"DEBUG",
		`[CR DETAIL] Key: name="${event.name}", sequence="${event.sequence}", shift=${event.shift}, ctrl=${event.ctrl}`,
	);

	// --- AI review overlay intercepts all keys while open ---
	if (changeRequestStore.crAiVisible()) {
		const name = event.name;

		// Dismiss
		const isEsc =
			name === "escape" ||
			name === "Escape" ||
			name === "esc" ||
			event.sequence === "\x1b" ||
			event.raw === "\x1b";
		if (isEsc) {
			changeRequestStore.setCrAiVisible(false);
			return true;
		}

		// Scroll when review is visible
		if (changeRequestStore.crAiSummary() !== null && changeRequestStore.crAiScrollBoxRef) {
			const sb = changeRequestStore.crAiScrollBoxRef;
			if (handleHorizontalScrollKey(event, sb)) return true;
			if (event.ctrl && name === "j") {
				changeRequestStore.crAiAtBottom = false;
				sb.scrollBy(1);
				changeRequestStore.crAiLastScrollTop = sb.scrollTop;
				return true;
			}
			if (event.ctrl && name === "k") {
				changeRequestStore.crAiAtBottom = false;
				sb.scrollBy(-1);
				changeRequestStore.crAiLastScrollTop = sb.scrollTop;
				return true;
			}
			if (event.ctrl && name === "g") {
				changeRequestStore.crAiAtBottom = false;
				sb.scrollTo(0);
				changeRequestStore.crAiLastScrollTop = 0;
				return true;
			}
			if (event.ctrl && name === "G") {
				changeRequestStore.crAiAtBottom = true;
				sb.scrollTo(sb.scrollHeight);
				changeRequestStore.crAiLastScrollTop = sb.scrollTop;
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
				changeRequestStore.crAiSummary() !== null &&
				!changeRequestStore.crAiLoading() &&
				!changeRequestStore.crAiStreaming()
			) {
				changeRequestStore.setCrAiVisible(false);
			}
			return true;
		}

		return true; // consume everything else while overlay is open
	}

	// --- Normal CR detail keys ---

	if (event.name === "?" || event.sequence === "?") {
		helpActions.showHelp();
		return true;
	}

	if (event.sequence === "C") {
		const changes = changeRequestStore.crChanges();
		if (changes && changes.length > 0) {
			changeRequestStore.setSelectedChangedFileIndex(0);
			appStore.setViewMode("changedFiles");
		}
		return true;
	}

	if (event.sequence === "J") {
		const cr = changeRequestStore.selectedChangeRequest();
		if (cr?.head_pipeline) pipelineActions.loadPipelineJobs();
		return true;
	}

	if (event.sequence === "T") {
		const testData = changeRequestStore.crTestSummary();
		if (testData?.test_suites?.length) appStore.setViewMode("testResults");
		return true;
	}

	if (event.sequence === "D") {
		getLogger().write(
			"DEBUG",
			`Shift+D pressed! event.sequence="${event.sequence}"`,
		);
		const discussions = changeRequestStore.crDiscussions();
		getLogger().write(
			"DEBUG",
			`Discussions count: ${discussions?.length || 0}`,
		);
		try {
			if (Array.isArray(discussions) && discussions.length > 0) {
				changeRequestStore.setSelectedDiscussionIndex(0);
				changeRequestStore.setDiscussionsShowOnlyComments(false);
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
		await crActions.toggleCRApproval();
		return true;
	}

	// Shift+A — start the CR AI review immediately with the predefined prompt
	if (event.sequence === "A") {
		const cr = changeRequestStore.selectedChangeRequest();
		if (cr) {
			const { buildCrReviewPrompt } = await import("../actions/cr-ai-utils");
			void crActions.runCrAiReview(buildCrReviewPrompt(cr));
		}
		return true;
	}

	if (event.name === "r") {
		await crActions.rebaseCR();
		return true;
	}

	// I (Shift+I) — open linked issues sub-view
	if ((event.name === "i" && event.shift) || event.name === "I") {
		changeRequestStore.setSelectedCrLinkedIssueIndex(0);
		appStore.setViewMode("changeRequestLinkedIssues");
		return true;
	}

	if (
		event.name === "escape" ||
		event.name === "Escape" ||
		event.name === "esc" ||
		event.sequence === "\x1b" ||
		event.raw === "\x1b"
	) {
		crActions.backToCRList();
		return true;
	}

	return true;
}
