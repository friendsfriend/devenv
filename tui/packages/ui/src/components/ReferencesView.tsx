import { TextAttributes } from "@opentui/core";
import { For, Show } from "solid-js";
import type { Issue, MergeRequest } from "@devenv/types";
import { uiColors, SCROLLBAR_OPTIONS } from "../colors";
import { ScrollableList, LAYOUT_CHROME_LINES } from "./ScrollableList";

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
	const RESERVED_LINES = LAYOUT_CHROME_LINES + 2 + 1;

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
			case "open":
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
				<box
					style={{
						width: "100%",
						height: "100%",
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<text style={{ fg: uiColors.primary }}>Loading references...</text>
				</box>
			</Show>

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

			<Show
				when={!props.loading && !props.error && props.references.length === 0}
			>
				<box
					style={{
						width: "100%",
						height: "100%",
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<text style={{ fg: uiColors.textMuted }}>No references</text>
				</box>
			</Show>

			<Show
				when={!props.loading && !props.error && props.references.length > 0}
			>
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
					<box style={{ width: 4 }}>
						<text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD} />
					</box>
					<box style={{ width: 8 }}>
						<text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
							ID
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

				<ScrollableList<RefItem>
					items={props.references}
					selectedIndex={props.selectedIndex}
					reservedLines={RESERVED_LINES}
					estimatedItemHeight={1}
					showScrollIndicator={false}
					renderItem={(ref, isSelected) => (
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
							<box style={{ width: 4 }}>
								<text
									fg={
										ref.type === "mr"
											? uiColors.primary
											: uiColors.textSecondary
									}
								>
									{ref.type === "mr" ? "!" : "#"}
								</text>
							</box>
							<box style={{ width: 8 }}>
								<text
									style={{
										fg: isSelected()
											? uiColors.primary
											: uiColors.textSecondary,
									}}
								>
									{ref.data.iid}
								</text>
							</box>
							<box style={{ width: "30%" }}>
								<text
									style={{
										fg: isSelected()
											? uiColors.textPrimary
											: uiColors.textSecondary,
									}}
								>
									{ref.data.title}
								</text>
							</box>
							<box style={{ width: "14%" }}>
								<text style={{ fg: uiColors.textSecondary }}>
									{ref.data.author.name}
								</text>
							</box>
							<box style={{ width: "10%" }}>
								<text style={{ fg: getStateColor(ref.data.state) }}>
									{ref.data.state}
								</text>
							</box>
							<box style={{ width: "14%" }}>
								<text style={{ fg: uiColors.textMuted }}>
									{formatDate(ref.data.updated_at)}
								</text>
							</box>
						</box>
					)}
				/>
			</Show>
		</box>
	);
}
