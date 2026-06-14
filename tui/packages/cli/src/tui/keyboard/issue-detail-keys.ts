import type {
	KeyboardEvent,
	KeyboardStores,
	KeyboardActions,
	KeyboardContext,
} from "./types";

export async function handleIssueDetailKeys(
	event: KeyboardEvent,
	stores: KeyboardStores,
	actions: KeyboardActions,
	_ctx: KeyboardContext,
): Promise<boolean> {
	const { appStore } = stores;
	const { issueActions } = actions;

	if (appStore.viewMode() !== "issueDetail") {
		return false;
	}

	if (event.name === "escape" || event.name === "q") {
		issueActions.backToIssueList();
		return true;
	}

	// j/k scrolling within the detail view
	if (event.name === "down" || event.name === "j") {
		return true;
	}
	if (event.name === "up" || event.name === "k") {
		return true;
	}

	return true;
}
