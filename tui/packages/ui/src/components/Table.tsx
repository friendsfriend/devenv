import { For, Show, type JSX } from "solid-js";
import { TextAttributes } from "@opentui/core";
import type { App } from "@devenv/types";
import { uiColors } from "../colors";
import { CenteredState } from "./CenteredState";
import { ScrollableList, LAYOUT_CHROME_LINES } from "./ScrollableList";
import { SearchHeader } from "./SearchHeader";
import { WorkItemCard } from "./WorkItemCard";
import { formatStatus, getGitStatusStyle, getStatusStyle } from "../statusUtils";

export interface TableColumn {
	key: string;
	header: string;
	width: number | string;
	render?: (app: App) => string;
	renderParts?: (
		app: App,
		isSelected: boolean,
	) => Array<{ text: string; color?: string }>;
	color?: (app: App) => string; // Optional color function for styled rendering
}

export interface TableTab<T = string> {
	id: T;
	label: string;
	count?: number; // Optional count to display after label
}

export interface TableProps<T = string> {
	apps: App[];
	columns: TableColumn[];
	selectedIndex: number;
	onSelect?: (index: number) => void;
	showBorder?: boolean; // Optional: show border around table (default true)

	// Optional tabs feature
	tabs?: TableTab<T>[];
	activeTab?: T;
	onTabChange?: (tabId: T) => void;
	getTabBorderColor?: (tabId: T) => string; // Function to get border color for each tab

	// Search
	searchMode?: boolean; // true while user is typing after /
	searchQuery?: string; // current query string (empty = no active search)

	/** Optional: total lines available for this component before its own chrome (border, tabs, header).
	 *  When provided, `reservedLines` is ignored and the list height is computed from this value
	 *  minus the Table's own chrome.  Used when the Table shares the content area with other elements
	 *  (e.g. StatusLogView) so the caller can communicate the exact height budget. */
	availableLines?: number;
	spinnerFrames?: string[];
	spinnerFrame?: () => number;
	runningTextEnabled?: boolean;
	runningTextOffset?: number;
}

/**
 * Table component for displaying applications
 * Uses OpenTUI's flexbox layout system
 *
 * Features:
 * - Column-based table rendering with customizable widths
 * - Optional tabs with customizable border colors
 * - Optional outer border (showBorder prop)
 * - Keyboard navigation support
 * - / search: filters rows (no highlighting)
 */
