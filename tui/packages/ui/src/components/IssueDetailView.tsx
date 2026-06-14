import { TextAttributes } from "@opentui/core";
import { For, Show } from "solid-js";
import type { Issue, IssueComment } from "@devenv/types";
import { uiColors, SCROLLBAR_OPTIONS } from "../colors";

interface IssueDetailViewProps {
	issue: Issue;
	comments: IssueComment[];
	issueCommentsLoading: boolean;
	error: string;
}

/**
 * IssueDetailView Component - Shows detailed issue information
 * Styled to match MergeRequestDetailView pattern: bordered panel, scrollable content,
 * metadata with bold muted labels and colored values.
 */
export function IssueDetailView(props: IssueDetailViewProps) {
	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	};

	const issue = () => props.issue;

	return (
		<box
			style={{
				width: "100%",
				height: "100%",
				flexDirection: "column",
				gap: 0,
			}}
		>
			{/* METADATA PANEL */}
			<box
				border={true}
				borderStyle="rounded"
				borderColor={uiColors.textMuted}
				style={{
					width: "100%",
					flexGrow: 1,
					flexBasis: 0,
					flexDirection: "column",
					overflow: "hidden",
				}}
			>
				{/* Title - Fixed header outside scrollbox */}
				<box style={{ paddingLeft: 1, paddingRight: 1, flexShrink: 0 }}>
					<text fg={uiColors.borderHighlight} attributes={TextAttributes.BOLD}>
						{issue().title}
					</text>
				</box>

				{/* Scrollable content */}
				<scrollbox
					scrollbarOptions={SCROLLBAR_OPTIONS}
					style={{
						width: "100%",
						flexGrow: 1,
						minHeight: 0,
					}}
				>
					{/* State */}
					<box
						style={{
							flexDirection: "row",
							paddingLeft: 1,
							paddingRight: 1,
						}}
					>
						<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
							State:{" "}
						</text>
						<text
							fg={
								issue().state === "open" || issue().state === "opened"
									? uiColors.success
									: uiColors.textMuted
							}
							attributes={TextAttributes.BOLD}
						>
							{issue().state}
						</text>
					</box>

					{/* Author */}
					<box
						style={{
							flexDirection: "row",
							paddingLeft: 1,
							paddingRight: 1,
						}}
					>
						<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
							Author:{" "}
						</text>
						<text fg={uiColors.textPrimary}>
							{issue().author.name}
							{/* Don't have username in IssueAuthor yet */}
						</text>
					</box>

					{/* Labels */}
					<Show when={(issue().labels ?? []).length > 0}>
						<box
							style={{
								flexDirection: "row",
								paddingLeft: 1,
								paddingRight: 1,
							}}
						>
							<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
								Labels:{" "}
							</text>
							<text fg={uiColors.textSecondary}>
								{(issue().labels ?? []).join(", ")}
							</text>
						</box>
					</Show>

					{/* Assignees */}
					<Show when={(issue().assignees ?? []).length > 0}>
						<box
							style={{
								flexDirection: "row",
								paddingLeft: 1,
								paddingRight: 1,
							}}
						>
							<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
								Assignees:{" "}
							</text>
							<For each={issue().assignees ?? []}>
								{(a) => (
									<text fg={uiColors.primary}>
										{a.name}
										{a !==
										(issue().assignees ?? [])[
											(issue().assignees ?? []).length - 1
										]
											? ", "
											: ""}
									</text>
								)}
							</For>
						</box>
					</Show>

					{/* Milestone */}
					<Show when={issue().milestone != null}>
						<box
							style={{
								flexDirection: "row",
								paddingLeft: 1,
								paddingRight: 1,
							}}
						>
							<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
								Milestone:{" "}
							</text>
							<text fg={uiColors.textSecondary}>
								{issue().milestone!.title}
							</text>
						</box>
					</Show>

					{/* Created */}
					<box
						style={{
							flexDirection: "row",
							paddingLeft: 1,
							paddingRight: 1,
						}}
					>
						<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
							Created:{" "}
						</text>
						<text fg={uiColors.textSecondary}>
							{formatDate(issue().created_at)}
						</text>
					</box>

					{/* Updated */}
					<box
						style={{
							flexDirection: "row",
							paddingLeft: 1,
							paddingRight: 1,
						}}
					>
						<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
							Updated:{" "}
						</text>
						<text fg={uiColors.textSecondary}>
							{formatDate(issue().updated_at)}
						</text>
					</box>

					{/* Description */}
					<Show when={issue().description && issue().description.trim() !== ""}>
						<box style={{ marginTop: 1, paddingLeft: 1, paddingRight: 1 }}>
							<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
								Description:
							</text>
						</box>
						<box style={{ paddingLeft: 3, paddingRight: 1 }}>
							<text fg={uiColors.textSecondary}>{issue().description}</text>
						</box>
					</Show>

					{/* URL */}
					<box
						style={{
							marginTop: 1,
							flexDirection: "row",
							paddingLeft: 1,
							paddingRight: 1,
						}}
					>
						<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
							URL:{" "}
						</text>
						<text fg={uiColors.primary}>{issue().web_url}</text>
					</box>
				</scrollbox>
			</box>

			{/* COMMENTS PANEL */}
			<box
				border={true}
				borderStyle="rounded"
				borderColor={uiColors.textMuted}
				style={{
					width: "100%",
					flexGrow: 1,
					flexBasis: 0,
					flexDirection: "column",
					overflow: "hidden",
				}}
			>
				{/* Title - Fixed header */}
				<box style={{ paddingLeft: 1, paddingRight: 1, flexShrink: 0 }}>
					<text fg={uiColors.borderHighlight} attributes={TextAttributes.BOLD}>
						Comments
						<Show when={props.comments.length > 0}>
							{" "}
							({props.comments.length})
						</Show>
					</text>
				</box>

				{/* Loading */}
				<Show when={props.issueCommentsLoading}>
					<box style={{ paddingLeft: 1, paddingRight: 1, flexShrink: 0 }}>
						<text fg={uiColors.warning}>Loading comments...</text>
					</box>
				</Show>

				{/* Error */}
				<Show when={!props.issueCommentsLoading && props.error}>
					<box style={{ paddingLeft: 1, paddingRight: 1, flexShrink: 0 }}>
						<text fg={uiColors.error}>Error: {props.error}</text>
					</box>
				</Show>

				{/* No comments */}
				<Show
					when={
						!props.issueCommentsLoading &&
						!props.error &&
						props.comments.length === 0
					}
				>
					<box style={{ paddingLeft: 1, paddingRight: 1, flexShrink: 0 }}>
						<text fg={uiColors.textMuted}>No comments</text>
					</box>
				</Show>

				{/* Comments list */}
				<Show when={!props.issueCommentsLoading && props.comments.length > 0}>
					<scrollbox
						scrollbarOptions={SCROLLBAR_OPTIONS}
						style={{ flexGrow: 1, minHeight: 0 }}
					>
						<For each={props.comments}>
							{(comment) => (
								<box
									style={{
										flexDirection: "row",
										paddingLeft: 1,
										paddingRight: 1,
									}}
								>
									<text fg={uiColors.primary}>{comment.author.name}</text>
									<text fg={uiColors.textMuted}>
										{" "}
										{formatDate(comment.created_at)}
									</text>
									<Show when={comment.system}>
										<text fg={uiColors.textSecondary}> (system)</text>
									</Show>
									<text>
										{": "}
										{comment.body.slice(0, 100)}
										{comment.body.length > 100 ? "..." : ""}
									</text>
								</box>
							)}
						</For>
					</scrollbox>
				</Show>
			</box>
		</box>
	);
}
