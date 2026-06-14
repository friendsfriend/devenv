import { TextAttributes } from "@opentui/core";
import { Show } from "solid-js";
import { colors, uiColors } from "../colors";
import type { Issue, IssueScope } from "@devenv/types";
import { ScrollableList, LAYOUT_CHROME_LINES } from "./ScrollableList";

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
	const hasSearch = () => (props.searchQuery ?? "").length > 0;

	// Lines of fixed chrome outside the list area:
	//   Layout header (3) + Layout footer (3)  = LAYOUT_CHROME_LINES (6)
	//   Outer rounded border top + bottom      = 2
	//   Table header row                       = 1
	//                                   Total  = 9
	const RESERVED_LINES = LAYOUT_CHROME_LINES + 2 + 1;

	// Format date
	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Get state color
	const getStateColor = (state: string) => {
		switch (state.toLowerCase()) {
			case "open":
			case "opened":
				return uiColors.success;
			case "closed":
				return uiColors.textMuted;
			default:
				return uiColors.textSecondary;
		}
	};

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
			{/* Loading State */}
			<Show when={props.loading}>
				<box
					style={{
						width: "100%",
						height: "100%",
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<text style={{ fg: uiColors.primary }}>Loading issues...</text>
				</box>
			</Show>

			{/* Error State */}
			<Show when={!props.loading && props.error}>
				<box
					style={{
						width: "100%",
						height: "100%",
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<text style={{ fg: uiColors.error }}>{props.error}</text>
				</box>
			</Show>

			{/* Empty State */}
			<Show when={!props.loading && !props.error && props.issues.length === 0}>
				<box
					style={{
						width: "100%",
						height: "100%",
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<text style={{ fg: uiColors.textMuted }}>No issues found</text>
				</box>
			</Show>

			{/* Issue Table */}
			<Show when={!props.loading && !props.error && props.issues.length > 0}>
				{/* Table Header */}
				<box
					backgroundColor={uiColors.bgSurface1}
					style={{
						width: "100%",
						height: 1,
						flexDirection: "row",
						paddingLeft: 1,
						paddingRight: 1,
					}}
				>
					<Show
						when={props.searchMode || hasSearch()}
						fallback={
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
						}
					>
						<box flexDirection="row">
							<text fg={colors.peach}>/</text>
							<text fg={uiColors.textPrimary}>{props.searchQuery ?? ""}</text>
							<Show when={props.searchMode}>
								<text fg={uiColors.primary}>█</text>
							</Show>
						</box>
					</Show>
				</box>

				{/* Table Body — rendered via ScrollableList */}
				<ScrollableList<Issue>
					items={props.issues}
					selectedIndex={props.selectedIndex}
					reservedLines={RESERVED_LINES}
					estimatedItemHeight={1}
					showScrollIndicator={false}
					renderItem={(issue, isSelected) => {
						const stateColor = getStateColor(issue.state);
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
										{issue.title.length > 50
											? issue.title.slice(0, 47) + "..."
											: issue.title}
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
										{formatDate(issue.updated_at)}
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
