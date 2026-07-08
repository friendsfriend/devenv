export { Header } from "./components/Header";
export { RunningText, runningTextFrame } from "./components/RunningText";
export type { RunningTextProps } from "./components/RunningText";
export { StatusBar } from "./components/StatusBar";
export { Layout } from "./components/Layout";
export { ContentFrame, ContentStack, ContentPanel, GridLayout } from "./components/ContentStack";
export { Table, RepositoryTable, InfrastructureTable, TaskTable } from "./components/Table";
export { LogView } from "./components/LogView";
export { LogModal } from "./components/LogModal";
export type { LogModalProps } from "./components/LogModal";
export { LogAiOverlay } from "./components/LogAiOverlay";
export type { LogAiOverlayProps } from "./components/LogAiOverlay";
export { CrAiReviewOverlay } from "./components/CrAiReviewOverlay";
export type { CrAiReviewOverlayProps } from "./components/CrAiReviewOverlay";
export { StatusLogView } from "./components/StatusLogView";
export { IssueView } from "./components/IssueView";
export { IssueDetailView } from "./components/IssueDetailView";
export { IssueScopeModal, ISSUE_SCOPE_OPTIONS } from "./components/IssueScopeModal";
export type { IssueScopeOption } from "./components/IssueScopeModal";
export { CloseReasonModal } from "./components/CloseReasonModal";
export { CommentModal } from "./components/CommentModal";
export type { CommentModalProps } from "./components/CommentModal";
export { LabelPickerModal } from "./components/LabelPickerModal";
export type { LabelPickerModalProps } from "./components/LabelPickerModal";
export { AssigneePickerModal } from "./components/AssigneePickerModal";
export type { AssigneePickerModalProps } from "./components/AssigneePickerModal";
export { ChangeRequestView } from "./components/ChangeRequestView";
export { ChangeRequestDetailView } from "./components/ChangeRequestDetailView";
export { TestResultsDetailView } from "./components/TestResultsDetailView";
export { JobsDetailView } from "./components/JobsDetailView";
export { ChangedFilesView } from "./components/ChangedFilesView";
export { ReferencesView } from "./components/ReferencesView";
export { DiscussionsView } from "./components/DiscussionsView";
export { TimelineView, toTimelineItems, commentToItem } from "./components/TimelineView";
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
export { AddRepositoryModal } from "./components/AddRepositoryModal";
export type {
	AddRepositoryModalProps,
	AddRepositoryStep,
	FindRepoMode,
} from "./components/AddRepositoryModal";
export { HelpView } from "./components/HelpView";
export { ThemePickerView } from "./components/ThemePickerView";
export type { ThemePickerViewProps } from "./components/ThemePickerView";
export { ConfirmDialog } from "./components/ConfirmDialog";
export { BranchSelectorView } from "./components/BranchSelectorView";
export { BranchCreateModal } from "./components/BranchCreateModal";
export type { BranchCreateModalProps } from "./components/BranchCreateModal";
export { ErrorDialog } from "./components/ErrorDialog";
export { GenericModal } from "./components/GenericModal";
export { setGlobalSelectionMouseUpHandler } from "./selectionCopy";
export type { SelectionMouseUpHandler } from "./selectionCopy";
export { ModalTabs } from "./components/ModalTabs";
export type { ModalTabsProps, ModalTabItem } from "./components/ModalTabs";
export { FilterModal } from "./components/FilterModal";
export type { FilterModalProps, FilterParameterOption, FilterValueOption } from "./components/FilterModal";
export { SortModal } from "./components/SortModal";
export type { SortModalProps, SortParameterOption, SortDirection } from "./components/SortModal";
export { ListViewModal } from "./components/ListViewModal";
export type { ListViewModalProps } from "./components/ListViewModal";
export { CenteredState } from "./components/CenteredState";
export type { CenteredStateProps } from "./components/CenteredState";
export { SearchHeader } from "./components/SearchHeader";
export type { SearchHeaderProps } from "./components/SearchHeader";
export { DetailSection } from "./components/DetailSection";
export type { DetailSectionProps } from "./components/DetailSection";
export { HighlightedText, highlightColor, highlightForIndex } from "./components/Highlight";
export type { Highlight, HighlightedTextProps } from "./components/Highlight";
export { FilterStatusBar } from "./components/FilterStatusBar";
export type { FilterStatusBarProps } from "./components/FilterStatusBar";
export { Badge } from "./components/Badge";
export type { BadgeProps } from "./components/Badge";
export { MatchedText, splitMatches } from "./components/MatchedText";
export type { MatchedTextProps } from "./components/MatchedText";
export { StatusLogModal } from "./components/StatusLogModal";
export type { StatusLogModalProps } from "./components/StatusLogModal";
export { PropertiesList, propertyBadges } from "./components/PropertiesList";
export type { PropertiesListProps, PropertyBadge, PropertyBadgeListValue, PropertyHighlight, PropertyLayout, PropertyRow, PropertyValue } from "./components/PropertiesList";
export { KubernetesClusterView } from "./components/KubernetesClusterView";
export type { KubernetesClusterViewProps } from "./components/KubernetesClusterView";
export { ResourceTimelineCharts } from "./components/ResourceTimelineCharts";
export type { ResourceTimelineChartsProps, TimelineMetric } from "./components/ResourceTimelineCharts";
export { HelpText, formatHelpText, formatHelpTextLines } from "./components/HelpText";
export { ScrollableContent, allowsKeyboardAxis } from "./components/ScrollableContent";
export type { ScrollableContentProps, ScrollAxis } from "./components/ScrollableContent";
export { AgentSpaceView, getSelectableRows } from "./components/AgentSpaceView";
export type { AgentSpaceViewProps } from "./components/AgentSpaceView";
export { SshHostPickerView } from "./components/SshHostPickerView";
export type { SshHostPickerViewProps } from "./components/SshHostPickerView";
export { PassphraseModal } from "./components/PassphraseModal";
export type { PassphraseModalProps } from "./components/PassphraseModal";
export { ProfilePickerView } from "./components/ProfilePickerView";
export type { ProfilePickerProps } from "./components/ProfilePickerView";
export { ActionTargetPickerView } from "./components/ActionTargetPickerView";
export type { ActionTargetPickerProps } from "./components/ActionTargetPickerView";
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
export { WorkItemCard } from "./components/WorkItemCard";
export type { WorkItemCardProps } from "./components/WorkItemCard";
export { TaskArgsModal } from "./components/TaskArgsModal";
export type { TaskArgsModalProps } from "./components/TaskArgsModal";
export { TaskAddModal } from "./components/TaskAddModal";
export type { TaskAddModalProps } from "./components/TaskAddModal";
export type { HeaderProps } from "./components/Header";
export type { StatusBarProps } from "./components/StatusBar";
export type { LayoutProps } from "./components/Layout";
export type { ContentFrameProps, ContentStackProps, ContentPanelProps, GridLayoutProps, GridColumn } from "./components/ContentStack";
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
export { themeNames, setActiveThemeName, getActiveThemeName, themeColorForTheme, setCustomThemes, setSystemTheme, isThemeJson } from "./theme";
export type { ThemeJson } from "./theme";
export type { CatppuccinColor, UIColor } from "./colors";

// Export markdown syntax style helper
export { getMarkdownSyntaxStyle } from "./markdownSyntax";

// Export HTML-to-text utility
export { gitlabHtmlToMarkdown, containsHtml } from "./utils/gitlabHtml";
export { MarkdownModal } from "./components/MarkdownModal";

// Export status utilities
export {
	getStatusStyle,
	formatStatus,
	getGitStatusStyle,
	formatGitStatus,
	formatShortDate,
	getIssueStateColor,
	getPipelineStatusColor,
	truncateText,
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
