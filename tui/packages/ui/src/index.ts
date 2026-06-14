export { Header } from "./components/Header";
export { StatusBar } from "./components/StatusBar";
export { Layout } from "./components/Layout";
export { Table } from "./components/Table";
export { LogView } from "./components/LogView";
export { LogModal } from "./components/LogModal";
export type { LogModalProps } from "./components/LogModal";
export { LogAiOverlay } from "./components/LogAiOverlay";
export type { LogAiOverlayProps } from "./components/LogAiOverlay";
export { MrAiReviewOverlay } from "./components/MrAiReviewOverlay";
export type { MrAiReviewOverlayProps } from "./components/MrAiReviewOverlay";
export { StatusLogView } from "./components/StatusLogView";
export { IssueView } from "./components/IssueView";
export { IssueDetailView } from "./components/IssueDetailView";
export { IssueScopeModal } from "./components/IssueScopeModal";
export { CloseReasonModal } from "./components/CloseReasonModal";
export { CommentModal } from "./components/CommentModal";
export type { CommentModalProps } from "./components/CommentModal";
export { LabelPickerModal } from "./components/LabelPickerModal";
export type { LabelPickerModalProps } from "./components/LabelPickerModal";
export { AssigneePickerModal } from "./components/AssigneePickerModal";
export type { AssigneePickerModalProps } from "./components/AssigneePickerModal";
export { MergeRequestView } from "./components/MergeRequestView";
export { MergeRequestDetailView } from "./components/MergeRequestDetailView";
export { TestResultsDetailView } from "./components/TestResultsDetailView";
export { JobsDetailView } from "./components/JobsDetailView";
export { ChangedFilesView } from "./components/ChangedFilesView";
export { LinkedMRsView } from "./components/LinkedMRsView";
export { ReferencesView } from "./components/ReferencesView";
export { DiscussionsView } from "./components/DiscussionsView";
export { DiffViewModal } from "./components/DiffViewModal";
export { TestDetailModal } from "./components/TestDetailModal";
export { ProvidersView } from "./components/ProvidersView";
export { AppDetailView } from "./components/AppDetailView";
export type { AppDetailKind } from "./components/AppDetailView";
export { ConnectProviderModal } from "./components/ConnectProviderModal";
export type {
	ConnectProviderModalProps,
	ConnectProviderStep,
} from "./components/ConnectProviderModal";
export { AddAppModal } from "./components/AddAppModal";
export type {
	AddAppModalProps,
	AddAppStep,
	FindRepoMode,
} from "./components/AddAppModal";
export { HelpView } from "./components/HelpView";
export { ConfirmDialog } from "./components/ConfirmDialog";
export { BranchSelectorView } from "./components/BranchSelectorView";
export { BranchCreateModal } from "./components/BranchCreateModal";
export type { BranchCreateModalProps } from "./components/BranchCreateModal";
export { ErrorDialog } from "./components/ErrorDialog";
export { GenericModal } from "./components/GenericModal";
export { ListViewModal } from "./components/ListViewModal";
export type { ListViewModalProps } from "./components/ListViewModal";
export { HelpText, formatHelpText } from "./components/HelpText";
export { AgentSpaceView, getSelectableRows } from "./components/AgentSpaceView";
export type { AgentSpaceViewProps } from "./components/AgentSpaceView";
export { SshHostPickerView } from "./components/SshHostPickerView";
export type { SshHostPickerViewProps } from "./components/SshHostPickerView";
export { PassphraseModal } from "./components/PassphraseModal";
export type { PassphraseModalProps } from "./components/PassphraseModal";
export { ProfilePickerView } from "./components/ProfilePickerView";
export type { ProfilePickerProps } from "./components/ProfilePickerView";
export {
	EditorPickerView,
	EDITOR_OPTIONS,
} from "./components/EditorPickerView";
export type {
	EditorPickerViewProps,
	EditorChoice,
	EditorOption,
} from "./components/EditorPickerView";
export { WorktreeManagerModal } from "./components/WorktreeManagerModal";
export type { WorktreeManagerModalProps } from "./components/WorktreeManagerModal";
export { ScriptArgsModal } from "./components/ScriptArgsModal";
export type { ScriptArgsModalProps } from "./components/ScriptArgsModal";
export { ScriptAddModal } from "./components/ScriptAddModal";
export type { ScriptAddModalProps } from "./components/ScriptAddModal";
export type { HeaderProps } from "./components/Header";
export type { StatusBarProps } from "./components/StatusBar";
export type { LayoutProps } from "./components/Layout";
export type { TableProps, TableColumn, TableTab } from "./components/Table";
export type { LogViewProps } from "./components/LogView";
export type { StatusLogViewProps } from "./components/StatusLogView";
export type { HelpViewProps, HelpSection } from "./components/HelpView";
export type { ConfirmDialogProps } from "./components/ConfirmDialog";
export type {
	BranchSelectorProps,
	BranchInfo,
} from "./components/BranchSelectorView";
export type { ErrorDialogProps } from "./components/ErrorDialog";
export type { GenericModalProps } from "./components/GenericModal";
export type { HelpTextProps, HelpEntry } from "./components/HelpText";

// Export color scheme
export { colors, uiColors, SCROLLBAR_OPTIONS } from "./colors";
export type { CatppuccinColor, UIColor } from "./colors";

// Export markdown syntax style helper
export { getMarkdownSyntaxStyle } from "./markdownSyntax";

// Export HTML-to-text utility
export { gitlabHtmlToMarkdown, containsHtml } from "./utils/gitlabHtml";

// Export status utilities
export {
	getStatusStyle,
	formatStatus,
	getGitStatusStyle,
	formatGitStatus,
} from "./statusUtils";
export type { StatusStyle } from "./statusUtils";

// Export virtual scroll utility
export { calculateVisibleItems } from "./utils/virtualScroll";
export type {
	VirtualScrollOptions,
	VisibleItem,
	VirtualScrollResult,
} from "./utils/virtualScroll";

// Export universal scrollable list primitive
export {
	ScrollableList,
	LAYOUT_CHROME_LINES,
} from "./components/ScrollableList";
export type { ScrollableListProps } from "./components/ScrollableList";

// Export Knight Rider spinner utilities
export {
	createFrames,
	createColors,
	deriveTrailColors,
	deriveInactiveColor,
} from "./spinner";
export type { KnightRiderOptions, KnightRiderStyle } from "./spinner";

// Export ANSI escape sequence utilities
export { ansiToStyledText, stripAnsi } from "./ansiToStyledText";
