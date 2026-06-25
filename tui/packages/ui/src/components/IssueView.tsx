import { TextAttributes } from "@opentui/core";
import { Show } from "solid-js";
import { uiColors } from "../colors";
import type { Issue, IssueScope } from "@devenv/types";
import { ScrollableList, LAYOUT_CHROME_LINES } from "./ScrollableList";
import { CenteredState } from "./CenteredState";
import { SearchHeader } from "./SearchHeader";
import { formatShortDate, getIssueStateColor, truncateText } from "../statusUtils";

interface IssueViewProps {
	issues: Issue[];
	selectedIndex: number;
	onClose?: () => void;
	onSelectIssue?: (issue: Issue) => void;
	loading?: boolean;
	error?: string;
	searchMode?: boolean;
	searchQuery?: string;
	currentPage?: number;
	totalPages?: number;
	totalCount?: number;
	scope?: IssueScope;
}

/**
 * IssueView Component - Displays issues in table format
 * Matches the styling of the Table and MergeRequestView components.
 *
 * PATTERN: Parent-controlled navigation (OpenTUI limitation)
 * - Parent manages selectedIndex state
 * - Parent handles ALL keyboard events via single useKeyboard hook
 * - Child is purely presentational
 */
export function IssueView(props: IssueViewProps) {
	// Lines of fixed chrome outside the list area:
	//   Layout header (2) + Layout footer (3)  = LAYOUT_CHROME_LINES (5)
	//   Outer rounded border top + bottom      = 2
	//   Table header row                       = 1
	//                                   Total  = 9
	const RESERVED_LINES = LAYOUT_CHROME_LINES + 2 + 1;

	return (
		<box
			border={true}
			borderStyle="rounded"
			borderColor={uiColors.textMuted}
			style={{
				width: "100%",
				height: "100%",
				flexDirection: "column",
			}}
		>
			<Show when={props.loading}>
				<CenteredState message="Loading issues..." color={uiColors.primary} />
			</Show>

			<Show when={!props.loading && props.error}>
				<CenteredState message={props.error!} color={uiColors.error} />
			</Show>

			<Show when={!props.loading && !props.error && props.issues.length === 0}>
				<CenteredState message="No issues found" />
			</Show>

			{/* Issue Table */}
			<Show when={!props.loading && !props.error && props.issues.length > 0}>
				{/* Table Header */}
				<SearchHeader searchMode={props.searchMode} searchQuery={props.searchQuery}>
							<>
								<box style={{ width: 8 }}>
									<text
										fg={uiColors.textPrimary}
										attributes={TextAttributes.BOLD}
									>
										#ID
									</text>
								</box>
								<box style={{ width: "35%" }}>
									<text
										fg={uiColors.textPrimary}
										attributes={TextAttributes.BOLD}
									>
										Title
									</text>
								</box>
								<box style={{ width: "14%" }}>
									<text
										fg={uiColors.textPrimary}
										attributes={TextAttributes.BOLD}
									>
										Author
									</text>
								</box>
								<box style={{ width: "10%" }}>
									<text
										fg={uiColors.textPrimary}
										attributes={TextAttributes.BOLD}
									>
										State
									</text>
								</box>
								<box style={{ width: "15%" }}>
									<text
										fg={uiColors.textPrimary}
										attributes={TextAttributes.BOLD}
									>
										Labels
									</text>
								</box>
								<box style={{ width: "14%" }}>
									<text
										fg={uiColors.textPrimary}
										attributes={TextAttributes.BOLD}
									>
										Updated
									</text>
								</box>
								<box style={{ width: "auto", marginLeft: "auto" }}>
									<text fg={uiColors.textMuted}>
										{(() => {
											const cp = props.currentPage ?? 1;
											const tp = props.totalPages;
											const scopeLabel =
												props.scope && props.scope !== "all" ? props.scope : "";
											const pageLabel =
												tp && tp > 0 ? `Pg ${cp}/${tp}` : `Pg ${cp}/?`;
											if (scopeLabel) return `[${scopeLabel}] [${pageLabel}]`;
											return `[${pageLabel}]`;
										})()}
									</text>
								</box>
							</>
					</SearchHeader>

				{/* Table Body — rendered via ScrollableList */}
				<ScrollableList<Issue>
					items={props.issues}
					selectedIndex={props.selectedIndex}
					reservedLines={RESERVED_LINES}
					estimatedItemHeight={1}
					showScrollIndicator={false}
					renderItem={(issue, isSelected) => {
						const stateColor = getIssueStateColor(issue.state);
						return (
							<box
								backgroundColor={isSelected() ? uiColors.bgSurface2 : undefined}
								style={{
									width: "100%",
									height: 1,
									flexDirection: "row",
									paddingLeft: 1,
									paddingRight: 1,
								}}
							>
								<box style={{ width: 8 }}>
									<text
										style={{
											fg: isSelected()
												? uiColors.primary
												: uiColors.textSecondary,
										}}
									>
										#{issue.iid}
									</text>
								</box>
								<box style={{ width: "35%" }}>
									<text
										style={{
											fg: isSelected()
												? uiColors.textPrimary
												: uiColors.textSecondary,
										}}
									>
										{truncateText(issue.title, 50)}
									</text>
								</box>
								<box style={{ width: "14%" }}>
									<text style={{ fg: uiColors.textSecondary }}>
										{issue.author.name}
									</text>
								</box>
								<box style={{ width: "10%" }}>
									<text style={{ fg: stateColor }}>{issue.state}</text>
								</box>
								<box style={{ width: "15%" }}>
									<text style={{ fg: uiColors.textSecondary }}>
										{(issue.labels ?? []).length > 0
											? (issue.labels ?? []).slice(0, 2).join(", ") +
												((issue.labels ?? []).length > 2 ? "…" : "")
											: "-"}
									</text>
								</box>
								<box style={{ width: "14%" }}>
									<text style={{ fg: uiColors.textMuted }}>
										{formatShortDate(issue.updated_at)}
									</text>
								</box>
							</box>
						);
					}}
				/>
			</Show>
		</box>
	);
}
