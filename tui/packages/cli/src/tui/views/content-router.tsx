import { Show } from 'solid-js';
import {
	RepositoryTable,
	InfrastructureTable,
	TaskTable,
	StatusLogView,
	IssueView,
	IssueDetailView,
	LinkedCRsView,
	ReferencesView,
	ChangeRequestView,
	ChangeRequestDetailView,
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
} from '@devenv/ui';
import { getGuide, guides as allGuides } from "../guides";
import type { ContentRouterProps } from "./types";
import { StartupSplash } from "./startup-splash";

export function ContentRouter(props: ContentRouterProps) {
	const { appStore, issueStore, changeRequestStore, providerStore, appDetailStore } =
		props.stores;
	const { helpActions, issueActions, pipelineActions, logActions, crActions } =
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
						issueStore.linkedChangeRequestsLoading() ||
						issueStore.referencedIssuesLoading()
					}
					error={
						issueStore.linkedChangeRequestsError() || issueStore.referencedIssuesError()
					}
					onClose={() => issueActions.backToIssueDetailFromReferences()}
				runningTextEnabled={props.runningTextEnabled}
				runningTextOffset={props.runningTextOffset}
				/>
			) : appStore.viewMode() === "changeRequestLinkedIssues" ? (
				<IssueView
					issues={changeRequestStore.changeRequestLinkedIssues()}
					selectedIndex={changeRequestStore.selectedChangeRequestLinkedIssueIndex()}
					runningTextEnabled={props.runningTextEnabled}
					runningTextOffset={props.runningTextOffset}
					loading={changeRequestStore.changeRequestLinkedIssuesLoading()}
					error={changeRequestStore.changeRequestLinkedIssuesError()}
					currentPage={1}
					totalPages={1}
					totalCount={changeRequestStore.changeRequestLinkedIssues().length}
					scope={"all"}
					onClose={() => {
						changeRequestStore.setSelectedCrLinkedIssueIndex(0);
						appStore.setViewMode("changeRequestDetail");
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
			) : appStore.viewMode() === "linkedChangeRequests" ? (
				<LinkedCRsView
					changeRequests={issueStore.linkedChangeRequests()}
					selectedIndex={issueStore.selectedLinkedCRIndex()}
					loading={issueStore.linkedChangeRequestsLoading()}
					error={issueStore.linkedChangeRequestsError()}
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
													when={appStore.viewMode() === "changeRequests"}
													fallback={
														<Show
															when={
																appStore.viewMode() === "changeRequestDetail" &&
																changeRequestStore.selectedChangeRequest()
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
																										changeRequests={appDetailStore.appDetailChangeRequests()}
																										logs={appDetailStore.appDetailLogs()}
																										statsHistory={appDetailStore.appDetailStatsHistory()}
																										memHistory={appDetailStore.appDetailMemHistory()}
																										latestStats={appDetailStore.appDetailLatestStats()}
																										loading={appDetailStore.appDetailLoading()}
																										changeRequestsLoading={appDetailStore.appDetailChangeRequestsLoading()}
																									/>
																								</Show>
																							}
																						>
																							<JobsDetailView
																								jobs={changeRequestStore.jobs()}
																								pipelineId={
																									changeRequestStore.currentPipelineId() ||
																									0
																								}
																								loading={changeRequestStore.jobsLoading()}
																								error={changeRequestStore.jobsError()}
																								selectedStageIndex={changeRequestStore.selectedJobStageIndex()}
																								selectedJobIndex={changeRequestStore.selectedJobIndex()}
																								onClose={
																									pipelineActions.backToCRDetail
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
																								searchMode={changeRequestStore.jobsSearchMode()}
																								searchQuery={changeRequestStore.jobsSearchQuery()}
																							/>
																						</Show>
																					}
																				>
																					<TestResultsDetailView
																						testSuites={
																							changeRequestStore.crTestSummary()
																								?.test_suites
																						}
																						loading={changeRequestStore.crTestLoading()}
																						error={changeRequestStore.crTestError()}
																						selectedIndex={changeRequestStore.selectedTestIndex()}
																						onClose={() =>
																							appStore.setViewMode(
																								"changeRequestDetail",
																							)
																						}
																						searchMode={changeRequestStore.testSearchMode()}
																						searchQuery={changeRequestStore.testSearchQuery()}
																					/>
																				</Show>
																			}
																		>
																			<DiscussionsView
																				discussions={changeRequestStore.crDiscussions()}
																				selectedIndex={changeRequestStore.selectedDiscussionIndex()}
																				currentHeadSHA={
																					changeRequestStore.selectedChangeRequest()?.head_pipeline
																						?.sha
																				}
																				changes={changeRequestStore.crChanges()}
																				loading={changeRequestStore.crDiscussionsLoading()}
																				error={changeRequestStore.crDiscussionsError()}
																				replyModeDiscussionId={changeRequestStore.replyMode()}
																				replyText={changeRequestStore.replyText()}
																				showOnlyComments={changeRequestStore.discussionsShowOnlyComments()}
																				onClose={() => {
																					changeRequestStore.setSelectedDiscussionIndex(0);
																					appStore.setViewMode(
																						"changeRequestDetail",
																					);
																				}}
																			/>
																		</Show>
																	}
																>
																	<ChangedFilesView
																		changes={changeRequestStore.changedFilesFiltered()}
																		selectedIndex={changeRequestStore.selectedChangedFileIndex()}
																		loading={changeRequestStore.crChangesLoading()}
																		error={changeRequestStore.crChangesError()}
																		onClose={() => {
																			changeRequestStore.setSelectedChangedFileIndex(0);
																			appStore.setViewMode(
																				"changeRequestDetail",
																			);
																		}}
																		searchMode={changeRequestStore.changedFilesSearchMode()}
																		searchQuery={changeRequestStore.changedFilesSearchQuery()}
																	/>
																</Show>
															}
														>
															<ChangeRequestDetailView
																changeRequest={changeRequestStore.selectedChangeRequest()!}
																jobs={changeRequestStore.crJobsForDetail()}
																jobsLoading={changeRequestStore.crJobsForDetailLoading()}
																testSummary={
																	changeRequestStore.crTestSummary() || undefined
																}
																testLoading={changeRequestStore.crTestLoading()}
																testError={changeRequestStore.crTestError()}
																changes={changeRequestStore.crChanges()}
																changesLoading={changeRequestStore.crChangesLoading()}
																changesError={changeRequestStore.crChangesError()}
																discussions={changeRequestStore.crDiscussions()}
																discussionsLoading={changeRequestStore.crDiscussionsLoading()}
																discussionsError={changeRequestStore.crDiscussionsError()}
																linkedIssues={changeRequestStore.changeRequestLinkedIssues()}
																linkedIssuesLoading={changeRequestStore.changeRequestLinkedIssuesLoading()}
																linkedIssuesError={changeRequestStore.changeRequestLinkedIssuesError()}
																runningTextEnabled={props.runningTextEnabled}
																runningTextOffset={props.runningTextOffset}
																onClose={crActions.backToCRList}
															/>
														</Show>
													}
												>
													<ChangeRequestView
														changeRequests={changeRequestStore.changeRequests()}
														selectedIndex={changeRequestStore.selectedChangeRequestIndex()}
														onClose={() => {
															appStore.setViewMode("table");
															changeRequestStore.setChangeRequests([]);
															changeRequestStore.setCrError("");
															changeRequestStore.setSelectedCR(null);
															changeRequestStore.setSelectedCRIndex(0);
														}}
														onSelectCR={crActions.showCRDetail}
														loading={changeRequestStore.crLoading()}
														error={changeRequestStore.crError()}
														searchMode={changeRequestStore.crSearchMode()}
														searchQuery={changeRequestStore.crSearchQuery()}
														currentPage={changeRequestStore.currentPage()}
														totalPages={changeRequestStore.totalPages()}
														state={changeRequestStore.crState()}
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
												linkedChangeRequests={issueStore.linkedChangeRequests()}
												linkedChangeRequestsLoading={issueStore.linkedChangeRequestsLoading()}
												linkedChangeRequestsError={issueStore.linkedChangeRequestsError()}
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
									{(() => {
										const TableComponent = appStore.activeTab() === "scripts"
											? TaskTable
											: appStore.activeTab() === "infrastructure"
												? InfrastructureTable
												: RepositoryTable;
										return <TableComponent
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
										/>;
									})()}
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
