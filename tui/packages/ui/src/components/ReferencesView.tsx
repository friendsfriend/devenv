import { Show } from "solid-js";
import type { Issue, MergeRequest } from "@devenv/types";
import { uiColors } from "../colors";
import { ContentPanel } from "./ContentStack";
import { ScrollableList, LAYOUT_CHROME_LINES } from "./ScrollableList";
import { CenteredState } from "./CenteredState";
import { WorkItemCard } from "./WorkItemCard";
import { formatShortDate, getIssueStateColor, truncateText } from "../statusUtils";

type RefItem =
	| { type: "mr"; data: MergeRequest }
	| { type: "issue"; data: Issue };

interface ReferencesViewProps {
	references: RefItem[];
	selectedIndex: number;
	loading: boolean;
	error: string;
	onClose: () => void;
}

/**
 * ReferencesView Component — Full-screen sub-view of combined references (issues + MRs).
 */
export function ReferencesView(props: ReferencesViewProps) {
	// Layout header (2) + footer (3) + panel spacers/header (3).
	const RESERVED_LINES = LAYOUT_CHROME_LINES + 3;

	const typeLabel = (ref: RefItem) => ref.type === "mr" ? "MR" : "Issue";
	const typeColor = (ref: RefItem) => ref.type === "mr" ? uiColors.primary : uiColors.textSecondary;

	return (
		<ContentPanel>
			<Show when={props.loading}>
				<CenteredState message="Loading references..." color={uiColors.primary} />
			</Show>

			<Show when={!props.loading && props.error}>
				<CenteredState message={props.error} color={uiColors.error} />
			</Show>

			<Show when={!props.loading && !props.error}>
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
					<text fg={uiColors.textPrimary}>References</text>
					<box style={{ width: "auto", marginLeft: "auto" }}>
						<text fg={uiColors.textMuted}>{`${props.references.length} loaded`}</text>
					</box>
				</box>

				<Show
					when={props.references.length === 0}
					fallback={
						<ScrollableList<RefItem>
							items={props.references}
							selectedIndex={props.selectedIndex}
							reservedLines={RESERVED_LINES}
							estimatedItemHeight={4}
							showScrollIndicator={false}
							renderItem={(ref, isSelected) => (
								<WorkItemCard
									marker={`${ref.type === "mr" ? "!" : "#"}${ref.data.iid}`}
									prefix={`[${typeLabel(ref)}] `}
									prefixColor={typeColor(ref)}
									title={truncateText(ref.data.title, 80)}
									statusText={ref.data.state}
									statusColor={getIssueStateColor(ref.data.state)}
									metadata={`@${ref.data.author.name} • updated ${formatShortDate(ref.data.updated_at)}`}
									selected={isSelected()}
								/>
							)}
						/>
					}
				>
					<CenteredState message="No references" />
				</Show>
			</Show>
		</ContentPanel>
	);
}
