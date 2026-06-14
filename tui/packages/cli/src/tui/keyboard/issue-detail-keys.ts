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
	const { appStore, issueStore } = stores;
	const { issueActions } = actions;

	if (appStore.viewMode() !== "issueDetail") {
		return false;
	}

	const issue = issueStore.selectedIssue();
	if (!issue) {
		return false;
	}

	// ─── Modal states take priority ──────────────────────────────────────────

	// Label picker modal
	if (issueStore.showLabelPicker()) {
		if (event.name === "j" || event.name === "down") {
			const idx = issueStore.labelPickerIndex();
			const labels = issueStore.availableLabels();
			issueStore.setLabelPickerIndex(Math.min(idx + 1, labels.length - 1));
			return true;
		}
		if (event.name === "k" || event.name === "up") {
			const idx = issueStore.labelPickerIndex();
			issueStore.setLabelPickerIndex(Math.max(idx - 1, 0));
			return true;
		}
		if (event.name === "enter" || event.name === "return") {
			const idx = issueStore.labelPickerIndex();
			const labels = issueStore.availableLabels();
			const selectedLabel = labels[idx];
			if (selectedLabel) {
				issueActions.setIssueLabels(issue.iid, [selectedLabel]);
			}
			return true;
		}
		if (event.name === "escape" || event.name === "q") {
			issueStore.setShowLabelPicker(false);
			return true;
		}
		return true;
	}

	// Assignee picker modal
	if (issueStore.showAssigneePicker()) {
		if (event.name === "j" || event.name === "down") {
			const idx = issueStore.assigneePickerIndex();
			const collabs = issueStore.availableCollaborators();
			issueStore.setAssigneePickerIndex(Math.min(idx + 1, collabs.length - 1));
			return true;
		}
		if (event.name === "k" || event.name === "up") {
			const idx = issueStore.assigneePickerIndex();
			issueStore.setAssigneePickerIndex(Math.max(idx - 1, 0));
			return true;
		}
		if (event.name === "enter" || event.name === "return") {
			const idx = issueStore.assigneePickerIndex();
			const collabs = issueStore.availableCollaborators();
			const selectedCollab = collabs[idx];
			if (selectedCollab) {
				const currentAssignee = (issue.assignees ?? [])[0]?.username;
				if (selectedCollab === currentAssignee) {
					issueActions.removeIssueAssignee(issue.iid);
				} else {
					issueActions.setIssueAssignee(issue.iid, selectedCollab);
				}
			}
			return true;
		}
		if (event.name === "escape" || event.name === "q") {
			issueStore.setShowAssigneePicker(false);
			return true;
		}
		return true;
	}

	// Comment modal
	if (issueStore.showCommentModal()) {
		// Backspace - delete last char
		if (event.name === "backspace") {
			issueStore.setCommentText((prev) => prev.slice(0, -1));
			return true;
		}
		// Ctrl+Enter - submit
		if (
			(event.ctrl && event.name === "enter") ||
			(event.ctrl && event.name === "return")
		) {
			issueActions.addComment();
			return true;
		}
		// Enter - newline (append \n)
		if (event.name === "enter" || event.name === "return") {
			issueStore.setCommentText((prev) => prev + "\n");
			return true;
		}
		// Printable characters - append to text
		if (
			event.sequence &&
			event.sequence.length === 1 &&
			event.sequence.charCodeAt(0) >= 32
		) {
			issueStore.setCommentText((prev) => prev + event.sequence!);
			return true;
		}
		if (event.name === "escape" || event.name === "q") {
			issueStore.setShowCommentModal(false);
			issueStore.setCommentText("");
			return true;
		}
		return true;
	}

	// Close reason modal
	if (issueStore.showCloseReasonModal()) {
		const REASON_VALUES = ["completed", "not_planned", ""];
		if (event.name === "j" || event.name === "down") {
			issueStore.setCloseReasonIndex(
				Math.min(issueStore.closeReasonIndex() + 1, 2),
			);
			return true;
		}
		if (event.name === "k" || event.name === "up") {
			issueStore.setCloseReasonIndex(
				Math.max(issueStore.closeReasonIndex() - 1, 0),
			);
			return true;
		}
		if (event.name === "enter" || event.name === "return") {
			const idx = issueStore.closeReasonIndex();
			issueStore.setShowCloseReasonModal(false);
			issueActions.closeIssue(issue.iid, REASON_VALUES[idx]);
			return true;
		}
		if (event.name === "escape" || event.name === "q") {
			issueStore.setShowCloseReasonModal(false);
			return true;
		}
		return true;
	}

	// ─── Normal mode keybinds ───────────────────────────────────────────────

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

	// c - Close issue (opens reason picker)
	if (event.name === "c" && !event.ctrl && !event.shift) {
		if (issue.state === "closed") {
			return true;
		}
		issueStore.setCloseReasonIndex(0);
		issueStore.setShowCloseReasonModal(true);
		return true;
	}

	// C (Shift+C) - Reopen issue (no confirmation)
	if ((event.name === "c" && event.shift) || event.name === "C") {
		const alreadyOpen = issue.state === "open" || issue.state === "opened";
		if (alreadyOpen) {
			return true;
		}
		issueActions.reopenIssue(issue.iid);
		return true;
	}

	// l - Open label picker
	if (event.name === "l" && !event.ctrl) {
		issueActions.openLabelPicker();
		return true;
	}

	// a - Open assignee picker
	if (event.name === "a" && !event.ctrl) {
		issueActions.openAssigneePicker();
		return true;
	}

	// r - Add comment (reply)
	if (event.name === "r" && !event.ctrl) {
		issueActions.openCommentModal();
		return true;
	}

	return true;
}
