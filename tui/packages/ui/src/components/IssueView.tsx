import { TextAttributes } from '@opentui/core';

import { Show } from 'solid-js';
import { uiColors } from "../colors";
import type { Issue, IssueScope } from '@devenv/types';
import { ScrollableList, LAYOUT_CHROME_LINES } from "./ScrollableList";
import { CenteredState } from "./CenteredState";
import { SearchHeader } from "./SearchHeader";
import { formatShortDate, getIssueStateColor } from "../statusUtils";
import { WorkItemCard } from "./WorkItemCard";
import { ContentPanel } from "./ContentStack";

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
	state?: string;
	runningTextEnabled?: boolean;
	runningTextOffset?: number;
}

/**
 * IssueView Component - Displays issues as compact cards.
 *
 * PATTERN: Parent-controlled navigation (OpenTUI limitation)
 * - Parent manages selectedIndex state
 * - Parent handles ALL keyboard events via single useKeyboard hook
 * - Child is purely presentational
 */
export function IssueView(props: IssueViewProps) {
	// Lines of fixed chrome outside the list area:
	//   Layout header (2) + Layout footer (3)  = LAYOUT_CHROME_LINES (5)
	//   Top/bottom spacers + summary header    = 3
	const RESERVED_LINES = LAYOUT_CHROME_LINES + 3;

	const stateColor = () => {
		const s = props.state || "open";
		if (s === "open" || s === "opened") return uiColors.success;
		if (s === "closed") return uiColors.error;
		return uiColors.primary; // "all"
	};

	const summary = () => {
		const cp = props.currentPage ?? 1;
		const tp = props.totalPages;
		const scopeLabel = props.scope && props.scope !== "all" ? props.scope : "";
		const stateLabel = props.state || "open";
		const pageLabel = tp && tp > 0 ? `Pg ${cp}/${tp}` : `Pg ${cp}/?`;
		const loadedLabel = `${props.issues.length} loaded`;
		return `${pageLabel}  ${loadedLabel}`;
	};

	return (
		<ContentPanel>
			<Show when={props.loading}>
				<CenteredState message="Loading issues..." color={uiColors.primary} />
			</Show>

			<Show when={!props.loading && props.error}>
				<CenteredState message={props.error!} color={uiColors.error} />
			</Show>

			<Show when={!props.loading && !props.error}>
				<SearchHeader searchMode={props.searchMode} searchQuery={props.searchQuery}>
					<box style={{ width: "100%", flexDirection: "row" }}>
						<text fg={uiColors.textPrimary}>Issues</text>
						<box style={{ width: "auto", flexDirection: "row", gap: 1 }}>
							<Show when={props.scope && props.scope !== "all"}>
								<text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>{`[${props.scope}]`}</text>
							</Show>
							<text fg={stateColor()} attributes={TextAttributes.BOLD}>{`[${props.state ?? "open"}]`}</text>
						</box>
						<box style={{ width: "auto", marginLeft: "auto" }}>
							<text fg={uiColors.textMuted}>{summary()}</text>
						</box>
					</box>
				</SearchHeader>

				<Show when={props.issues.length === 0}
					fallback={
						<ScrollableList<Issue>
							items={props.issues}
							selectedIndex={props.selectedIndex}
							reservedLines={RESERVED_LINES}
							estimatedItemHeight={2}
							showScrollIndicator={false}
							renderItem={(issue, isSelected, index) => {
								const labels = issue.labels ?? [];
								const labelText = labels.length > 0
									? labels.join(", ")
									: "no labels";
								return (
									<WorkItemCard
										marker={`#${issue.iid}`}
										title={issue.title}
										statusText={issue.state}
										statusColor={getIssueStateColor(issue.state)}
										metadata={`@${issue.author.name} • ${labelText} • updated ${formatShortDate(issue.updated_at)}`}
										selected={isSelected()}
										index={index}
										onMouseUp={props.onSelectIssue ? () => props.onSelectIssue!(issue) : undefined}
										runningTextEnabled={props.runningTextEnabled}
										runningTextOffset={props.runningTextOffset}
									/>
								);
							}}
						/>
					}
				>
					<CenteredState message="No issues found" />
				</Show>
			</Show>
		</ContentPanel>
	);
}
