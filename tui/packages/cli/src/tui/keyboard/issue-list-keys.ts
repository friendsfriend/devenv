import { isDownKey, isUpKey } from './nav-keys';
import type {
	KeyboardEvent,
	KeyboardStores,
	KeyboardActions,
	KeyboardContext,
} from "./types";

export async function handleIssueListKeys(
	event: KeyboardEvent,
	stores: KeyboardStores,
	actions: KeyboardActions,
	_ctx: KeyboardContext,
): Promise<boolean> {
	const { appStore, issueStore, mrStore } = stores;
	const { issueActions } = actions;

	if (
		appStore.viewMode() !== "issues" &&
		appStore.viewMode() !== "issueScopePicker" &&
		appStore.viewMode() !== "referencedIssues" &&
		appStore.viewMode() !== "mrLinkedIssues"
	) {
		return false;
	}

	// Scope picker mode — j/k navigation + Enter/Esc
	if (appStore.viewMode() === "issueScopePicker") {
		const SCOPE_ITEMS = [
			"All issues",
			"Assigned to me",
			"Created by me",
			"No assignee",
		];
		const SCOPE_VALUES = [
			"all",
			"assigned-to-me",
			"created-by-me",
			"no-assignee",
		];

		if (event.name === "escape" || event.name === "q") {
			appStore.setViewMode("table");
			issueStore.setIssueScopePickerIndex(0);
			return true;
		}

		if (isDownKey(event)) {
			const max = Math.max(0, SCOPE_ITEMS.length - 1);
			issueStore.setIssueScopePickerIndex((prev: number) =>
				Math.min(prev + 1, max),
			);
			return true;
		}

		if (isUpKey(event)) {
			issueStore.setIssueScopePickerIndex((prev: number) =>
				Math.max(prev - 1, 0),
			);
			return true;
		}

		if (event.name === "return" || event.name === "enter") {
			const idx = issueStore.issueScopePickerIndex();
			if (idx >= 0 && idx < SCOPE_VALUES.length) {
				issueActions.selectScope(SCOPE_VALUES[idx] as any);
			}
			return true;
		}

		return true; // Eat all other keys in scope picker
	}

	// MR linked issues sub-view
	if (appStore.viewMode() === "mrLinkedIssues") {
		const linkedIssues = mrStore.mrLinkedIssues();
		const selectedIdx = mrStore.selectedMrLinkedIssueIndex();

		if (isDownKey(event)) {
			mrStore.setSelectedMrLinkedIssueIndex(
				Math.min(selectedIdx + 1, linkedIssues.length - 1),
			);
			return true;
		}
		if (isUpKey(event)) {
			mrStore.setSelectedMrLinkedIssueIndex(Math.max(selectedIdx - 1, 0));
			return true;
		}
		if (event.name === "g" && !event.ctrl) {
			mrStore.setSelectedMrLinkedIssueIndex(0);
			return true;
		}
		if (
			(event.name === "G" || (event.name === "g" && event.shift)) &&
			!event.ctrl
		) {
			mrStore.setSelectedMrLinkedIssueIndex(
				Math.max(0, linkedIssues.length - 1),
			);
			return true;
		}
		if (event.name === "return" || event.name === "enter") {
			const issue = linkedIssues[selectedIdx];
			if (issue) {
				void issueActions.showIssueDetail(issue);
			}
			return true;
		}
		if (event.name === "escape" || event.name === "q") {
			mrStore.setSelectedMrLinkedIssueIndex(0);
			appStore.setViewMode("mergeRequestDetail");
			return true;
		}
		return true;
	}

	// Referenced issues sub-view
	if (appStore.viewMode() === "referencedIssues") {
		const refIssues = issueStore.referencedIssues();
		const selectedIdx = issueStore.selectedReferencedIssueIndex();

		if (isDownKey(event)) {
			issueStore.setSelectedReferencedIssueIndex(
				Math.min(selectedIdx + 1, refIssues.length - 1),
			);
			return true;
		}
		if (isUpKey(event)) {
			issueStore.setSelectedReferencedIssueIndex(Math.max(selectedIdx - 1, 0));
			return true;
		}
		if (event.name === "g" && !event.ctrl) {
			issueStore.setSelectedReferencedIssueIndex(0);
			return true;
		}
		if (
			(event.name === "G" || (event.name === "g" && event.shift)) &&
			!event.ctrl
		) {
			issueStore.setSelectedReferencedIssueIndex(
				Math.max(0, refIssues.length - 1),
			);
			return true;
		}
		if (event.name === "return" || event.name === "enter") {
			const issue = refIssues[selectedIdx];
			if (issue) {
				void issueActions.showIssueDetail(issue);
			}
			return true;
		}
		if (event.name === "escape" || event.name === "q") {
			issueActions.backToIssueDetailFromReferences();
			return true;
		}
		return true;
	}

	// Issue list view mode
	if (appStore.viewMode() === "issues") {
		const issues = issueStore.issues();
		// Handle search mode
		if (issueStore.issueSearchMode()) {
			if (event.name === "escape") {
				issueStore.setIssueSearchMode(false);
				issueStore.setIssueSearchQuery("");
				issueStore.setIssueSearchTerm("");
				return true;
			}
			if (event.name === "return") {
				issueStore.setIssueSearchMode(false);
				issueStore.setIssueSearchTerm(issueStore.issueSearchQuery());
				void issueActions.loadAllIssues(
					issueStore.issueScope(),
					1,
					issueStore.issueSearchQuery(),
				);
				return true;
			}
			if (event.name === "backspace") {
				issueStore.setIssueSearchQuery((prev) => prev.slice(0, -1));
				return true;
			}
			if (
				event.sequence &&
				event.sequence.length === 1 &&
				event.sequence.charCodeAt(0) >= 32
			) {
				issueStore.setIssueSearchQuery((prev) => prev + event.sequence!);
				return true;
			}
			return true;
		}

		// Navigation
		if (isDownKey(event)) {
			const nextIdx = Math.min(
				issueStore.selectedIssueIndex() + 1,
				issues.length - 1,
			);
			issueStore.setSelectedIssueIndex(Math.max(0, nextIdx));
			return true;
		}
		if (isUpKey(event)) {
			const nextIdx = Math.max(issueStore.selectedIssueIndex() - 1, 0);
			issueStore.setSelectedIssueIndex(nextIdx);
			return true;
		}
		if (event.name === "g" && !event.ctrl) {
			issueStore.setSelectedIssueIndex(0);
			return true;
		}
		if (
			(event.name === "G" || (event.name === "g" && event.shift)) &&
			!event.ctrl
		) {
			issueStore.setSelectedIssueIndex(Math.max(0, issues.length - 1));
			return true;
		}
		if (event.name === "return") {
			const issue = issues[issueStore.selectedIssueIndex()];
			if (issue) {
				void issueActions.showIssueDetail(issue);
			}
			return true;
		}
		if (event.name === "escape") {
			if (issueStore.issueSearchQuery() || issueStore.issueSearchTerm()) {
				issueStore.setIssueSearchMode(false);
				issueStore.setIssueSearchQuery("");
				issueStore.setIssueSearchTerm("");
				issueStore.setSelectedIssueIndex(0);
				void issueActions.loadAllIssues(issueStore.issueScope(), 1);
				return true;
			}
			appStore.setViewMode("table");
			issueStore.setIssues([]);
			issueStore.setIssueError("");
			return true;
		}
		if (event.name === "q") {
			appStore.setViewMode("table");
			issueStore.setIssues([]);
			issueStore.setIssueError("");
			return true;
		}
		// Search
		if (event.name === "/" || event.sequence === "/") {
			issueStore.setIssueSearchMode(true);
			issueStore.setIssueSearchQuery("");
			return true;
		}
		// Pagination
		if (event.name === "]" || event.sequence === "]" || event.name === "l") {
			void issueActions.nextPage();
			return true;
		}
		if (event.name === "[" || event.sequence === "[" || event.name === "h") {
			void issueActions.prevPage();
			return true;
		}
		// For keys that should fall through to the table handler
		if (event.name === "i" || event.name === "I") {
			return false;
		}
		return true;
	}

	return false;
}
