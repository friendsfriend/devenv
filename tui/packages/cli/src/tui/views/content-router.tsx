import { Show } from "solid-js";
import {
	Table,
	StatusLogView,
	IssueView,
	IssueDetailView,
	LinkedMRsView,
	ReferencesView,
	MergeRequestView,
	MergeRequestDetailView,
	ChangedFilesView,
	DiscussionsView,
	TimelineView,
	TestResultsDetailView,
	JobsDetailView,
	ProvidersView,
	HelpView,
	AppDetailView,
	uiColors,
	LAYOUT_CHROME_LINES,
	ContentStack,
} from "@devenv/ui";
import { getGuide, guides as allGuides } from "../guides";
import type { ContentRouterProps } from "./types";
import { StartupSplash } from "./startup-splash";

export function ContentRouter(props: ContentRouterProps) {
	const { appStore, issueStore, mrStore, providerStore, appDetailStore } =
		props.stores;
	const { helpActions, issueActions, pipelineActions, logActions, mrActions } =
		props.actions;

	// Table shares content area with StatusLogView (6 lines below it).
	// Include three 1-line gutters: header-tabs, table-log, log-footer.
	const STATUS_LOG_HEIGHT = 6;
	const TABLE_VIEW_GUTTERS = 3;
	const availableTableLines = Math.max(
		1,
		props.dimensions.height - LAYOUT_CHROME_LINES - STATUS_LOG_HEIGHT - TABLE_VIEW_GUTTERS,
	);
	const tableColumns = () =>
		appStore.activeTab() === "scripts"
			? props.scriptColumns
			: appStore.activeTab() === "infrastructure"
				? props.columns.filter(
						(column) => column.key !== "branch" && column.key !== "gitStatus",
					)
				: props.columns;

	return (
		<>
			{appStore.viewMode() === "references" ? (
				<ReferencesView
					references={issueStore.references()}
					selectedIndex={issueStore.selectedReferenceIndex()}
					loading={
						issueStore.linkedMRsLoading() ||
						issueStore.referencedIssuesLoading()
					}
					error={
						issueStore.linkedMRsError() || issueStore.referencedIssuesError()
					}
					onClose={() => issueActions.backToIssueDetailFromReferences()}
				runningTextEnabled={props.runningTextEnabled}
				runningTextOffset={props.runningTextOffset}
				/>
			) : appStore.viewMode() === "mrLinkedIssues" ? (
				<IssueView
					issues={mrStore.mrLinkedIssues()}
					selectedIndex={mrStore.selectedMrLinkedIssueIndex()}
					runningTextEnabled={props.runningTextEnabled}
					runningTextOffset={props.runningTextOffset}
					loading={mrStore.mrLinkedIssuesLoading()}
					error={mrStore.mrLinkedIssuesError()}
					currentPage={1}
					totalPages={1}
					totalCount={mrStore.mrLinkedIssues().length}
					scope={"all"}
					onClose={() => {
						mrStore.setSelectedMrLinkedIssueIndex(0);
						appStore.setViewMode("mergeRequestDetail");
					}}
				/>
			) : appStore.viewMode() === "referencedIssues" ? (
				<IssueView
					issues={issueStore.referencedIssues()}
					selectedIndex={issueStore.selectedReferencedIssueIndex()}
					runningTextEnabled={props.runningTextEnabled}
					runningTextOffset={props.runningTextOffset}
					loading={issueStore.referencedIssuesLoading()}
					error={issueStore.referencedIssuesError()}
					currentPage={1}
					totalPages={1}
					totalCount={issueStore.referencedIssues().length}
					scope={"all"}
					onClose={() => issueActions.backToIssueDetailFromReferences()}
				/>
			) : appStore.viewMode() === "linkedMRs" ? (
				<LinkedMRsView
					mergeRequests={issueStore.linkedMRs()}
					selectedIndex={issueStore.selectedLinkedMRIndex()}
					loading={issueStore.linkedMRsLoading()}
					error={issueStore.linkedMRsError()}
					onClose={() => {}}
					runningTextEnabled={props.runningTextEnabled}
					runningTextOffset={props.runningTextOffset}
				/>
			) : appStore.loading() ? (
				<StartupSplash appStore={appStore} />
			) : appStore.error() ? (
				<box
					style={{
						width: "100%",
						height: "100%",
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<text style={{ fg: uiColors.error }}>Error: {appStore.error()}</text>
				</box>
			) : (
				<Show
					when={appStore.viewMode() === "table" || appStore.viewMode() === "help"}
					fallback={
						<Show
							when={appStore.viewMode() === "help"}
							fallback={
								<Show
									when={appStore.viewMode() === "issues"}
									fallback={
										<Show
											when={appStore.viewMode() === "issueDetail" && issueStore.selectedIssue() || appStore.viewMode() === "issueTimeline"}
											fallback={
												<Show
													when={appStore.viewMode() === "mergeRequests"}
													fallback={
														<Show
															when={
																appStore.viewMode() === "mergeRequestDetail" &&
																mrStore.selectedMR()
															}
															fallback={
																<Show
																	when={appStore.viewMode() === "changedFiles"}
																	fallback={
																		<Show
																			when={
																				appStore.viewMode() ===
																				"discussionsView"
																			}
																			fallback={
																				<Show
																					when={
																						appStore.viewMode() ===
																						"testResults"
																					}
																					fallback={
																						<Show
																							when={
																								appStore.viewMode() === "jobs"
																							}
																							fallback={
																								<Show
																									when={
																										appStore.viewMode() ===
																											"appDetail" &&
																										appDetailStore.appDetailApp()
																									}
																									fallback={
																										<Show
																											when={
																												appStore.viewMode() ===
																												"providers"
																											}
																											fallback={
																												<box
																													style={{
																														width: "100%",
																														height: "100%",
																													}}
																												/>
																											}
																										>
																											<ProvidersView
																												providers={providerStore.providers()}
																												loading={providerStore.providersLoading()}
																												error={providerStore.providersError()}
																												selectedProviderIndex={providerStore.selectedProviderIndex()}
																												onClose={() => {
																													appStore.setViewMode(
																														"table",
																													);
																													providerStore.setProviders(
																														[],
																													);
																													providerStore.setProvidersError(
																														"",
																													);
																												}}
																											/>
																										</Show>
																									}
																								>
																									<AppDetailView
																										app={
																											appDetailStore.appDetailApp()!
																										}
																										kind={appDetailStore.appDetailKind()}
																										gitInfo={appDetailStore.appDetailGitInfo()}
																										mergeRequests={appDetailStore.appDetailMRs()}
																										logs={appDetailStore.appDetailLogs()}
																										statsHistory={appDetailStore.appDetailStatsHistory()}
																										memHistory={appDetailStore.appDetailMemHistory()}
																										latestStats={appDetailStore.appDetailLatestStats()}
																										loading={appDetailStore.appDetailLoading()}
																										mrsLoading={appDetailStore.appDetailMRsLoading()}
																									/>
																								</Show>
																							}
																						>
																							<JobsDetailView
																								jobs={mrStore.jobs()}
																								pipelineId={
																									mrStore.currentPipelineId() ||
																									0
																								}
																								loading={mrStore.jobsLoading()}
																								error={mrStore.jobsError()}
																								selectedStageIndex={mrStore.selectedJobStageIndex()}
																								selectedJobIndex={mrStore.selectedJobIndex()}
																								onClose={
																									pipelineActions.backToMRDetail
																								}
																								onViewJobLogs={
																									logActions.loadJobLogs
																								}
																								onRetryJob={
																									pipelineActions.retryJob
																								}
																								onCancelJob={
																									pipelineActions.cancelJob
																								}
																								searchMode={mrStore.jobsSearchMode()}
																								searchQuery={mrStore.jobsSearchQuery()}
																							/>
																						</Show>
																					}
																				>
																					<TestResultsDetailView
																						testSuites={
																							mrStore.mrTestSummary()
																								?.test_suites
																						}
																						loading={mrStore.mrTestLoading()}
																						error={mrStore.mrTestError()}
																						selectedIndex={mrStore.selectedTestIndex()}
																						onClose={() =>
																							appStore.setViewMode(
																								"mergeRequestDetail",
																							)
																						}
																						searchMode={mrStore.testSearchMode()}
																						searchQuery={mrStore.testSearchQuery()}
																					/>
																				</Show>
																			}
																		>
																			<DiscussionsView
																				discussions={mrStore.mrDiscussions()}
																				selectedIndex={mrStore.selectedDiscussionIndex()}
																				currentHeadSHA={
																					mrStore.selectedMR()?.head_pipeline
																						?.sha
																				}
																				changes={mrStore.mrChanges()}
																				loading={mrStore.mrDiscussionsLoading()}
																				error={mrStore.mrDiscussionsError()}
																				replyModeDiscussionId={mrStore.replyMode()}
																				replyText={mrStore.replyText()}
																				showOnlyComments={mrStore.discussionsShowOnlyComments()}
																				onClose={() => {
																					mrStore.setSelectedDiscussionIndex(0);
																					appStore.setViewMode(
																						"mergeRequestDetail",
																					);
																				}}
																			/>
																		</Show>
																	}
																>
																	<ChangedFilesView
																		changes={mrStore.changedFilesFiltered()}
																		selectedIndex={mrStore.selectedChangedFileIndex()}
																		loading={mrStore.mrChangesLoading()}
																		error={mrStore.mrChangesError()}
																		onClose={() => {
																			mrStore.setSelectedChangedFileIndex(0);
																			appStore.setViewMode(
																				"mergeRequestDetail",
																			);
																		}}
																		searchMode={mrStore.changedFilesSearchMode()}
																		searchQuery={mrStore.changedFilesSearchQuery()}
																	/>
																</Show>
															}
														>
															<MergeRequestDetailView
																mergeRequest={mrStore.selectedMR()!}
																jobs={mrStore.mrJobsForDetail()}
																jobsLoading={mrStore.mrJobsForDetailLoading()}
																testSummary={
																	mrStore.mrTestSummary() || undefined
																}
																testLoading={mrStore.mrTestLoading()}
																testError={mrStore.mrTestError()}
																changes={mrStore.mrChanges()}
																changesLoading={mrStore.mrChangesLoading()}
																changesError={mrStore.mrChangesError()}
																discussions={mrStore.mrDiscussions()}
																discussionsLoading={mrStore.mrDiscussionsLoading()}
																discussionsError={mrStore.mrDiscussionsError()}
																linkedIssues={mrStore.mrLinkedIssues()}
																linkedIssuesLoading={mrStore.mrLinkedIssuesLoading()}
																linkedIssuesError={mrStore.mrLinkedIssuesError()}
																runningTextEnabled={props.runningTextEnabled}
																runningTextOffset={props.runningTextOffset}
																onClose={mrActions.backToMRList}
															/>
														</Show>
													}
												>
													<MergeRequestView
														mergeRequests={mrStore.mergeRequests()}
														selectedIndex={mrStore.selectedMRIndex()}
														onClose={() => {
															appStore.setViewMode("table");
															mrStore.setMergeRequests([]);
															mrStore.setMrError("");
															mrStore.setSelectedMR(null);
															mrStore.setSelectedMRIndex(0);
														}}
														onSelectMR={mrActions.showMRDetail}
														loading={mrStore.mrLoading()}
														error={mrStore.mrError()}
														searchMode={mrStore.mrSearchMode()}
														searchQuery={mrStore.mrSearchQuery()}
														currentPage={mrStore.currentPage()}
														totalPages={mrStore.totalPages()}
														state={mrStore.mrState()}
													runningTextEnabled={props.runningTextEnabled}
													runningTextOffset={props.runningTextOffset}
													/>
												</Show>
											}
										>
											<Show when={appStore.viewMode() === "issueDetail"}>
											<IssueDetailView
												issue={issueStore.selectedIssue()!}
												comments={issueStore.issueComments()}
												issueCommentsLoading={issueStore.issueCommentsLoading()}
												error={issueStore.issueDetailError()}
												linkedMRs={issueStore.linkedMRs()}
												linkedMRsLoading={issueStore.linkedMRsLoading()}
												linkedMRsError={issueStore.linkedMRsError()}
												referencedIssues={issueStore.referencedIssues()}
												referencedIssuesLoading={issueStore.referencedIssuesLoading()}
												referencedIssuesError={issueStore.referencedIssuesError()}
												references={issueStore.references()}
												spinnerFrames={props.spinnerFrames}
												spinnerFrame={appStore.spinnerFrame}
												onDetailScrollBoxReady={(scrollBox) => {
													issueStore.issueDetailScrollBoxRef = scrollBox;
												}}
											/>
											</Show>
											<Show when={appStore.viewMode() === "issueTimeline"}>
												<TimelineView
													items={issueStore.issueComments().map(function(c: any) { return { id: 'ic-' + c.id, notes: [{ id: c.id, type: 'DiscussionNote', body: c.body, author: c.author, created_at: c.created_at, updated_at: c.updated_at, system: c.system }] }; })}
													selectedIndex={issueStore.selectedTimelineIndex()}
													isIssueTimeline={true}
													title={"Timeline (" + issueStore.issueComments().length + ")"}
													loading={issueStore.issueCommentsLoading()}
													error={issueStore.issueCommentsError()}
													onClose={() => {
														issueStore.setSelectedTimelineIndex(0);
														appStore.setViewMode("issueDetail");
													}}
												/>
											</Show>
										</Show>
									}
								>
									<IssueView
										issues={issueStore.issues()}
										selectedIndex={issueStore.selectedIssueIndex()}
										loading={issueStore.issueLoading()}
										error={issueStore.issueError()}
										currentPage={issueStore.currentPage()}
										totalPages={issueStore.totalPages()}
										totalCount={issueStore.totalCount()}
										scope={issueStore.issueScope()}
										state={issueStore.issueState()}
										searchMode={issueStore.issueSearchMode()}
										searchQuery={issueStore.issueSearchQuery()}
										runningTextEnabled={props.runningTextEnabled}
										runningTextOffset={props.runningTextOffset}
										onClose={() => {
											appStore.setViewMode("table");
											issueStore.setIssues([]);
											issueStore.setIssueError("");
										}}
									/>
								</Show>
							}
						>
							{(() => {
								const helpData = helpActions.getHelpContent();
								// Recompute sections when scope toggle changes
								const sections = () =>
									appStore.helpAllContexts()
										? helpActions.getHelpContent(true).sections
										: helpData.sections;
								const title = () =>
									appStore.helpAllContexts()
										? "All Contexts"
										: helpData.title;
								const guideEntries = () =>
									allGuides.map((g) => ({
										key: g.key,
										title: g.title,
										description: g.description,
										category: g.category,
									}));
								return (
									<HelpView
										sections={sections()}
										viewTitle={title()}
										onClose={helpActions.closeHelp}
										searchActive={appStore.helpSearchActive()}
										searchQuery={appStore.helpSearchQuery()}
										onSearchChange={(q) => appStore.setHelpSearchQuery(q)}
										allContexts={appStore.helpAllContexts()}
										onScopeToggle={(v) => appStore.setHelpAllContexts(v)}
										activeTab={appStore.helpActiveTab()}
										onTabChange={(tab) => {
											appStore.setHelpActiveTab(tab);
											appStore.setHelpSearchActive(false);
											appStore.setHelpSearchQuery("");
											appStore.setHelpGuideIndex(tab === "guides" ? 0 : -1);
										}}
										selectedGuideIndex={appStore.helpGuideIndex()}
										guides={guideEntries()}
										onGuideSelect={async (key) => {
											const guide = getGuide(key);
											if (guide) {
												const content = await guide.import();
												helpActions.closeHelp();
												props.stores.uiStore.setMarkdownModalReturnToHelp(true);
												props.stores.uiStore.setMarkdownModalTitle("");
												props.stores.uiStore.setMarkdownModalContent(content);
												props.stores.uiStore.setShowMarkdownModal(true);
											}
										}}
									/>
								);
							})()}
						</Show>
					}
				>
					<Show
						when={!appStore.statusLogMaximized()}
						fallback={
							<StatusLogView
								entries={appStore.statusLogEntries()}
								height={30}
								width={props.dimensions.width}
								isMaximized={true}
								runningTextEnabled={props.runningTextEnabled}
								runningTextOffset={props.runningTextOffset}
							/>
						}
					>
						<ContentStack
							items={[
								<box
									style={{
										flexGrow: 1,
										minHeight: 0,
										flexDirection: "column",
										overflow: "hidden",
									}}
								>
									<Table
										apps={appStore.tableFilteredApps()}
										columns={tableColumns()}
										selectedIndex={appStore.selectedIndex()}
										onSelect={appStore.setSelectedIndex}
										showBorder={true}
										availableLines={availableTableLines}
										tabs={appStore.tableTabs()}
										activeTab={appStore.activeTab()}
										onTabChange={appStore.setActiveTab}
										getTabBorderColor={props.getTabBorderColor}
										searchMode={appStore.tableSearchMode()}
										searchQuery={appStore.tableSearchQuery()}
										spinnerFrames={props.spinnerFrames}
										spinnerFrame={appStore.spinnerFrame}
									runningTextEnabled={props.runningTextEnabled}
									runningTextOffset={props.runningTextOffset}
									/>
								</box>,
								<box style={{ flexShrink: 0 }}>
									<StatusLogView
										entries={appStore.statusLogEntries()}
										height={6}
										width={props.dimensions.width}
										isMaximized={false}
									runningTextEnabled={props.runningTextEnabled}
									runningTextOffset={props.runningTextOffset}
									/>
								</box>,
							]}
						/>
					</Show>
				</Show>
			)}
		</>
	);
}
