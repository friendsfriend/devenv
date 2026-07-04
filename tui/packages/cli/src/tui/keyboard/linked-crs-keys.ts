import { isDownKey, isUpKey } from './nav-keys';
import type {
	KeyboardEvent,
	KeyboardStores,
	KeyboardActions,
	KeyboardContext,
} from "./types";

/**
 * Handles keyboard events for the Linked CRs sub-view:
 * - j/k for navigation
 * - Enter to open CR detail (reuses existing CR machinery)
 * - ESC/q to return to issue detail
 */
export async function handleLinkedCRsKeys(
	event: KeyboardEvent,
	stores: KeyboardStores,
	actions: KeyboardActions,
	_ctx: KeyboardContext,
): Promise<boolean> {
	const { appStore, issueStore } = stores;
	const { issueActions } = actions;

	if (appStore.viewMode() !== "linkedChangeRequests") {
		return false;
	}

	const crs = issueStore.linkedChangeRequests();

	if (isDownKey(event)) {
		issueStore.setSelectedLinkedCRIndex(
			Math.min(issueStore.selectedLinkedCRIndex() + 1, crs.length - 1),
		);
		return true;
	}

	if (isUpKey(event)) {
		issueStore.setSelectedLinkedCRIndex(
			Math.max(issueStore.selectedLinkedCRIndex() - 1, 0),
		);
		return true;
	}

	if (event.name === "g" && !event.ctrl) {
		issueStore.setSelectedLinkedCRIndex(0);
		return true;
	}

	if (event.name === "G" || (event.name === "g" && event.shift)) {
		issueStore.setSelectedLinkedCRIndex(crs.length - 1);
		return true;
	}

	// Enter — opens CR detail (reuses existing CR machinery via crActions)
	if (event.name === "enter" || event.name === "return") {
		const selectedChangeRequest = crs[issueStore.selectedLinkedCRIndex()];
		if (selectedChangeRequest && actions.crActions?.showCRDetail) {
			actions.crActions.showCRDetail(selectedChangeRequest);
		}
		return true;
	}

	// ESC/q — return to issue detail
	if (event.name === "escape" || event.name === "q") {
		issueActions.backToIssueDetailFromLinkedCRs();
		return true;
	}

	return true;
}
