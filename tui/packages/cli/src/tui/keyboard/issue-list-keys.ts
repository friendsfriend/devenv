import { ISSUE_SCOPE_OPTIONS } from '@devenv/ui';
import { isDownKey, isLeftKey, isRightKey, isUpKey } from './nav-keys';
import { isNextRelatedKey, isPreviousRelatedKey } from './horizontal-scroll';
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
	const { appStore, issueStore, changeRequestStore } = stores;
	const { issueActions } = actions;

	if (
		appStore.viewMode() !== "issues" &&
		appStore.viewMode() !== "issueScopePicker" &&
		appStore.viewMode() !== "changeRequestLinkedIssues"
	) {
		return false;
	}

	// Scope picker mode — j/k navigation + Enter/Esc
	if (appStore.viewMode() === "issueScopePicker") {
		if (event.name === "escape" || event.name === "q") {
			appStore.setViewMode("table");
			issueStore.setIssueScopePickerIndex(0);
			return true;
		}

		if (isDownKey(event)) {
			const max = Math.max(0, ISSUE_SCOPE_OPTIONS.length - 1);
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
			if (idx >= 0 && idx < ISSUE_SCOPE_OPTIONS.length) {
				issueActions.selectScope(ISSUE_SCOPE_OPTIONS[idx].value);
			}
			return true;
		}

		return true; // Eat all other keys in scope picker
	}

	// CR linked issues sub-view
	if (appStore.viewMode() === "changeRequestLinkedIssues") {
		const linkedIssues = changeRequestStore.changeRequestLinkedIssues();
		const selectedIdx = changeRequestStore.selectedChangeRequestLinkedIssueIndex();

		if (isDownKey(event)) {
			changeRequestStore.setSelectedCrLinkedIssueIndex(
				Math.min(selectedIdx + 1, linkedIssues.length - 1),
			);
			return true;
		}
		if (isUpKey(event)) {
			changeRequestStore.setSelectedCrLinkedIssueIndex(Math.max(selectedIdx - 1, 0));
			return true;
		}
		if (event.name === "g" && !event.ctrl) {
			changeRequestStore.setSelectedCrLinkedIssueIndex(0);
			return true;
		}
		if (
			(event.name === "G" || (event.name === "g" && event.shift)) &&
			!event.ctrl
		) {
			changeRequestStore.setSelectedCrLinkedIssueIndex(
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
			changeRequestStore.setSelectedCrLinkedIssueIndex(0);
			appStore.setViewMode("changeRequestDetail");
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

		if (issueStore.showIssueListFilterModal()) {
			const params = issueStore.issueListFilterParameters();
			const param = params[issueStore.issueListFilterParameterIndex()];
			const values = param?.values ?? [];
			if (event.name === "x") { issueStore.setIssueListFilters({ labels: [] }); issueStore.setSelectedIssueIndex(0); void issueActions.loadAllIssues(issueStore.issueScope(), 1, issueStore.issueSearchTerm() || undefined); return true; }
			if (isLeftKey(event)) { issueStore.setIssueListFilterFocusedPane("parameter"); return true; }
			if (isRightKey(event)) { issueStore.setIssueListFilterFocusedPane("value"); return true; }
			if (isDownKey(event)) {
				if (issueStore.issueListFilterFocusedPane() === "parameter") { issueStore.setIssueListFilterParameterIndex(Math.min(issueStore.issueListFilterParameterIndex() + 1, params.length - 1)); issueStore.setIssueListFilterValueIndex(0); }
				else issueStore.setIssueListFilterValueIndex(Math.min(issueStore.issueListFilterValueIndex() + 1, values.length - 1));
				return true;
			}
			if (isUpKey(event)) {
				if (issueStore.issueListFilterFocusedPane() === "parameter") { issueStore.setIssueListFilterParameterIndex(Math.max(issueStore.issueListFilterParameterIndex() - 1, 0)); issueStore.setIssueListFilterValueIndex(0); }
				else issueStore.setIssueListFilterValueIndex(Math.max(issueStore.issueListFilterValueIndex() - 1, 0));
				return true;
			}
			if (event.name === "space" || event.sequence === " ") {
				const value = values[issueStore.issueListFilterValueIndex()]?.value;
				if (param && value) {
					const filters = { ...issueStore.issueListFilters() };
					const current = filters[param.key] ?? [];
					filters[param.key] = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
					issueStore.setIssueListFilters(filters);
					issueStore.setSelectedIssueIndex(0);
					void issueActions.loadAllIssues(issueStore.issueScope(), 1, issueStore.issueSearchTerm() || undefined);
				}
				return true;
			}
			if (event.name === "enter" || event.name === "return" || event.name === "escape" || event.name === "q") { issueStore.setShowIssueListFilterModal(false); return true; }
			return true;
		}

		if (issueStore.showIssueListSortModal()) {
			const rules = issueStore.issueListSortRules();
			const idx = issueStore.issueListSortSelectedIndex();
			const cycle = (d: "asc" | "desc" | "none") => d === "none" ? "asc" : d === "asc" ? "desc" : "none";
			if (event.name === "x") { issueStore.setIssueListSortRules(rules.map((rule) => ({ ...rule, direction: "none" }))); void issueActions.loadAllIssues(issueStore.issueScope(), 1, issueStore.issueSearchTerm() || undefined); return true; }
			if (isDownKey(event)) { issueStore.setIssueListSortSelectedIndex(Math.min(idx + 1, rules.length - 1)); return true; }
			if (isUpKey(event)) { issueStore.setIssueListSortSelectedIndex(Math.max(idx - 1, 0)); return true; }
			if (event.name === "space" || event.sequence === " ") { issueStore.setIssueListSortRules(rules.map((rule, i) => i === idx ? { ...rule, direction: cycle(rule.direction) } : rule)); void issueActions.loadAllIssues(issueStore.issueScope(), 1, issueStore.issueSearchTerm() || undefined); return true; }
			if (event.name === "enter" || event.name === "return" || event.name === "escape" || event.name === "q") { issueStore.setShowIssueListSortModal(false); return true; }
			return true;
		}

		if (event.name === "F" || (event.name === "f" && event.shift)) { issueStore.setShowIssueListFilterModal(true); return true; }
		if (event.name === "O" || (event.name === "o" && event.shift)) { issueStore.setShowIssueListSortModal(true); return true; }

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
		// State toggle: s cycles open → closed → all → open
		if (event.name === "s" && !event.shift && !event.ctrl) {
			const current = issueStore.issueState();
			const next =
				current === "open" ? "closed" :
				current === "closed" ? "all" :
				"open";
			issueStore.setIssueState(next);
			void issueActions.loadAllIssues(issueStore.issueScope(), 1, undefined, next);
			return true;
		}

		// Search
		if (event.name === "/" || event.sequence === "/") {
			issueStore.setIssueSearchMode(true);
			issueStore.setIssueSearchQuery("");
			return true;
		}
		// Pagination
		if (isNextRelatedKey(event)) {
			void issueActions.nextPage();
			return true;
		}
		if (isPreviousRelatedKey(event)) {
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
