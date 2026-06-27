import { TextAttributes } from "@opentui/core";
import type { ScrollBoxRenderable } from "@opentui/core";
import { For, Show } from "solid-js";
import type { Issue, IssueComment, MergeRequest } from "@devenv/types";
import { uiColors } from "../colors";
import { ContentFrame } from "./ContentStack";
import { getMarkdownSyntaxStyle } from "../markdownSyntax";
import { gitlabHtmlToMarkdown, containsHtml } from "../utils/gitlabHtml";
import { ScrollableContent } from './ScrollableContent';

type RefItem =
	| { type: "mr"; data: MergeRequest }
	| { type: "issue"; data: Issue };

interface IssueDetailViewProps {
	issue: Issue;
	comments: IssueComment[];
	issueCommentsLoading: boolean;
	error: string;
	linkedMRs?: MergeRequest[];
	linkedMRsLoading?: boolean;
	linkedMRsError?: string;
	referencedIssues?: Issue[];
	referencedIssuesLoading?: boolean;
	referencedIssuesError?: string;
	references?: RefItem[];
	spinnerFrames?: string[];
	spinnerFrame?: () => number;
	onDetailScrollBoxReady?: (scrollBox: ScrollBoxRenderable) => void;
}

/**
 * IssueDetailView Component - Shows detailed issue information
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
		<ContentFrame>
			<box
				style={{
					width: "100%",
					flexGrow: 1,
					minHeight: 0,
					flexDirection: "column",
					gap: 0,
				}}
			>
			{/* METADATA PANEL */}
			<box
				backgroundColor={uiColors.bgMantle}
				style={{
					width: "100%",
					flexGrow: 1,
					flexBasis: 0,
					flexDirection: "column",
					overflow: "hidden",
				}}
			>
				{/* Title */}
				<box style={{ paddingLeft: 1, paddingRight: 1, flexShrink: 0 }}>
					<text fg={uiColors.borderHighlight} attributes={TextAttributes.BOLD}>
						{issue().title}
					</text>
				</box>

				<ScrollableContent
					onScrollBoxReady={(r) => props.onDetailScrollBoxReady?.(r)}
										style={{
						width: "100%",
						flexGrow: 1,
						minHeight: 0,
					}}
				>
					{/* State */}
					<box
						style={{ flexDirection: "row", paddingLeft: 1, paddingRight: 1 }}
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
						style={{ flexDirection: "row", paddingLeft: 1, paddingRight: 1 }}
					>
						<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
							Author:{" "}
						</text>
						<text fg={uiColors.textPrimary}>{issue().author.name}</text>
					</box>

					{/* Labels */}
					<Show when={(issue().labels ?? []).length > 0}>
						<box
							style={{ flexDirection: "row", paddingLeft: 1, paddingRight: 1 }}
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
							style={{ flexDirection: "row", paddingLeft: 1, paddingRight: 1 }}
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
							style={{ flexDirection: "row", paddingLeft: 1, paddingRight: 1 }}
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
						style={{ flexDirection: "row", paddingLeft: 1, paddingRight: 1 }}
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
						style={{ flexDirection: "row", paddingLeft: 1, paddingRight: 1 }}
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
							<code
								filetype="markdown"
								content={containsHtml(issue().description!)
									? gitlabHtmlToMarkdown(issue().description!)
									: issue().description!}
								syntaxStyle={getMarkdownSyntaxStyle()}
								drawUnstyledText={true}
								fg={uiColors.textSecondary}
						/>
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
				</ScrollableContent>
			</box>

			<box style={{ width: "100%", height: 1, flexShrink: 0 }} />

			{/* REFERENCES — combined issues + MRs */}
			<box
				backgroundColor={uiColors.bgMantle}
				style={{
					width: "100%",
					flexGrow: 0,
					flexShrink: 0,
					maxHeight: 7,
					flexDirection: "column",
					overflow: "hidden",
				}}
			>
				<box style={{ paddingLeft: 1, paddingRight: 1, flexShrink: 0 }}>
					<text fg={uiColors.borderHighlight} attributes={TextAttributes.BOLD}>
						References
						{props.references && props.references.length > 0
							? ` (${props.references.length})`
							: ""}
					</text>
				</box>

				<Show when={props.linkedMRsLoading || props.referencedIssuesLoading}>
					<box style={{ paddingLeft: 1, paddingRight: 1, flexShrink: 0 }}>
						<text fg={uiColors.primary}>
							{props.spinnerFrames && props.spinnerFrame !== undefined
								? props.spinnerFrames[props.spinnerFrame()]
								: "●"}
						</text>
					</box>
				</Show>

				<Show
					when={
						!props.linkedMRsLoading &&
						!props.referencedIssuesLoading &&
						(!props.references || props.references.length === 0)
					}
				>
					<box style={{ paddingLeft: 1, paddingRight: 1, flexShrink: 0 }}>
						<text fg={uiColors.textMuted}>No references</text>
					</box>
				</Show>

				<Show when={props.references && props.references.length > 0}>
					<ScrollableContent
												style={{
							width: "100%",
							maxHeight: 6,
						}}
					>
						<For each={props.references!.slice(0, 3)}>
							{(ref) => (
								<box
									style={{
										flexDirection: "row",
										paddingLeft: 1,
										paddingRight: 1,
									}}
								>
									<text
										fg={
											ref.type === "mr"
												? uiColors.primary
												: uiColors.textSecondary
										}
									>
										{ref.type === "mr" ? "!" : "#"}
										{ref.data.iid}
									</text>
									<text fg={uiColors.textSecondary}>
										{ref.data.state === "opened" || ref.data.state === "open"
											? " ○ "
											: ref.data.state === "merged"
												? " ● "
												: " ◌ "}
									</text>
									<text fg={uiColors.textSecondary}>
										{ref.data.title.slice(0, 80)}
									</text>
								</box>
							)}
						</For>
						<Show when={props.references!.length > 3}>
							<box
								style={{
									flexDirection: "row",
									paddingLeft: 1,
									paddingRight: 1,
								}}
							>
								<text fg={uiColors.primary}>
									View all {props.references!.length} →
								</text>
							</box>
						</Show>
					</ScrollableContent>
				</Show>
			</box>

			<box style={{ width: "100%", height: 1, flexShrink: 0 }} />

			{/* COMMENTS PANEL */}
			<box
				backgroundColor={uiColors.bgMantle}
				style={{
					width: "100%",
					flexGrow: 0,
					flexShrink: 0,
					maxHeight: 6,
					flexDirection: "column",
					overflow: "hidden",
				}}
			>
				<box style={{ paddingLeft: 1, paddingRight: 1, flexShrink: 0 }}>
					<text fg={uiColors.borderHighlight} attributes={TextAttributes.BOLD}>
						Comments
						{props.comments.length > 0 ? ` (${props.comments.length})` : ""}
					</text>
				</box>

				<Show when={props.issueCommentsLoading}>
					<box style={{ paddingLeft: 1, paddingRight: 1, flexShrink: 0 }}>
						<text fg={uiColors.primary}>
							{props.spinnerFrames && props.spinnerFrame !== undefined
								? props.spinnerFrames[props.spinnerFrame()]
								: "●"}
						</text>
					</box>
				</Show>

				<Show when={!props.issueCommentsLoading && props.error}>
					<box style={{ paddingLeft: 1, paddingRight: 1, flexShrink: 0 }}>
						<text fg={uiColors.error}>Error: {props.error}</text>
					</box>
				</Show>

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

				<Show when={!props.issueCommentsLoading && props.comments.length > 0}>
					<ScrollableContent
												style={{
							width: "100%",
							maxHeight: 3,
						}}
					>
						<For each={props.comments.slice(-3)}>
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
					</ScrollableContent>
				</Show>
			</box>
		</box>
		</ContentFrame>
	);
}
