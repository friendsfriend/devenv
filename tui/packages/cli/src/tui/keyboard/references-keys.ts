import { isDownKey, isUpKey } from './nav-keys';
import type {
	KeyboardEvent,
	KeyboardStores,
	KeyboardActions,
	KeyboardContext,
} from "./types";

/**
 * Handles keyboard events for the combined References sub-view:
 * - j/k navigation, Enter opens selected item (issue detail or CR detail)
 * - ESC/q returns to issue detail
 */
export async function handleReferencesKeys(
	event: KeyboardEvent,
	stores: KeyboardStores,
	actions: KeyboardActions,
	_ctx: KeyboardContext,
): Promise<boolean> {
	const { appStore, issueStore } = stores;
	const { issueActions } = actions;

	if (appStore.viewMode() !== "references") {
		return false;
	}

	const refs = issueStore.references();
	const idx = issueStore.selectedReferenceIndex();

	if (isDownKey(event)) {
		issueStore.setSelectedReferenceIndex(Math.min(idx + 1, refs.length - 1));
		return true;
	}

	if (isUpKey(event)) {
		issueStore.setSelectedReferenceIndex(Math.max(idx - 1, 0));
		return true;
	}

	if (event.name === "g" && !event.ctrl) {
		issueStore.setSelectedReferenceIndex(0);
		return true;
	}

	if (
		(event.name === "G" || (event.name === "g" && event.shift)) &&
		!event.ctrl
	) {
		issueStore.setSelectedReferenceIndex(Math.max(0, refs.length - 1));
		return true;
	}

	if (event.name === "return" || event.name === "enter") {
		const ref = refs[idx];
		if (!ref) return true;

		if (ref.type === "issue") {
			void issueActions.showIssueDetail(ref.data);
		} else if (ref.type === "cr") {
			// Open CR detail via crActions
			actions.crActions?.showCRDetail(ref.data as any);
		}
		return true;
	}

	if (event.name === "escape" || event.name === "q") {
		issueActions.backToIssueDetailFromReferences();
		return true;
	}

	return true;
}
