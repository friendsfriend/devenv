import { Show } from "solid-js";
import {
	Table,
	StatusLogView,
	IssueView,
	IssueDetailView,
	MergeRequestView,
	MergeRequestDetailView,
	ChangedFilesView,
	DiscussionsView,
	TestResultsDetailView,
	JobsDetailView,
	ProvidersView,
	HelpView,
	AppDetailView,
	uiColors,
} from "@devenv/ui";
import type { ContentRouterProps } from "./types";
import { StartupSplash } from "./startup-splash";

export function ContentRouter(props: ContentRouterProps) {
	const { appStore, issueStore, mrStore, providerStore, appDetailStore } =
		props.stores;
	const { helpActions, pipelineActions, logActions, mrActions } = props.actions;
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
			{appStore.loading() ? (
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
					when={appStore.viewMode() === "table"}
					fallback={
						<Show
							when={appStore.viewMode() === "help"}
							fallback={
								<Show
									when={appStore.viewMode() === "issues"}
									fallback={
										<Show
											when={
												appStore.viewMode() === "issueDetail" &&
												issueStore.selectedIssue()
											}
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
													/>
												</Show>
											}
										>
											<IssueDetailView
												issue={issueStore.selectedIssue()!}
												comments={issueStore.issueComments()}
												issueCommentsLoading={issueStore.issueCommentsLoading()}
												error={issueStore.issueDetailError()}
											/>
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
										searchMode={issueStore.issueSearchMode()}
										searchQuery={issueStore.issueSearchQuery()}
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
								return (
									<HelpView
										sections={helpData.sections}
										viewTitle={helpData.title}
										onClose={helpActions.closeHelp}
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
							/>
						}
					>
						<>
							<Table
								apps={appStore.tableFilteredApps()}
								columns={tableColumns()}
								selectedIndex={appStore.selectedIndex()}
								onSelect={appStore.setSelectedIndex}
								showBorder={true}
								tabs={appStore.tableTabs()}
								activeTab={appStore.activeTab()}
								onTabChange={appStore.setActiveTab}
								getTabBorderColor={props.getTabBorderColor}
								searchMode={appStore.tableSearchMode()}
								searchQuery={appStore.tableSearchQuery()}
							/>

							<StatusLogView
								entries={appStore.statusLogEntries()}
								height={6}
								width={props.dimensions.width}
								isMaximized={false}
							/>
						</>
					</Show>
				</Show>
			)}
		</>
	);
}
