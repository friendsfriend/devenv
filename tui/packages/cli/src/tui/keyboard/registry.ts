/**
 * Keybind registry — single source of truth for help text, status bar hints,
 * and keybind search in the TUI.
 *
 * Each KeybindDef.context matches appStore.viewMode() values so the help view
 * can filter by current context without a translation layer.
 *
 * ponytail: flat array, trivial to query with filter/map/group. Switch to
 * Map<string,KeybindDef[]> keyed by context if per-context lookups ever
 * become a bottleneck.
 */

export interface KeybindDef {
	/** Key sequence(s) the user presses, e.g. ["j", "k"] or ["Ctrl+S"] */
	keys: string[];
	/** Human-readable description of what this keybind does */
	description: string;
	/** Short label for footer status bar; falls back to description */
	footerDescription?: string;
	/** View context — must match appStore.viewMode() values */
	context: string;
	/** Category label for grouping in help view */
	category: string;
}

export const KEYBINDS: KeybindDef[] = [
	// ========== global ==========
	{ keys: ["?"], description: "Show help", context: "global", category: "General" },
	{ keys: ["Ctrl+/"], description: "Toggle OpenTUI console", context: "global", category: "General" },
	{ keys: ["Ctrl+R"], description: "Toggle running text for overflowing focused fields", footerDescription: "Run text", context: "global", category: "General" },
	{ keys: ["T"], description: "Open theme picker", footerDescription: "Theme", context: "global", category: "General" },
	{ keys: ["Esc"], description: "Close OpenTUI console when visible", context: "global", category: "General" },
	{ keys: ["Ctrl+C"], description: "Copy selection; press twice to quit", context: "global", category: "General" },
	{ keys: ["Ctrl+Shift+C", "Cmd+C"], description: "Copy selection", context: "global", category: "General" },
	{ keys: ["Ctrl+V", "Cmd+V"], description: "Paste provider/app config from clipboard", context: "global", category: "General" },

	// ========== Global modals ==========
	{ keys: ["c"], description: "Copy error details", context: "errorDialog", category: "Actions" },
	{ keys: ["Any key"], description: "Dismiss error dialog", context: "errorDialog", category: "General" },
	{ keys: ["y"], description: "Confirm action", context: "confirmDialog", category: "Actions" },
	{ keys: ["n", "Esc"], description: "Cancel action", context: "confirmDialog", category: "General" },
	{ keys: ["j/k", "↑/↓"], description: "Navigate profiles", context: "profilePicker", category: "Navigation" },
	{ keys: ["Enter"], description: "Start with selected profile", context: "profilePicker", category: "Actions" },
	{ keys: ["Esc"], description: "Cancel profile picker", context: "profilePicker", category: "General" },
	{ keys: ["j/k", "↑/↓"], description: "Navigate themes", context: "themePicker", category: "Navigation" },
	{ keys: ["/"], description: "Filter themes", context: "themePicker", category: "Actions" },
	{ keys: ["Enter"], description: "Apply selected theme / finish filter", context: "themePicker", category: "Actions" },
	{ keys: ["Esc"], description: "Close theme picker", context: "themePicker", category: "General" },

	// ========== table — Navigation ==========
	{ keys: ["↑", "k"], description: "Move selection up", context: "table", category: "Navigation" },
	{ keys: ["↓", "j"], description: "Move selection down", context: "table", category: "Navigation" },
	{ keys: ["Tab", "1", "2", "3", "4"], description: "Switch tab (Apps/Infra/Libs/Scripts)", context: "table", category: "Navigation" },

	// ========== table — Actions ==========
	{ keys: ["l"], description: "View container logs for selected app", footerDescription: "App logs", context: "table", category: "Actions" },
	{ keys: ["o"], description: "View operation logs for selected app", footerDescription: "Op logs", context: "table", category: "Actions" },
	{ keys: ["L"], description: "Toggle status log maximize", footerDescription: "Max logs", context: "table", category: "Actions" },
	{ keys: ["m"], description: "View MR for current branch", footerDescription: "MR", context: "table", category: "Actions" },
	{ keys: ["M"], description: "View all open MRs", footerDescription: "All MRs", context: "table", category: "Actions" },
	{ keys: ["i"], description: "Open issue scope picker", footerDescription: "Issues", context: "table", category: "Actions" },
	{ keys: ["I"], description: "Load all issues", footerDescription: "All issues", context: "table", category: "Actions" },
	{ keys: ["c"], description: "View providers config", footerDescription: "Providers", context: "table", category: "Actions" },
	{ keys: ["e"], description: "Open app directory in $EDITOR", footerDescription: "Edit app", context: "table", category: "Actions" },
	{ keys: ["E"], description: "Open editor picker", footerDescription: "Editors", context: "table", category: "Actions" },
	{ keys: ["G"], description: "Open lazygit for selected app", footerDescription: "Lazygit", context: "table", category: "Actions" },
	{ keys: ["d"], description: "Open lazydocker for selected app", footerDescription: "Lazydocker", context: "table", category: "Actions" },
	{ keys: ["w"], description: "Open worktree manager", footerDescription: "Worktrees", context: "table", category: "Actions" },
	{ keys: ["+"], description: "Add app or script", footerDescription: "Add", context: "table", category: "Actions" },
	{ keys: ["-"], description: "Remove selected app or script", footerDescription: "Remove", context: "table", category: "Actions" },
	{ keys: ["Enter"], description: "View app detail or run script", footerDescription: "Open", context: "table", category: "Actions" },
	{ keys: ["/"], description: "Search table", context: "table", category: "Actions" },
	{ keys: ["F"], description: "Filter table", context: "table", category: "Actions" },
	{ keys: ["O"], description: "Order/sort table", context: "table", category: "Actions" },

	// ========== table — Docker ==========
	{ keys: ["s"], description: "Start container (with profile picker)", context: "table", category: "Docker" },
	{ keys: ["S"], description: "Stop container", context: "table", category: "Docker" },
	{ keys: ["R"], description: "Restart container", context: "table", category: "Docker" },
	{ keys: ["r"], description: "Refresh status (non-scripts tab)", context: "table", category: "Docker" },
	{ keys: ["b"], description: "Build application / toggle build logs while running", context: "table", category: "Docker" },
	{ keys: ["t"], description: "Test application / toggle test logs while running", context: "table", category: "Docker" },

	// ========== table — Git ==========
	{ keys: ["p"], description: "Git pull", context: "table", category: "Git" },
	{ keys: ["P"], description: "Git push", context: "table", category: "Git" },
	{ keys: ["f"], description: "Git fetch", context: "table", category: "Git" },
	{ keys: ["g"], description: "Open branch selector", context: "table", category: "Git" },

	// ========== table — Scripts ==========
	{ keys: ["s"], description: "Run script (with args if applicable)", context: "table", category: "Scripts" },
	{ keys: ["S"], description: "Run script with args (scripts tab)", context: "table", category: "Scripts" },
	{ keys: ["+"], description: "Add script", context: "table", category: "Scripts" },
	{ keys: ["-"], description: "Delete script/folder", context: "table", category: "Scripts" },
	{ keys: ["r"], description: "Refresh scripts", context: "table", category: "Scripts" },

	// ========== table — General ==========
	{ keys: ["A"], description: "Open AI agent view", context: "table", category: "General" },
	{ keys: ["H"], description: "Open SSH host picker", context: "table", category: "General" },
	{ keys: ["Ctrl+Shift+C"], description: "Copy selection to clipboard", context: "table", category: "General" },
	{ keys: ["?"], description: "Show help", context: "table", category: "General" },
	{ keys: ["q"], description: "Quit application", context: "table", category: "General" },

	// ========== mergeRequests ==========
	{ keys: ["j", "k"], description: "Navigate merge requests", context: "mergeRequests", category: "Navigation" },
	{ keys: ["g"], description: "Go to first MR", context: "mergeRequests", category: "Navigation" },
	{ keys: ["G"], description: "Go to last MR", context: "mergeRequests", category: "Navigation" },
	{ keys: ["Enter"], description: "View selected MR detail", context: "mergeRequests", category: "Actions" },
	{ keys: ["/"], description: "Search merge requests", context: "mergeRequests", category: "Actions" },
	{ keys: ["s"], description: "Toggle MR state filter: opened/closed/all", context: "mergeRequests", category: "Actions" },
	{ keys: ["[", "Shift+K"], description: "Previous page", context: "mergeRequests", category: "Actions" },
	{ keys: ["]", "Shift+J"], description: "Next page", context: "mergeRequests", category: "Actions" },
	{ keys: ["Esc"], description: "Back to table", context: "mergeRequests", category: "General" },
	{ keys: ["?"], description: "Show help", context: "mergeRequests", category: "General" },
	{ keys: ["q"], description: "Quit application", context: "mergeRequests", category: "General" },

	// ========== mergeRequestDetail ==========
	{ keys: ["a"], description: "Toggle approval (approve/unapprove)", context: "mergeRequestDetail", category: "Actions" },
	{ keys: ["Shift+A"], description: "AI review — stream review, then post as comment", context: "mergeRequestDetail", category: "Actions" },
	{ keys: ["r"], description: "Rebase merge request", context: "mergeRequestDetail", category: "Actions" },
	{ keys: ["C"], description: "View changed files", context: "mergeRequestDetail", category: "Actions" },
	{ keys: ["D"], description: "View discussions/comments", context: "mergeRequestDetail", category: "Actions" },
	{ keys: ["J"], description: "View pipeline jobs", context: "mergeRequestDetail", category: "Actions" },
	{ keys: ["T"], description: "View detailed test results", context: "mergeRequestDetail", category: "Actions" },
	{ keys: ["I"], description: "View linked issues", context: "mergeRequestDetail", category: "Actions" },
	{ keys: ["Esc"], description: "Return to MR list", context: "mergeRequestDetail", category: "General" },
	{ keys: ["?"], description: "Show help", context: "mergeRequestDetail", category: "General" },
	{ keys: ["q"], description: "Quit application", context: "mergeRequestDetail", category: "General" },

	// ========== jobs ==========
	{ keys: ["↑/↓", "j/k"], description: "Navigate jobs in current stage", context: "jobs", category: "Navigation" },
	{ keys: ["Tab"], description: "Cycle through stages", context: "jobs", category: "Navigation" },
	{ keys: ["v"], description: "View logs for selected job", context: "jobs", category: "Actions" },
	{ keys: ["r"], description: "Retry failed/canceled job", context: "jobs", category: "Actions" },
	{ keys: ["c"], description: "Cancel running/pending job", context: "jobs", category: "Actions" },
	{ keys: ["/"], description: "Search jobs", context: "jobs", category: "Actions" },
	{ keys: ["Esc"], description: "Return to MR detail", context: "jobs", category: "General" },
	{ keys: ["?"], description: "Show help", context: "jobs", category: "General" },
	{ keys: ["q"], description: "Quit application", context: "jobs", category: "General" },

	// ========== testResults ==========
	{ keys: ["j/k"], description: "Navigate up/down through tests", context: "testResults", category: "Navigation" },
	{ keys: ["g"], description: "Go to top of test list", context: "testResults", category: "Navigation" },
	{ keys: ["G"], description: "Go to bottom of test list", context: "testResults", category: "Navigation" },
	{ keys: ["/"], description: "Search tests", context: "testResults", category: "Actions" },
	{ keys: ["Enter"], description: "View test detail (output, stack trace)", context: "testResults", category: "Actions" },
	{ keys: ["c"], description: "Copy test output/stack trace", context: "testResults", category: "Actions" },
	{ keys: ["Esc"], description: "Return to MR detail", context: "testResults", category: "General" },
	{ keys: ["?"], description: "Show help", context: "testResults", category: "General" },
	{ keys: ["q"], description: "Quit application", context: "testResults", category: "General" },

	// ========== changedFiles ==========
	{ keys: ["↑/↓", "j/k"], description: "Navigate changed files", context: "changedFiles", category: "Navigation" },
	{ keys: ["g"], description: "Go to first file", context: "changedFiles", category: "Navigation" },
	{ keys: ["G"], description: "Go to last file", context: "changedFiles", category: "Navigation" },
	{ keys: ["/"], description: "Search files", context: "changedFiles", category: "Actions" },
	{ keys: ["F"], description: "Filter files", context: "changedFiles", category: "Actions" },
	{ keys: ["O"], description: "Order/sort files", context: "changedFiles", category: "Actions" },
	{ keys: ["Enter"], description: "View diff modal", context: "changedFiles", category: "Actions" },
	{ keys: ["D"], description: "Switch to discussions view", context: "changedFiles", category: "Actions" },
	{ keys: ["Esc"], description: "Return to MR detail", context: "changedFiles", category: "General" },
	{ keys: ["?"], description: "Show help", context: "changedFiles", category: "General" },
	{ keys: ["q"], description: "Quit application", context: "changedFiles", category: "General" },

	// ========== discussionsView (Discussions/Comments) ==========
	{ keys: ["j/k", "↑/↓"], description: "Navigate discussions", context: "discussionsView", category: "Navigation" },
	{ keys: ["g"], description: "Go to first discussion", context: "discussionsView", category: "Navigation" },
	{ keys: ["G"], description: "Go to last discussion", context: "discussionsView", category: "Navigation" },
	{ keys: ["r"], description: "Reply to selected discussion", context: "discussionsView", category: "Actions" },
	{ keys: ["x"], description: "Toggle resolve/unresolve discussion", context: "discussionsView", category: "Actions" },
	{ keys: ["c"], description: "Toggle comments-only filter", context: "discussionsView", category: "Actions" },
	{ keys: ["Shift+D"], description: "Open diff for commented file", context: "discussionsView", category: "Actions" },
	{ keys: ["Shift+C"], description: "Switch to changed files view", context: "discussionsView", category: "Actions" },
	{ keys: ["Esc"], description: "Return to MR detail", context: "discussionsView", category: "General" },
	{ keys: ["?"], description: "Show help", context: "discussionsView", category: "General" },
	{ keys: ["q"], description: "Quit application", context: "discussionsView", category: "General" },

	// ========== appDetail ==========
	{ keys: ["Esc"], description: "Return to application table", context: "appDetail", category: "Navigation" },
	{ keys: ["q"], description: "Quit application", context: "appDetail", category: "General" },

	// ========== providers ==========
	{ keys: ["j/k"], description: "Navigate provider list", context: "providers", category: "Navigation" },
	{ keys: ["a"], description: "Add a new provider", context: "providers", category: "Actions" },
	{ keys: ["e"], description: "Edit selected provider", context: "providers", category: "Actions" },
	{ keys: ["d"], description: "Delete selected provider", context: "providers", category: "Actions" },
	{ keys: ["Esc"], description: "Return to table", context: "providers", category: "General" },
	{ keys: ["?"], description: "Show help", context: "providers", category: "General" },
	{ keys: ["q"], description: "Quit application", context: "providers", category: "General" },

	// ========== issues ==========
	{ keys: ["j/k"], description: "Navigate issues", context: "issues", category: "Navigation" },
	{ keys: ["g"], description: "Go to top", context: "issues", category: "Navigation" },
	{ keys: ["G"], description: "Go to bottom", context: "issues", category: "Navigation" },
	{ keys: ["/"], description: "Search issues", context: "issues", category: "Actions" },
	{ keys: ["s"], description: "Toggle issue state filter: open/closed/all", context: "issues", category: "Actions" },
	{ keys: ["Enter"], description: "View issue detail", context: "issues", category: "Actions" },
	{ keys: ["[", "Shift+K"], description: "Previous page", context: "issues", category: "Actions" },
	{ keys: ["]", "Shift+J"], description: "Next page", context: "issues", category: "Actions" },
	{ keys: ["Esc"], description: "Back to table", context: "issues", category: "General" },
	{ keys: ["?"], description: "Show help", context: "issues", category: "General" },
	{ keys: ["q"], description: "Quit application", context: "issues", category: "General" },

	// ========== issueDetail ==========
	{ keys: ["r"], description: "Add comment (reply)", context: "issueDetail", category: "Actions" },
	{ keys: ["c"], description: "Close issue (with reason picker)", context: "issueDetail", category: "Actions" },
	{ keys: ["Shift+C"], description: "Reopen issue", context: "issueDetail", category: "Actions" },
	{ keys: ["Shift+L"], description: "Open label picker", context: "issueDetail", category: "Actions" },
	{ keys: ["a"], description: "Open assignee picker", context: "issueDetail", category: "Actions" },
	{ keys: ["Shift+R"], description: "View references", context: "issueDetail", category: "Actions" },
	{ keys: ["Shift+M"], description: "View linked MRs", context: "issueDetail", category: "Actions" },
	{ keys: ["Shift+I"], description: "View referenced issues", context: "issueDetail", category: "Actions" },
	{ keys: ["t"], description: "Open full timeline view", context: "issueDetail", category: "Actions" },
	{ keys: ["Esc", "q"], description: "Back to issue list", context: "issueDetail", category: "General" },

	// ========== agentView ==========
	{ keys: ["j/k", "↑/↓"], description: "Navigate sessions", context: "agentView", category: "Navigation" },
	{ keys: ["u/d"], description: "Page sessions up/down", context: "agentView", category: "Navigation" },
	{ keys: ["Enter"], description: "Launch or resume session", context: "agentView", category: "Actions" },
	{ keys: ["/"], description: "Search sessions", context: "agentView", category: "Actions" },
	{ keys: ["Esc", "q"], description: "Clear search / close view", context: "agentView", category: "General" },

	// ========== sshPicker ==========
	{ keys: ["j/k", "↑/↓"], description: "Navigate hosts", context: "sshPicker", category: "Navigation" },
	{ keys: ["u/d"], description: "Page hosts up/down", context: "sshPicker", category: "Navigation" },
	{ keys: ["Enter"], description: "Connect to selected host", context: "sshPicker", category: "Actions" },
	{ keys: ["/"], description: "Filter hosts", context: "sshPicker", category: "Actions" },
	{ keys: ["Esc", "q"], description: "Close picker", context: "sshPicker", category: "General" },

	// ========== Log Modal (logStore.showLogModal) ==========
	{ keys: ["j/k"], description: "Up/down (scroll)", context: "logModal", category: "Navigation" },
	{ keys: ["h/l", "←/→"], description: "Scroll left/right", context: "logModal", category: "Navigation" },
	{ keys: ["u/d"], description: "Page up/down", context: "logModal", category: "Navigation" },
	{ keys: ["g/G"], description: "Go to top/bottom", context: "logModal", category: "Navigation" },
	{ keys: ["/"], description: "Search logs", context: "logModal", category: "Actions" },
	{ keys: ["n/p"], description: "Next/prev search match", context: "logModal", category: "Actions" },
	{ keys: ["v"], description: "Toggle visual selection mode", context: "logModal", category: "Actions" },
	{ keys: ["c"], description: "Copy selected line/range", context: "logModal", category: "Actions" },
	{ keys: ["e"], description: "Open log file in $EDITOR", context: "logModal", category: "Actions" },
	{ keys: ["Shift+A"], description: "AI analysis on log selection", context: "logModal", category: "Actions" },
	{ keys: ["Esc"], description: "Close logs", context: "logModal", category: "General" },
	{ keys: ["q"], description: "Quit application", context: "logModal", category: "General" },

	// ========== Passphrase Modal (uiStore.showPassphraseModal) ==========
	{ keys: ["Enter"], description: "Unlock key", context: "passphraseModal", category: "Actions" },
	{ keys: ["Backspace", "Delete"], description: "Delete character", context: "passphraseModal", category: "Actions" },
	{ keys: ["Esc"], description: "Cancel", context: "passphraseModal", category: "General" },

	// ========== Branch Selector ==========
	{ keys: ["j/k", "↑/↓"], description: "Navigate branches", context: "branchSelector", category: "Navigation" },
	{ keys: ["u/d"], description: "Half-page branches up/down", context: "branchSelector", category: "Navigation" },
	{ keys: ["Enter"], description: "Checkout branch / confirm filter", context: "branchSelector", category: "Actions" },
	{ keys: ["/"], description: "Filter branches", context: "branchSelector", category: "Actions" },
	{ keys: ["s"], description: "Switch/checkout selected branch", context: "branchSelector", category: "Actions" },
	{ keys: ["Shift+L"], description: "Open lazygit branch log", context: "branchSelector", category: "Actions" },
	{ keys: ["f"], description: "Git fetch", context: "branchSelector", category: "Actions" },
	{ keys: ["p"], description: "Git pull", context: "branchSelector", category: "Actions" },
	{ keys: ["P"], description: "Git push", context: "branchSelector", category: "Actions" },
	{ keys: ["g"], description: "Open lazygit status", context: "branchSelector", category: "Actions" },
	{ keys: ["Ctrl+N"], description: "Create new branch", context: "branchSelector", category: "Actions" },
	{ keys: ["Esc"], description: "Clear filter / close branch selector", context: "branchSelector", category: "General" },

	// ========== Create Branch Modal ==========
	{ keys: ["Enter"], description: "Create branch", context: "createBranchModal", category: "Actions" },
	{ keys: ["Type"], description: "Edit branch name", context: "createBranchModal", category: "Actions" },
	{ keys: ["Esc"], description: "Cancel", context: "createBranchModal", category: "General" },

	// ========== Diff Modal (mrStore.showDiffModal) ==========
	{ keys: ["j/k"], description: "Navigate diff lines", context: "diffModal", category: "Navigation" },
	{ keys: ["h/l", "←/→"], description: "Scroll left/right", context: "diffModal", category: "Navigation" },
	{ keys: ["[/]", "Shift+K/J"], description: "Previous/next file", context: "diffModal", category: "Navigation" },
	{ keys: ["v"], description: "Toggle visual selection mode", context: "diffModal", category: "Actions" },
	{ keys: ["c"], description: "Create comment on selected line(s)", context: "diffModal", category: "Actions" },
	{ keys: ["r"], description: "Reply to comment at current line", context: "diffModal", category: "Actions" },
	{ keys: ["Shift+R"], description: "Resolve/unresolve discussion", context: "diffModal", category: "Actions" },
	{ keys: ["t"], description: "Toggle collapse/expand thread", context: "diffModal", category: "Actions" },
	{ keys: ["n"], description: "Jump to next comment", context: "diffModal", category: "Actions" },
	{ keys: ["Shift+N"], description: "Jump to previous comment", context: "diffModal", category: "Actions" },
	{ keys: ["s"], description: "Toggle split/staggered view", context: "diffModal", category: "Actions" },
	{ keys: ["e"], description: "Open file in editor at changed line", context: "diffModal", category: "Actions" },
	{ keys: ["Esc"], description: "Close diff modal", context: "diffModal", category: "General" },

	// ========== Worktree Manager Modal ==========
	{ keys: ["j/k", "↑/↓"], description: "Navigate worktrees", context: "worktreeManager", category: "Navigation" },
	{ keys: ["Enter"], description: "Switch to selected worktree", context: "worktreeManager", category: "Actions" },
	{ keys: ["n"], description: "Create new worktree", context: "worktreeManager", category: "Actions" },
	{ keys: ["d"], description: "Delete selected worktree", context: "worktreeManager", category: "Actions" },
	{ keys: ["Esc", "q"], description: "Close worktree manager", context: "worktreeManager", category: "General" },

	// ========== Provider Connect Modal ==========
	{ keys: ["j/k", "↑/↓"], description: "Select provider type", context: "connectProvider", category: "Navigation" },
	{ keys: ["Enter"], description: "Confirm step / save provider", context: "connectProvider", category: "Actions" },
	{ keys: ["Backspace", "Delete"], description: "Delete text while editing", context: "connectProvider", category: "Actions" },
	{ keys: ["Esc"], description: "Go back / cancel", context: "connectProvider", category: "General" },

	// ========== Add App Modal ==========
	{ keys: ["j/k", "↑/↓"], description: "Navigate options/results/branches", context: "addAppModal", category: "Navigation" },
	{ keys: ["Enter"], description: "Confirm step / search / create app", context: "addAppModal", category: "Actions" },
	{ keys: ["Backspace", "Delete"], description: "Delete text while editing", context: "addAppModal", category: "Actions" },
	{ keys: ["Esc"], description: "Go back / cancel", context: "addAppModal", category: "General" },

	// ========== Script Args Modal ==========
	{ keys: ["j/k", "↑/↓"], description: "Navigate parameters / history", context: "scriptArgsModal", category: "Navigation" },
	{ keys: ["h/l", "←/→", "Tab", "Space"], description: "Change boolean or enum value", context: "scriptArgsModal", category: "Actions" },
	{ keys: ["Enter"], description: "Run script", context: "scriptArgsModal", category: "Actions" },
	{ keys: ["Backspace", "Delete"], description: "Delete typed value", context: "scriptArgsModal", category: "Actions" },
	{ keys: ["Esc"], description: "Cancel", context: "scriptArgsModal", category: "General" },

	// ========== Script Add Modal ==========
	{ keys: ["Tab", "j/k", "↑/↓"], description: "Switch field", context: "scriptAddModal", category: "Navigation" },
	{ keys: ["h/l", "←/→", "Space"], description: "Toggle create/link mode", context: "scriptAddModal", category: "Actions" },
	{ keys: ["Enter"], description: "Submit", context: "scriptAddModal", category: "Actions" },
	{ keys: ["Backspace", "Delete"], description: "Delete typed path", context: "scriptAddModal", category: "Actions" },
	{ keys: ["Esc"], description: "Cancel", context: "scriptAddModal", category: "General" },

	// ========== Editor Picker ==========
	{ keys: ["j/k", "↑/↓"], description: "Navigate editors", context: "editorPicker", category: "Navigation" },
	{ keys: ["Enter"], description: "Open with selected editor", context: "editorPicker", category: "Actions" },
	{ keys: ["Esc"], description: "Cancel", context: "editorPicker", category: "General" },

	// ========== issueTimeline ==========
	{ keys: ["j/k", "↑/↓"], description: "Navigate timeline entries", context: "issueTimeline", category: "Navigation" },
	{ keys: ["g"], description: "Go to top", context: "issueTimeline", category: "Navigation" },
	{ keys: ["G"], description: "Go to bottom", context: "issueTimeline", category: "Navigation" },
	{ keys: ["Esc", "q"], description: "Back to issue detail", context: "issueTimeline", category: "General" },

	// ========== Issue scope picker ==========
	{ keys: ["j/k", "↑/↓"], description: "Navigate scopes", context: "issueScopePicker", category: "Navigation" },
	{ keys: ["Enter"], description: "Select scope", context: "issueScopePicker", category: "Actions" },
	{ keys: ["Esc", "q"], description: "Back to table", context: "issueScopePicker", category: "General" },

	// ========== Issue sub-views ==========
	{ keys: ["j/k", "↑/↓"], description: "Navigate list", context: "linkedMRs", category: "Navigation" },
	{ keys: ["g/G"], description: "Go to top/bottom", context: "linkedMRs", category: "Navigation" },
	{ keys: ["Enter"], description: "Open selected MR", context: "linkedMRs", category: "Actions" },
	{ keys: ["Esc", "q"], description: "Back to issue detail", context: "linkedMRs", category: "General" },
	{ keys: ["j/k", "↑/↓"], description: "Navigate list", context: "referencedIssues", category: "Navigation" },
	{ keys: ["g/G"], description: "Go to top/bottom", context: "referencedIssues", category: "Navigation" },
	{ keys: ["Enter"], description: "Open selected issue", context: "referencedIssues", category: "Actions" },
	{ keys: ["Esc", "q"], description: "Back to issue detail", context: "referencedIssues", category: "General" },
	{ keys: ["j/k", "↑/↓"], description: "Navigate list", context: "mrLinkedIssues", category: "Navigation" },
	{ keys: ["g/G"], description: "Go to top/bottom", context: "mrLinkedIssues", category: "Navigation" },
	{ keys: ["Enter"], description: "Open selected issue", context: "mrLinkedIssues", category: "Actions" },
	{ keys: ["Esc", "q"], description: "Back to MR detail", context: "mrLinkedIssues", category: "General" },
	{ keys: ["j/k", "↑/↓"], description: "Navigate references", context: "references", category: "Navigation" },
	{ keys: ["g/G"], description: "Go to top/bottom", context: "references", category: "Navigation" },
	{ keys: ["Enter"], description: "Open selected reference", context: "references", category: "Actions" },
	{ keys: ["Esc", "q"], description: "Back to issue detail", context: "references", category: "General" },

	// ========== First Steps Overlay ==========
	{ keys: ["←/→"], description: "Navigate steps", context: "firstSteps", category: "Navigation" },
	{ keys: ["↑/↓"], description: "Switch row", context: "firstSteps", category: "Navigation" },
	{ keys: ["1-4", "?", "h"], description: "Jump to step by number / open help", context: "firstSteps", category: "Actions" },
	{ keys: ["Enter"], description: "Run selected step", context: "firstSteps", category: "Actions" },
	{ keys: ["Esc"], description: "Dismiss", context: "firstSteps", category: "General" },

	// ========== Help View ==========
	{ keys: ["j/k", "↑/↓"], description: "Scroll keybinds or navigate guides", context: "help", category: "Navigation" },
	{ keys: ["u/d"], description: "Half-page keybind list up/down", context: "help", category: "Navigation" },
	{ keys: ["g/G"], description: "Go to top/bottom of keybind list", context: "help", category: "Navigation" },
	{ keys: ["Tab"], description: "Switch keybindings/guides tab", context: "help", category: "Actions" },
	{ keys: ["/"], description: "Search keybinds", context: "help", category: "Actions" },
	{ keys: ["s"], description: "Toggle current/all-context keybind scope", context: "help", category: "Actions" },
	{ keys: ["Enter"], description: "Open selected guide", context: "help", category: "Actions" },
	{ keys: ["Esc", "?"], description: "Close help / clear search", context: "help", category: "General" },
	{ keys: ["q"], description: "Close help", context: "help", category: "General" },

	// ========== Markdown Modal ==========
	{ keys: ["j/k"], description: "Scroll", context: "markdownModal", category: "Navigation" },
	{ keys: ["u/d"], description: "Half page up/down", context: "markdownModal", category: "Navigation" },
	{ keys: ["g/G"], description: "Go to top/bottom", context: "markdownModal", category: "Navigation" },
	{ keys: ["Esc"], description: "Close", context: "markdownModal", category: "General" },
];
