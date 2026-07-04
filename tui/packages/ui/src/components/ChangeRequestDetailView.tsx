import { TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from '@opentui/solid';
import { Show, For, createMemo } from "solid-js";
import { uiColors } from "../colors";
import { ContentFrame } from "./ContentStack";
import { getMarkdownSyntaxStyle } from "../markdownSyntax";
import { gitlabHtmlToMarkdown, containsHtml } from "../utils/gitlabHtml";
import { ScrollableContent } from './ScrollableContent';
import { RunningText } from './RunningText';
import type {
	Issue,
	ChangeRequest,
	Job,
	TestSummary,
	ChangeRequestChange,
	Discussion,
} from "@devenv/types";

interface ChangeRequestDetailViewProps {
	changeRequest: ChangeRequest;
	jobs?: Job[];
	jobsLoading?: boolean;
	testSummary?: TestSummary;
	testLoading?: boolean;
	testError?: string;
	changes?: ChangeRequestChange[];
	changesLoading?: boolean;
	changesError?: string;
	discussions?: Discussion[];
	discussionsLoading?: boolean;
	discussionsError?: string;
	linkedIssues?: Issue[];
	linkedIssuesLoading?: boolean;
	linkedIssuesError?: string;
	runningTextEnabled?: boolean;
	runningTextOffset?: number;
	onClose: () => void;
}

/**
 * ChangeRequestDetailView Component - Shows detailed CR information
 * Layout: 3 left panels (Metadata, Status, Changed Files) + 2 right panels (Jobs, Tests)
 * Matches the Go TUI version structure
 */
export function ChangeRequestDetailView(props: ChangeRequestDetailViewProps) {
	// Format date
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

	// Get status color
	const getStatusColor = (status: string) => {
		switch (status.toLowerCase()) {
			case "success":
			case "can_be_merged":
			case "opened":
				return uiColors.success;
			case "failed":
			case "cannot_be_merged":
				return uiColors.error;
			case "running":
			case "checking":
				return uiColors.primary;
			case "pending":
			case "created":
				return uiColors.warning;
			case "merged":
				return uiColors.primary;
			case "closed":
			case "skipped":
			case "canceled":
				return uiColors.textMuted;
			case "manual":
				return uiColors.warning;
			default:
				return uiColors.textSecondary;
		}
	};

	// Group jobs by stage and sort stages by the minimum job ID in each stage
	// This ensures stages appear in the order they were defined in the pipeline
	const jobsByStage = createMemo(() => {
		if (!props.jobs) return new Map<string, Job[]>();

		// Group jobs by stage
		const grouped = new Map<string, Job[]>();
		const stageMinJobId = new Map<string, number>();

		for (const job of props.jobs) {
			if (!grouped.has(job.stage)) {
				grouped.set(job.stage, []);
				stageMinJobId.set(job.stage, job.id);
			}
			grouped.get(job.stage)!.push(job);

			// Track the minimum job ID for this stage
			const currentMin = stageMinJobId.get(job.stage)!;
			if (job.id < currentMin) {
				stageMinJobId.set(job.stage, job.id);
			}
		}

		// Sort stages by their minimum job ID (execution order)
		const sortedStages = Array.from(grouped.keys()).sort((a, b) => {
			return stageMinJobId.get(a)! - stageMinJobId.get(b)!;
		});

		// Create a new Map with sorted stages
		const sortedGrouped = new Map<string, Job[]>();
		for (const stage of sortedStages) {
			sortedGrouped.set(stage, grouped.get(stage)!);
		}

		return sortedGrouped;
	});

	// Count discussions by resolved status
	const discussionCounts = createMemo(() => {
		if (!props.discussions || props.discussions.length === 0) {
			return { total: 0, resolved: 0, open: 0 };
		}

		const total = props.discussions.length;
		const resolved = props.discussions.filter(
			(d) => d.notes[0]?.resolved,
		).length;
		const open = total - resolved;

		return { total, resolved, open };
	});

	const dimensions = useTerminalDimensions();
	const cr = () => props.changeRequest;
	const lineWidth = () => Math.max(1, Math.floor(dimensions().width * 0.6) - 4);
	const linkedIssueTitleWidth = () => Math.max(1, lineWidth() - 8);

	return (
		<ContentFrame>
			<box
				backgroundColor={uiColors.bgBase}
				style={{
					width: "100%",
					flexGrow: 1,
					minHeight: 0,
					flexDirection: "row",
				}}
			>
				<box
					backgroundColor={uiColors.bgBase}
					style={{
						width: "60%",
						height: "100%",
						flexDirection: "column",
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
					{/* Title - Fixed header outside scrollbox */}
					<box style={{ paddingLeft: 1, paddingRight: 1, flexShrink: 0 }}>
						<RunningText text={cr().title} width={lineWidth()} fg={uiColors.borderHighlight} attributes={TextAttributes.BOLD} enabled={props.runningTextEnabled} active offset={props.runningTextOffset} />
					</box>

					{/* Scrollable content */}
					<ScrollableContent
												style={{
							width: "100%",
							flexGrow: 1,
							minHeight: 0,
						}}
					>
						{/* Author */}
						<box
							style={{ flexDirection: "row", paddingLeft: 1, paddingRight: 1 }}
						>
							<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
								Author:{" "}
							</text>
							<text fg={uiColors.textPrimary}>
								{cr().author.name} (@{cr().author.username})
							</text>
						</box>

						{/* Source Branch */}
						<box
							style={{ flexDirection: "row", paddingLeft: 1, paddingRight: 1 }}
						>
							<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
								Source:{" "}
							</text>
							<text fg={uiColors.textSecondary}>{cr().source_branch}</text>
						</box>

						{/* Target Branch */}
						<box
							style={{ flexDirection: "row", paddingLeft: 1, paddingRight: 1 }}
						>
							<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
								Target:{" "}
							</text>
							<text fg={uiColors.textSecondary}>{cr().target_branch}</text>
						</box>

						{/* State */}
						<box
							style={{ flexDirection: "row", paddingLeft: 1, paddingRight: 1 }}
						>
							<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
								State:{" "}
							</text>
							<text
								fg={getStatusColor(cr().state)}
								attributes={TextAttributes.BOLD}
							>
								{cr().state}
							</text>
						</box>

						{/* Pipeline Status */}
						<Show when={cr().head_pipeline?.status}>
							{(status) => (
								<box
									style={{
										flexDirection: "row",
										paddingLeft: 1,
										paddingRight: 1,
									}}
								>
									<text
										fg={uiColors.textMuted}
										attributes={TextAttributes.BOLD}
									>
										Pipeline:{" "}
									</text>
									<text
										fg={getStatusColor(status())}
										attributes={TextAttributes.BOLD}
									>
										{status()}
									</text>
								</box>
							)}
						</Show>

						{/* Created */}
						<box
							style={{ flexDirection: "row", paddingLeft: 1, paddingRight: 1 }}
						>
							<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
								Created:{" "}
							</text>
							<text fg={uiColors.textSecondary}>
								{formatDate(cr().created_at)}
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
								{formatDate(cr().updated_at)}
							</text>
						</box>

						{/* Description */}
						<Show when={cr().description && cr().description.trim() !== ""}>
							<box style={{ marginTop: 1, paddingLeft: 1, paddingRight: 1 }}>
								<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
									Description:
								</text>
							</box>
							<box style={{ paddingLeft: 3, paddingRight: 1 }}>
								<code
									filetype="markdown"
									content={containsHtml(cr().description!)
										? gitlabHtmlToMarkdown(cr().description!)
										: cr().description!}
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
							<RunningText text={cr().web_url} width={lineWidth()} fg={uiColors.primary} enabled={props.runningTextEnabled} active offset={props.runningTextOffset} />
						</box>

						{/* Linked Issues */}
						<box style={{ marginTop: 1, paddingLeft: 1, paddingRight: 1 }}>
							<text
								fg={uiColors.borderHighlight}
								attributes={TextAttributes.BOLD}
							>
								Linked Issues
								{props.linkedIssues && props.linkedIssues.length > 0
									? ` (${props.linkedIssues.length})`
									: ""}
							</text>
						</box>

						<Show when={props.linkedIssuesLoading}>
							<box style={{ paddingLeft: 2, paddingRight: 1 }}>
								<text fg={uiColors.warning}>Loading...</text>
							</box>
						</Show>

						<Show
							when={
								!props.linkedIssuesLoading &&
								props.linkedIssuesError &&
								props.linkedIssuesError.length > 0
							}
						>
							<box style={{ paddingLeft: 2, paddingRight: 1 }}>
								<text fg={uiColors.error}>
									Error: {props.linkedIssuesError}
								</text>
							</box>
						</Show>

						<Show
							when={
								!props.linkedIssuesLoading &&
								!props.linkedIssuesError &&
								(!props.linkedIssues || props.linkedIssues.length === 0)
							}
						>
							<box style={{ paddingLeft: 2, paddingRight: 1 }}>
								<text fg={uiColors.textMuted}>No linked issues</text>
							</box>
						</Show>

						<For each={props.linkedIssues}>
							{(iss) => (
								<box
									style={{
										flexDirection: "row",
										paddingLeft: 2,
										paddingRight: 1,
									}}
								>
									<text fg={uiColors.primary}>#{iss.iid}</text>
									<text fg={uiColors.textSecondary}>
										{iss.state === "opened" || iss.state === "open"
											? " ○ "
											: " ◌ "}
									</text>
									<RunningText text={iss.title} width={linkedIssueTitleWidth()} fg={uiColors.textSecondary} enabled={props.runningTextEnabled} active offset={props.runningTextOffset} />
								</box>
							)}
						</For>
					</ScrollableContent>
				</box>

				<box style={{ width: '100%', height: 1, flexShrink: 0 }} backgroundColor={uiColors.bgBase} />

				{/* STATUS PANEL */}
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
					<ScrollableContent
												style={{
							width: "100%",
							flexGrow: 1,
							minHeight: 0,
						}}
					>
						{/* Title */}
						<box style={{ height: 1, paddingLeft: 1, paddingRight: 1 }}>
							<text
								fg={uiColors.borderHighlight}
								attributes={TextAttributes.BOLD}
							>
								Status
							</text>
						</box>

						{/* Merge Status */}
						<box
							style={{
								height: 1,
								flexDirection: "row",
								paddingLeft: 1,
								paddingRight: 1,
							}}
						>
							<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
								Merge:{" "}
							</text>
							<Show
								when={cr().merge_status === "can_be_merged"}
								fallback={
									<Show
										when={
											cr().merge_status === "cannot_be_merged" ||
											cr().merge_status === "cannot_be_merged_recheck"
										}
										fallback={
											<text fg={uiColors.warning}>○ {cr().merge_status}</text>
										}
									>
										<text fg={uiColors.error}>✗ Cannot be merged</text>
									</Show>
								}
							>
								<text fg={uiColors.success}>✓ Can be merged</text>
							</Show>
						</box>

						{/* Detailed Merge Status */}
						<Show
							when={
								cr().detailed_merge_status &&
								cr().detailed_merge_status !== cr().merge_status
							}
						>
							<box
								style={{
									height: 1,
									flexDirection: "row",
									paddingLeft: 1,
									paddingRight: 1,
								}}
							>
								<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
									Details:{" "}
								</text>
								<text fg={uiColors.textSecondary}>
									{cr().detailed_merge_status}
								</text>
							</box>
						</Show>

						{/* Draft Status */}
						<Show when={cr().draft || cr().work_in_progress}>
							<box
								style={{
									height: 1,
									flexDirection: "row",
									paddingLeft: 1,
									paddingRight: 1,
								}}
							>
								<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
									Draft:{" "}
								</text>
								<text fg={uiColors.warning}>Yes</text>
							</box>
						</Show>

						{/* Conflicts */}
						<Show when={cr().has_conflicts}>
							<box
								style={{
									height: 1,
									flexDirection: "row",
									paddingLeft: 1,
									paddingRight: 1,
								}}
							>
								<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
									Conflicts:{" "}
								</text>
								<text fg={uiColors.error}>Yes</text>
							</box>
						</Show>

						{/* Blocking Discussions */}
						<Show when={!cr().blocking_discussions_resolved}>
							<box
								style={{
									height: 1,
									flexDirection: "row",
									paddingLeft: 1,
									paddingRight: 1,
								}}
							>
								<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
									Discussions:{" "}
								</text>
								<text fg={uiColors.warning}>Unresolved</text>
							</box>
						</Show>

						{/* Approvals */}
						<Show when={cr().approvals}>
							<box
								style={{
									height: 1,
									flexDirection: "row",
									paddingLeft: 1,
									paddingRight: 1,
								}}
							>
								<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
									Approvals:{" "}
								</text>
								<Show
									when={cr().approvals!.approvals_left === 0}
									fallback={
										<text fg={uiColors.warning}>
											{cr().approvals!.approvals_required -
												cr().approvals!.approvals_left}
											/{cr().approvals!.approvals_required} (need{" "}
											{cr().approvals!.approvals_left} more)
										</text>
									}
								>
									<text fg={uiColors.success}>
										✓ Approved (
										{cr().approvals!.approvals_required -
											cr().approvals!.approvals_left}
										/{cr().approvals!.approvals_required})
									</text>
								</Show>
							</box>

							{/* Approved By */}
							<Show
								when={cr().approvals && cr().approvals!.approved_by?.length > 0}
							>
								<box style={{ height: 1, paddingLeft: 1, paddingRight: 1 }}>
									<text
										fg={uiColors.textMuted}
										attributes={TextAttributes.BOLD}
									>
										Approved by:
									</text>
								</box>
								<For each={cr().approvals!.approved_by}>
									{(approval) => (
										<box style={{ height: 1, paddingLeft: 3, paddingRight: 1 }}>
											<text fg={uiColors.success}>
												✓ {approval.user.name} (@{approval.user.username})
											</text>
										</box>
									)}
								</For>
							</Show>
						</Show>

						{/* Rebase Status */}
						<Show when={cr().rebase_in_progress}>
							<box
								style={{
									height: 1,
									flexDirection: "row",
									paddingLeft: 1,
									paddingRight: 1,
								}}
							>
								<text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
									Rebase:{" "}
								</text>
								<text fg={uiColors.warning}>In progress...</text>
							</box>
						</Show>
					</ScrollableContent>
				</box>

				<box style={{ width: '100%', height: 1, flexShrink: 0 }} backgroundColor={uiColors.bgBase} />

				{/* CHANGED FILES PANEL */}
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
					<box
						style={{ width: "100%", flexShrink: 0, flexDirection: "column" }}
					>
						{/* Title */}
						<box
							style={{ width: "100%", height: 1 }}
							paddingLeft={1}
							paddingRight={1}
						>
							<text
								fg={uiColors.borderHighlight}
								attributes={TextAttributes.BOLD}
							>
								Changed Files
							</text>
						</box>

						{/* Loading State */}
						<Show when={props.changesLoading}>
							<box
								style={{ width: "100%", height: 1 }}
								paddingLeft={1}
								paddingRight={1}
							>
								<text fg={uiColors.warning}>Loading changed files...</text>
							</box>
						</Show>

						{/* Error State */}
						<Show when={!props.changesLoading && props.changesError}>
							<box
								style={{ width: "100%", height: 1 }}
								paddingLeft={1}
								paddingRight={1}
							>
								<text fg={uiColors.error}>Error: {props.changesError}</text>
							</box>
						</Show>

						{/* Empty State */}
						<Show
							when={
								!props.changesLoading &&
								!props.changesError &&
								(!props.changes || props.changes.length === 0)
							}
						>
							<box
								style={{ width: "100%", height: 1 }}
								paddingLeft={1}
								paddingRight={1}
							>
								<text fg={uiColors.textMuted}>No changed files</text>
							</box>
						</Show>
					</box>

					{/* Changed Files List */}
					<Show
						when={
							!props.changesLoading &&
							!props.changesError &&
							props.changes &&
							props.changes.length > 0
						}
					>
						<ScrollableContent
														style={{ flexGrow: 1, minHeight: 0 }}
						>
							<For each={props.changes}>
								{(change) => {
									let icon = "~";
									let color: string = uiColors.primary;
									let path = change.new_path;

									if (change.new_file) {
										icon = "+";
										color = uiColors.success as string;
									} else if (change.deleted_file) {
										icon = "-";
										color = uiColors.error as string;
										path = change.old_path;
									} else if (change.renamed_file) {
										icon = "→";
										color = uiColors.warning as string;
										path = `${change.old_path} → ${change.new_path}`;
									}

									return (
										<box style={{ height: 1, paddingLeft: 1, paddingRight: 1 }}>
											<text fg={color}>
												{icon} {path}
											</text>
										</box>
									);
								}}
							</For>
						</ScrollableContent>
					</Show>
				</box>
			</box>

			{/* RIGHT COLUMN: Pipeline Jobs + Test Results */}
			<box style={{ width: 1, flexShrink: 0 }} backgroundColor={uiColors.bgBase} />
			<box
				backgroundColor={uiColors.bgBase}
				style={{
					width: "40%",
					height: "100%",
					flexDirection: "column",
				}}
			>
				{/* PIPELINE JOBS PANEL */}
				<box
					backgroundColor={uiColors.bgMantle}
					style={{
						width: "100%",
						flexGrow: 1,
						flexDirection: "column",
						overflow: "hidden",
					}}
				>
					<box
						style={{ width: "100%", flexShrink: 0, flexDirection: "column" }}
					>
						{/* Title */}
						<box
							style={{ width: "100%", height: 1 }}
							paddingLeft={1}
							paddingRight={1}
						>
							<text
								fg={uiColors.borderHighlight}
								attributes={TextAttributes.BOLD}
							>
								Pipeline Jobs
							</text>
						</box>

						{/* Loading State */}
						<Show when={props.jobsLoading}>
							<box
								style={{ width: "100%", height: 1 }}
								paddingLeft={1}
								paddingRight={1}
							>
								<text fg={uiColors.warning}>Loading jobs...</text>
							</box>
						</Show>

						{/* No Pipeline */}
						<Show when={!props.jobsLoading && !cr().head_pipeline}>
							<box
								style={{ width: "100%", height: 1 }}
								paddingLeft={1}
								paddingRight={1}
							>
								<text fg={uiColors.textMuted}>No pipeline available</text>
							</box>
						</Show>

						{/* Empty Jobs */}
						<Show
							when={
								!props.jobsLoading &&
								cr().head_pipeline &&
								cr().head_pipeline?.id &&
								(!props.jobs || props.jobs.length === 0)
							}
						>
							<box
								style={{ width: "100%", height: 1 }}
								paddingLeft={1}
								paddingRight={1}
							>
								<text fg={uiColors.textMuted}>No jobs found</text>
							</box>
						</Show>
					</box>

					{/* Jobs by Stage */}
					<Show
						when={!props.jobsLoading && props.jobs && props.jobs.length > 0}
					>
						<ScrollableContent
														style={{ flexGrow: 1, minHeight: 0 }}
						>
							<For each={Array.from(jobsByStage().entries())}>
								{([stage, jobs]) => (
									<>
										{/* Stage Header */}
										<box style={{ height: 1, paddingLeft: 1, paddingRight: 1 }}>
											<text
												fg={uiColors.textMuted}
												attributes={TextAttributes.BOLD}
											>
												{stage}:
											</text>
										</box>

										{/* Jobs in Stage */}
										<For each={jobs}>
											{(job) => (
												<box
													style={{ height: 1, paddingLeft: 2, paddingRight: 1 }}
												>
													<text fg={getStatusColor(job.status)}>
														{job.status === "success"
															? "✓"
															: job.status === "failed"
																? "✗"
																: job.status === "running"
																	? "▶"
																	: job.status === "pending"
																		? "○"
																		: job.status === "manual"
																			? "◎"
																			: "○"}{" "}
														{job.name}
													</text>
												</box>
											)}
										</For>
									</>
								)}
							</For>
						</ScrollableContent>
					</Show>
				</box>

				<box style={{ width: '100%', height: 1, flexShrink: 0 }} backgroundColor={uiColors.bgBase} />

				{/* DISCUSSIONS PANEL - Fixed height summary */}
				<box
					backgroundColor={uiColors.bgMantle}
					style={{
						width: "100%",
						height: 6,
						flexShrink: 0,
						flexDirection: "column",
					}}
				>
					<box
						style={{ width: "100%", flexShrink: 0, flexDirection: "column" }}
					>
						{/* Title */}
						<box
							style={{ width: "100%", height: 1 }}
							paddingLeft={1}
							paddingRight={1}
						>
							<text
								fg={uiColors.borderHighlight}
								attributes={TextAttributes.BOLD}
							>
								Discussions
							</text>
						</box>

						{/* Loading State */}
						<Show when={props.discussionsLoading}>
							<box
								style={{ width: "100%", height: 1 }}
								paddingLeft={1}
								paddingRight={1}
							>
								<text fg={uiColors.warning}>Loading discussions...</text>
							</box>
						</Show>

						{/* Error State */}
						<Show when={!props.discussionsLoading && props.discussionsError}>
							<box
								style={{ width: "100%", height: 1 }}
								paddingLeft={1}
								paddingRight={1}
							>
								<text fg={uiColors.textMuted}>{props.discussionsError}</text>
							</box>
						</Show>

						{/* No Discussions */}
						<Show
							when={
								!props.discussionsLoading &&
								!props.discussionsError &&
								discussionCounts().total === 0
							}
						>
							<box
								style={{ width: "100%", height: 1 }}
								paddingLeft={1}
								paddingRight={1}
							>
								<text fg={uiColors.textMuted}>No discussions</text>
							</box>
						</Show>

						{/* Discussion Summary */}
						<Show
							when={!props.discussionsLoading && discussionCounts().total > 0}
						>
							<box
								style={{ width: "100%", flexDirection: "column" }}
								paddingLeft={1}
								paddingRight={1}
								paddingBottom={0}
							>
								<box style={{ width: "100%", height: 1, flexDirection: "row" }}>
									<text
										fg={uiColors.textMuted}
										attributes={TextAttributes.BOLD}
									>
										Total:{" "}
									</text>
									<text fg={uiColors.textSecondary}>
										{discussionCounts().total}
									</text>
								</box>

								<box style={{ width: "100%", height: 1, flexDirection: "row" }}>
									<text
										fg={uiColors.textMuted}
										attributes={TextAttributes.BOLD}
									>
										Open:{" "}
									</text>
									<text
										fg={
											discussionCounts().open > 0
												? uiColors.warning
												: uiColors.success
										}
									>
										{discussionCounts().open}
									</text>
								</box>

								<box style={{ width: "100%", height: 1, flexDirection: "row" }}>
									<text
										fg={uiColors.textMuted}
										attributes={TextAttributes.BOLD}
									>
										Resolved:{" "}
									</text>
									<text fg={uiColors.success}>
										{discussionCounts().resolved}
									</text>
								</box>
							</box>
						</Show>
					</box>
				</box>

				<box style={{ width: '100%', height: 1, flexShrink: 0 }} backgroundColor={uiColors.bgBase} />

				{/* TEST RESULTS PANEL - Fixed height summary */}
				<box
					backgroundColor={uiColors.bgMantle}
					style={{
						width: "100%",
						height: 8,
						flexShrink: 0,
						flexDirection: "column",
					}}
				>
					<box
						style={{ width: "100%", flexShrink: 0, flexDirection: "column" }}
					>
						{/* Title */}
						<box
							style={{ width: "100%", height: 1 }}
							paddingLeft={1}
							paddingRight={1}
						>
							<text
								fg={uiColors.borderHighlight}
								attributes={TextAttributes.BOLD}
							>
								Test Results
							</text>
						</box>

						{/* Loading State */}
						<Show when={props.testLoading}>
							<box
								style={{ width: "100%", height: 1 }}
								paddingLeft={1}
								paddingRight={1}
							>
								<text fg={uiColors.warning}>Loading tests...</text>
							</box>
						</Show>

						{/* Error State */}
						<Show when={!props.testLoading && props.testError}>
							<box
								style={{ width: "100%", height: 1 }}
								paddingLeft={1}
								paddingRight={1}
							>
								<text fg={uiColors.textMuted}>{props.testError}</text>
							</box>
						</Show>

						{/* No Tests */}
						<Show
							when={
								!props.testLoading && !props.testError && !props.testSummary
							}
						>
							<box
								style={{ width: "100%", height: 1 }}
								paddingLeft={1}
								paddingRight={1}
							>
								<text fg={uiColors.textMuted}>No test results available</text>
							</box>
						</Show>

						{/* Test Summary */}
						<Show when={!props.testLoading && props.testSummary}>
							<box
								style={{ width: "100%", flexDirection: "column" }}
								paddingLeft={1}
								paddingRight={1}
								paddingBottom={0}
							>
								<box style={{ width: "100%", height: 1, flexDirection: "row" }}>
									<text
										fg={uiColors.textMuted}
										attributes={TextAttributes.BOLD}
									>
										Total:{" "}
									</text>
									<text fg={uiColors.textSecondary}>
										{props.testSummary!.total}
									</text>
								</box>

								<box style={{ width: "100%", height: 1, flexDirection: "row" }}>
									<text
										fg={uiColors.textMuted}
										attributes={TextAttributes.BOLD}
									>
										Success:{" "}
									</text>
									<text fg={uiColors.success}>
										{props.testSummary!.success}
									</text>
								</box>

								<box style={{ width: "100%", height: 1, flexDirection: "row" }}>
									<text
										fg={uiColors.textMuted}
										attributes={TextAttributes.BOLD}
									>
										Failed:{" "}
									</text>
									<text fg={uiColors.error}>{props.testSummary!.failed}</text>
								</box>

								<box style={{ width: "100%", height: 1, flexDirection: "row" }}>
									<text
										fg={uiColors.textMuted}
										attributes={TextAttributes.BOLD}
									>
										Skipped:{" "}
									</text>
									<text fg={uiColors.textMuted}>
										{props.testSummary!.skipped}
									</text>
								</box>

								<Show when={props.testSummary!.error > 0}>
									<box
										style={{
											width: "100%",
											height: 1,
											flexDirection: "row",
											paddingBottom: 1,
										}}
									>
										<text
											fg={uiColors.textMuted}
											attributes={TextAttributes.BOLD}
										>
											Error:{" "}
										</text>
										<text fg={uiColors.error}>{props.testSummary!.error}</text>
									</box>
								</Show>
							</box>
						</Show>
					</box>
				</box>
			</box>
		</box>
	</ContentFrame>
	);
}

