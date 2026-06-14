import type {
	KeyboardEvent,
	KeyboardStores,
	KeyboardActions,
	KeyboardContext,
} from "./types";

/**
 * Handles keyboard events for the Linked MRs sub-view:
 * - j/k for navigation
 * - Enter to open MR detail (reuses existing MR machinery)
 * - ESC/q to return to issue detail
 */
export async function handleLinkedMRsKeys(
	event: KeyboardEvent,
	stores: KeyboardStores,
	actions: KeyboardActions,
	_ctx: KeyboardContext,
): Promise<boolean> {
	const { appStore, issueStore } = stores;
	const { issueActions } = actions;

	if (appStore.viewMode() !== "linkedMRs") {
		return false;
	}

	const mrs = issueStore.linkedMRs();

	if (event.name === "j" || event.name === "down") {
		issueStore.setSelectedLinkedMRIndex(
			Math.min(issueStore.selectedLinkedMRIndex() + 1, mrs.length - 1),
		);
		return true;
	}

	if (event.name === "k" || event.name === "up") {
		issueStore.setSelectedLinkedMRIndex(
			Math.max(issueStore.selectedLinkedMRIndex() - 1, 0),
		);
		return true;
	}

	if (event.name === "g" && !event.ctrl) {
		issueStore.setSelectedLinkedMRIndex(0);
		return true;
	}

	if (event.name === "G" || (event.name === "g" && event.shift)) {
		issueStore.setSelectedLinkedMRIndex(mrs.length - 1);
		return true;
	}

	// Enter — opens MR detail (reuses existing MR machinery via mrActions)
	if (event.name === "enter" || event.name === "return") {
		const selectedMR = mrs[issueStore.selectedLinkedMRIndex()];
		if (selectedMR && actions.mrActions?.showMRDetail) {
			actions.mrActions.showMRDetail(selectedMR);
		}
		return true;
	}

	// ESC/q — return to issue detail
	if (event.name === "escape" || event.name === "q") {
		issueActions.backToIssueDetailFromLinkedMRs();
		return true;
	}

	return true;
}
