import { TextAttributes } from "@opentui/core";
import { Show } from "solid-js";
import { useTerminalDimensions } from '@opentui/solid';
import type { MergeRequest } from "@devenv/types";
import { uiColors } from "../colors";
import { ContentPanel } from "./ContentStack";
import { ScrollableList, LAYOUT_CHROME_LINES } from "./ScrollableList";
import { RunningText } from './RunningText';

interface LinkedMRsViewProps {
	mergeRequests: MergeRequest[];
	selectedIndex: number;
	loading: boolean;
	error: string;
	onClose: () => void;
	runningTextEnabled?: boolean;
	runningTextOffset?: number;
}

/**
 * LinkedMRsView Component — Full-screen sub-view of linked merge requests.
 * Matches the pattern of ChangedFilesView/JobsDetailView.
 */
export function LinkedMRsView(props: LinkedMRsViewProps) {
	const RESERVED_LINES = LAYOUT_CHROME_LINES + 2 + 1;
	const dimensions = useTerminalDimensions();
	const titleWidth = () => Math.max(1, Math.floor(dimensions().width * 0.3) - 2);

	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const getStateColor = (state: string) => {
		switch (state.toLowerCase()) {
			case "opened":
				return uiColors.success;
			case "merged":
				return uiColors.primary;
			case "closed":
				return uiColors.textMuted;
			default:
				return uiColors.textSecondary;
		}
	};

	return (
		<ContentPanel>
			{/* Loading */}
			<Show when={props.loading}>
				<box
					style={{
						width: "100%",
						height: "100%",
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<text style={{ fg: uiColors.primary }}>
						Loading linked merge requests...
					</text>
				</box>
			</Show>

			{/* Error */}
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

			{/* Empty */}
			<Show
				when={
					!props.loading && !props.error && props.mergeRequests.length === 0
				}
			>
				<box
					style={{
						width: "100%",
						height: "100%",
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<text style={{ fg: uiColors.textMuted }}>
						No linked merge requests
					</text>
				</box>
			</Show>

			{/* Table */}
			<Show
				when={!props.loading && !props.error && props.mergeRequests.length > 0}
			>
				{/* Header */}
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
					<box style={{ width: 8 }}>
						<text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
							!ID
						</text>
					</box>
					<box style={{ width: "30%" }}>
						<text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
							Title
						</text>
					</box>
					<box style={{ width: "14%" }}>
						<text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
							Author
						</text>
					</box>
					<box style={{ width: "10%" }}>
						<text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
							State
						</text>
					</box>
					<box style={{ width: "14%" }}>
						<text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
							Updated
						</text>
					</box>
				</box>

				<ScrollableList<MergeRequest>
					items={props.mergeRequests}
					selectedIndex={props.selectedIndex}
					reservedLines={RESERVED_LINES}
					estimatedItemHeight={1}
					showScrollIndicator={false}
					renderItem={(mr, isSelected) => (
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
									!{mr.iid}
								</text>
							</box>
							<box style={{ width: "30%" }}>
								<RunningText
									text={mr.title}
									width={titleWidth()}
									fg={isSelected() ? uiColors.textPrimary : uiColors.textSecondary}
									enabled={props.runningTextEnabled}
									active={isSelected()}
									offset={props.runningTextOffset}
								/>
							</box>
							<box style={{ width: "14%" }}>
								<text style={{ fg: uiColors.textSecondary }}>
									{mr.author.name}
								</text>
							</box>
							<box style={{ width: "10%" }}>
								<text style={{ fg: getStateColor(mr.state) }}>{mr.state}</text>
							</box>
							<box style={{ width: "14%" }}>
								<text style={{ fg: uiColors.textMuted }}>
									{formatDate(mr.updated_at)}
								</text>
							</box>
						</box>
					)}
				/>
			</Show>
</ContentPanel>
	);
}
