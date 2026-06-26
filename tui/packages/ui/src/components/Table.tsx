import { For, Show, type JSX } from "solid-js";
import { TextAttributes } from "@opentui/core";
import type { App } from "@devenv/types";
import { uiColors } from "../colors";
import { CenteredState } from "./CenteredState";
import { ScrollableList, LAYOUT_CHROME_LINES } from "./ScrollableList";
import { SearchHeader } from "./SearchHeader";

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
	const getColumnWidth = (width: number | string): any => {
		if (typeof width === "string" && width.endsWith("%")) {
			return { width };
		}
		return { width };
	};

	const getCellValue = (app: App, column: TableColumn): string => {
		if (column.render) {
			return column.render(app);
		}
		return String((app as any)[column.key] || "");
	};

	const getCellColor = (
		app: App,
		column: TableColumn,
		isSelected: boolean,
	): string => {
		if (column.color) {
			return column.color(app);
		}
		return isSelected ? uiColors.textPrimary : uiColors.textSecondary;
	};

	const isSelected = (index: number) => index === props.selectedIndex;

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
		lines -= 1; // column header
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

			{/* Table Header row — doubles as search input bar while searchMode is active */}
			<SearchHeader searchMode={props.searchMode} searchQuery={props.searchQuery} resultCount={props.apps.length}>
				<For each={props.columns}>
					{(column) => (
						<box style={getColumnWidth(column.width)}>
							<text
								fg={uiColors.textPrimary}
								attributes={TextAttributes.BOLD}
							>
								{column.header}
							</text>
						</box>
					)}
				</For>
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
					estimatedItemHeight={1}
					showScrollIndicator={false}
					renderItem={(app, isSelected, index) => (
						<box
							backgroundColor={isSelected() ? uiColors.bgSurface2 : undefined}
							onMouseUp={() => props.onSelect?.(index)}
							style={{
								width: "100%",
								height: 1,
								flexDirection: "row",
								paddingLeft: 1,
								paddingRight: 1,
							}}
						>
							<For each={props.columns}>
								{(column) => (
									<box style={getColumnWidth(column.width)}>
										<Show
											when={column.renderParts}
											fallback={
												<text
													style={{
														fg: getCellColor(app, column, isSelected()),
													}}
												>
													{getCellValue(app, column)}
												</text>
											}
										>
											<box style={{ flexDirection: "row" }}>
												<For
													each={column.renderParts?.(app, isSelected()) ?? []}
												>
													{(part) => (
														<text
															fg={
																part.color ??
																getCellColor(app, column, isSelected())
															}
														>
															{part.text}
														</text>
													)}
												</For>
											</box>
										</Show>
									</box>
								)}
							</For>
						</box>
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