export function Table<T = string>(props: TableProps<T>) {
	const providerIcon = (app: App) => {
		if (app.sourceType === "github") return "";
		if (app.sourceType === "gitlab") return "";
		return "?";
	};

	const activeTabLabel = () =>
		props.tabs?.find((tab) => tab.id === props.activeTab)?.label ?? "Applications";

	const isRunning = (app: App) => {
		if (app.operationStatus?.status === "active") return true;
		const status = app.dockerInfo?.Status?.toLowerCase() || "";
		return status.includes("up") || status.includes("running") || status.includes("healthy");
	};

	const runningSummary = () => `${props.apps.filter(isRunning).length}/${props.apps.length} running`;

	const appKind = (app: App) => {
		if (app.resourceType === "script-folder") return "Folder";
		if (app.resourceType === "script-file") return "Script";
		if (!app.localDirectoryPath && app.containerBaseName) return "Infra";
		return app.appType === "APP" ? "App" : "Lib";
	};

	const appMarker = (app: App) => {
		if (app.resourceType === "script-folder") return app.scriptExpanded ? "▾" : "▸";
		if (app.resourceType === "script-file") return "󱆃";
		if (!app.localDirectoryPath && app.containerBaseName) return "▣";
		return app.appType === "APP" ? "◆" : "◇";
	};

	const appStatus = (app: App) => {
		if (app.operationStatus?.status && app.operationStatus.message) {
			if (app.operationStatus.status === "active" && props.spinnerFrames && props.spinnerFrame) {
				return `${props.spinnerFrames[props.spinnerFrame()]} ${app.operationStatus.message}`;
			}
			return app.operationStatus.message;
		}
		if (app.resourceType === "script-folder") return "folder";
		if (app.resourceType === "script-file") return app.scriptExecutable ? "executable" : "script";
		return formatStatus(app.dockerInfo?.Status || "not found");
	};

	const gitStatus = (app: App) => app.gitStatus?.trim() || "...";

	const gitStatusText = (app: App) => {
		const status = gitStatus(app);
		if (status === "✓") return "git clean";
		if (status === "x") return "git unavailable";
		if (status === "error") return "git error";
		if (status === "...") return "git unknown";
		return `git ${status}`;
	};

	const appStatusSuffix = (app: App) => {
		if (app.resourceType === "script-folder" || app.resourceType === "script-file") {
			return app.interpreter ? ` • ${app.interpreter}` : "";
		}
		const details = [gitStatusText(app), app.branch ? `branch ${app.branch}` : undefined, app.dockerInfo?.Ports].filter(Boolean).join(" • ");
		return details ? ` • ${details}` : "";
	};

	const appStatusColor = (app: App) => {
		if (app.operationStatus?.status) {
			switch (app.operationStatus.status) {
				case "active": return uiColors.primary;
				case "completed": return uiColors.success;
				case "failed": return uiColors.error;
				case "pending": return uiColors.warning;
				default: return uiColors.textPrimary;
			}
		}
		if (app.resourceType === "script-folder" || app.resourceType === "script-file") return uiColors.textSecondary;
		return getStatusStyle(app.dockerInfo?.Status || "not found").color;
	};

	const appMetadata = (app: App) => {
		if (app.resourceType === "script-folder") return app.scriptRelativePath || app.localDirectoryPath;
		if (app.resourceType === "script-file") {
			const params = app.scriptParameters?.length ?? 0;
			return `${app.scriptRelativePath || app.localDirectoryPath}${params ? ` • ${params} params` : ""}`;
		}
		if (!app.localDirectoryPath && app.containerBaseName) {
			return [app.containerBaseName, app.dockerInfo?.Ports].filter(Boolean).join(" • ");
		}

		const isLinkedWorktree = app.activeWorktree && app.activeWorktree !== app.mainWorktreeBranch;
		return [
			`${providerIcon(app)} ${app.provider || app.sourceType || "repo"}`,
			gitStatusText(app),
			isLinkedWorktree ? `worktree ${app.activeWorktree}` : undefined,
			app.dockerInfo?.Ports,
			app.repositoryPath,
		].filter(Boolean).join(" • ");
	};

	/**
	 * Lines of fixed chrome outside the table body.
	 * Auto-computed from props so callers never need to pass a magic number:
	 *
	 *   Layout chrome                    = LAYOUT_CHROME_LINES (7)
	 *   Outer rounded border (if shown)  = 2
	 *   Tab bar (if tabs present)        = 3
	 *   Table column-header row          = 1
	 */
	// When caller provides an exact height budget (e.g. content-router knows
	// Layout chrome + StatusLogView consumption), subtract Table's own chrome
	// and pass the remainder to ScrollableList via availableLines.
	const scrollableLines = (): number | undefined => {
		if (props.availableLines === undefined) return undefined;
		let lines = props.availableLines;
		if (props.showBorder !== false) lines -= 2;
		if (props.tabs && props.tabs.length > 0) lines -= 3;
		lines -= 1; // list header
		return Math.max(1, lines);
	};

	// Legacy reserved-lines path (fallback when no availableLines is given).
	const reservedLines = () => {
		let lines = LAYOUT_CHROME_LINES + 1;
		if (props.showBorder !== false) lines += 2;
		if (props.tabs && props.tabs.length > 0) lines += 3;
		return lines;
	};

	const hasSearch = () => (props.searchQuery ?? "").length > 0;

	const tableContent = () => (
		<box
			style={{
				width: "100%",
				flexGrow: 1,
				minHeight: 0,
				flexDirection: "column",
			}}
		>
			{/* Optional Tabs */}
			<Show when={props.tabs && props.tabs.length > 0}>
				<box
					backgroundColor={uiColors.bgBase}
					style={{
						width: "100%",
						flexDirection: "row",
						gap: 1,
					}}
				>
					<For each={props.tabs}>
						{(tab) => {
							const isActive = () => props.activeTab === tab.id;
							return (
								<box
									backgroundColor={isActive() ? uiColors.bgSurface0 : uiColors.bgMantle}
									onMouseUp={() => props.onTabChange?.(tab.id)}
									style={{
										paddingLeft: 2,
										paddingRight: 2,
										height: 3,
										alignItems: "center",
										justifyContent: "center",
									}}
								>
									<text
										fg={isActive() ? uiColors.primary : uiColors.textMuted}
										attributes={isActive() ? TextAttributes.BOLD : undefined}
									>
										{tab.label}
										{tab.count !== undefined ? ` (${tab.count})` : ""}
									</text>
								</box>
							);
						}}
					</For>
				</box>
			</Show>

			{/* Header row — doubles as search input bar while searchMode is active */}
			<SearchHeader searchMode={props.searchMode} searchQuery={props.searchQuery} resultCount={props.apps.length}>
				<box style={{ width: "100%", flexDirection: "row" }}>
					<text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>{activeTabLabel()}</text>
					<box style={{ width: "auto", marginLeft: "auto", flexDirection: "row", gap: 2 }}>
						<text fg={uiColors.success} attributes={TextAttributes.BOLD}>{runningSummary()}</text>
						<text fg={uiColors.textMuted}>{`${props.apps.length} loaded`}</text>
					</box>
				</box>
			</SearchHeader>

			{/* Table Body — virtual scroll keeps selected row always visible */}
			<Show
				when={props.apps.length > 0}
				fallback={
					<CenteredState
						message={hasSearch() ? "No results" : "No applications in this tab"}
						height="auto"
						style={{ flexGrow: 1 }}
					/>
				}
			>
				<ScrollableList<App>
					items={props.apps}
					selectedIndex={props.selectedIndex}
					availableLines={scrollableLines()}
					reservedLines={
						props.availableLines === undefined ? reservedLines() : undefined
					}
					estimatedItemHeight={4}
					showScrollIndicator={false}
					renderItem={(app, isSelected, index) => (
						<WorkItemCard
							marker={appMarker(app)}
							prefix={`[${appKind(app)}] `}
							prefixColor={app.appType === "APP" ? uiColors.primary : uiColors.textSecondary}
							title={app.displayName}
							statusText={appStatus(app)}
							statusColor={appStatusColor(app)}
							statusAttributes={TextAttributes.BOLD}
							statusSuffixText={appStatusSuffix(app)}
							statusSuffixColor={getGitStatusStyle(gitStatus(app)).color}
							metadata={appMetadata(app)}
							selected={isSelected()}
							runningTextEnabled={props.runningTextEnabled}
							runningTextOffset={props.runningTextOffset}
							onMouseUp={() => props.onSelect?.(index)}
						/>
					)}
				/>
			</Show>
		</box>
	);

	// If showBorder is false, render content directly without wrapper box
	return props.showBorder === false ? (
		tableContent()
	) : (
		<box
			backgroundColor={uiColors.bgMantle}
			style={{
				width: "100%",
				flexGrow: 1,
				minHeight: 0,
				flexDirection: "column",
			}}
		>
			{tableContent()}
		</box>
	);
}
