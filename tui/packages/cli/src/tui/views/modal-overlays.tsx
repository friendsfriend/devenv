import { Show } from "solid-js";
import { TextAttributes, RGBA } from "@opentui/core";
import {
	LogModal,
	DiffViewModal,
	TestDetailModal,
	BranchSelectorView,
	BranchCreateModal,
	ErrorDialog,
	ConfirmDialog,
	AgentSpaceView,
	ConnectProviderModal,
	AddAppModal,
	MarkdownModal,
	SshHostPickerView,
	PassphraseModal,
	ProfilePickerView,
	EditorPickerView,
	WorktreeManagerModal,
	ScriptArgsModal,
	ScriptAddModal,
	MrAiReviewOverlay,
	IssueScopeModal,
	CloseReasonModal,
	CommentModal,
	LabelPickerModal,
	AssigneePickerModal,
	FilterModal,
	SortModal,
	HelpView,
	uiColors,
} from "@devenv/ui";
import type { ModalOverlaysProps } from "./types";
import { FirstStepsView } from "./first-steps-view";
import { getGuide, guides as allGuides } from "../guides";

export function ModalOverlays(props: ModalOverlaysProps) {
	const {
		appStore,
		issueStore,
		logStore,
		mrStore,
		providerStore,
		uiStore,
		agentStore,
	} = props.stores;
	const { dockerActions, mrActions, logActions, issueActions, helpActions } = props.actions;

	return (
		<>
			<Show when={appStore.showFirstSteps() && appStore.viewMode() === "table" && !providerStore.showConnectProviderModal() && !providerStore.showAddAppModal() && !uiStore.showMarkdownModal()}>
				<FirstStepsView appStore={appStore} providerStore={providerStore} />
			</Show>
			<Show when={uiStore.showMarkdownModal()}>
				<MarkdownModal
					title={uiStore.markdownModalTitle()}
					content={uiStore.markdownModalContent()}
					hideTitle={uiStore.markdownModalTitle() === ""}
					onScrollBoxReady={(scrollBox) => { uiStore.markdownModalScrollBoxRef = scrollBox; }}
				/>
			</Show>

			<Show when={appStore.showTableFilterModal()}>
				<FilterModal
					parameters={appStore.tableFilterParameters()}
					selectedParameterIndex={appStore.tableFilterParameterIndex()}
					selectedValueIndex={appStore.tableFilterValueIndex()}
					focusedPane={appStore.tableFilterFocusedPane()}
					activeFilters={appStore.tableFilters()}
				/>
			</Show>

			<Show when={appStore.showTableSortModal()}>
				<SortModal
					parameters={appStore.tableSortRules()}
					selectedIndex={appStore.tableSortSelectedIndex()}
				/>
			</Show>

			<Show when={appStore.viewMode() === "help"}>
				{(() => {
					const helpData = helpActions.getHelpContent();
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
							onKeybindScrollBoxReady={(scrollBox) => { uiStore.helpKeybindScrollBoxRef = scrollBox; }}
							onGuideScrollBoxReady={(scrollBox) => { uiStore.helpGuideScrollBoxRef = scrollBox; }}
							onGuideSelect={async (key) => {
								const guide = getGuide(key);
								if (guide) {
									const content = await guide.import();
									helpActions.closeHelp();
									uiStore.setMarkdownModalTitle("");
									uiStore.setMarkdownModalContent(content);
									uiStore.setShowMarkdownModal(true);
								}
							}}
						/>
					);
				})()}
			</Show>

			<Show when={appStore.viewMode() === "issueScopePicker"}>
				<IssueScopeModal
					selectedIndex={issueStore.issueScopePickerIndex()}
					onSelect={(idx) => issueStore.setIssueScopePickerIndex(idx)}
					onSubmit={(scope: string) => {
						const { issueActions } = props.actions;
						issueActions.selectScope(scope as any);
					}}
					onCancel={() => {
						appStore.setViewMode("table");
						issueStore.setIssueScopePickerIndex(0);
					}}
				/>
			</Show>

			<Show when={issueStore.showCommentModal()}>
				<CommentModal
					text={issueStore.commentText()}
					submitting={issueStore.issueSubmitting()}
					error={issueStore.issueSubmitError()}
					onInput={(text) => issueStore.setCommentText(text)}
					onSubmit={() => issueActions.addComment()}
					onCancel={() => {
						issueStore.setShowCommentModal(false);
						issueStore.setCommentText("");
					}}
				/>
			</Show>

			<Show when={issueStore.showCloseReasonModal()}>
				<CloseReasonModal
					selectedIndex={issueStore.closeReasonIndex()}
					onSelect={(idx) => issueStore.setCloseReasonIndex(idx)}
					onSubmit={(reason: string) => {
						const { issueActions } = props.actions;
						issueStore.setShowCloseReasonModal(false);
						const issue = issueStore.selectedIssue();
						if (issue) {
							issueActions.closeIssue(issue.iid, reason);
						}
					}}
					onCancel={() => issueStore.setShowCloseReasonModal(false)}
				/>
			</Show>

			<Show when={issueStore.showLabelPicker()}>
				<LabelPickerModal
					labels={issueStore.availableLabels()}
					selectedLabels={issueStore.selectedIssue()?.labels ?? []}
					selectedIndex={issueStore.labelPickerIndex()}
					loading={issueStore.issueLoading()}
					onSelect={(idx) => issueStore.setLabelPickerIndex(idx)}
					onToggle={() => {}}
					onConfirm={() => issueStore.setShowLabelPicker(false)}
					onCancel={() => issueStore.setShowLabelPicker(false)}
				/>
			</Show>

			<Show when={issueStore.showAssigneePicker()}>
				<AssigneePickerModal
					collaborators={issueStore.availableCollaborators()}
					currentAssignee={
						issueStore.selectedIssue()?.assignees?.[0]?.username ?? ""
					}
					selectedIndex={issueStore.assigneePickerIndex()}
					loading={issueStore.issueLoading()}
					onSelect={(idx) => issueStore.setAssigneePickerIndex(idx)}
					onPick={() => {}}
					onCancel={() => issueStore.setShowAssigneePicker(false)}
				/>
			</Show>

			<Show when={appStore.viewMode() === "sshPicker"}>
				<SshHostPickerView
					hosts={agentStore.sshHosts()}
					selectedIndex={agentStore.selectedSshIndex()}
					searchQuery={agentStore.sshSearchQuery()}
					filterQuery={agentStore.sshSearchQuery()}
					filterActive={agentStore.sshFilterActive()}
					onFilterChange={(q) => {
						agentStore.setSshSearchQuery(q);
						agentStore.setSelectedSshIndex(0);
					}}
				/>
			</Show>

			<Show
				when={
					uiStore.showPassphraseModal() &&
					uiStore.pendingSshHost()?.identityFile
				}
			>
				<PassphraseModal
					identityFile={uiStore.pendingSshHost()!.identityFile!}
					passphraseText={uiStore.passphraseText()}
					error={uiStore.passphraseError()}
				/>
			</Show>

			<Show when={appStore.viewMode() === "agentView"}>
				<AgentSpaceView
					piAgentGroups={agentStore.piAgentGroups()}
					sessionsLoading={agentStore.agentSessionsLoading()}
					selectedIndex={agentStore.selectedAgentItemIndex()}
					searchQuery={agentStore.agentSearchQuery()}
					filterQuery={agentStore.agentSearchQuery()}
					filterActive={agentStore.agentFilterActive()}
					onFilterChange={(q) => {
						agentStore.setAgentSearchQuery(q);
						agentStore.setSelectedAgentItemIndex(0);
					}}
				/>
			</Show>

			<Show when={providerStore.showConnectProviderModal()}>
				<ConnectProviderModal
					step={providerStore.connectProviderStep()}
					provider={providerStore.connectProviderType()}
					selectedProviderIndex={providerStore.connectProviderIndex()}
					nameText={providerStore.connectProviderName()}
					usernameText={providerStore.connectProviderUsername()}
					tokenText={providerStore.connectProviderToken()}
					error={providerStore.connectProviderError()}
					success={providerStore.connectProviderSuccess()}
					editMode={providerStore.connectProviderEditMode()}
				/>
			</Show>

			<Show when={providerStore.showAddAppModal()}>
				<AddAppModal
					step={providerStore.addAppStep()}
					providers={providerStore.addAppProviders()}
					selectedProviderIndex={providerStore.addAppSelectedProviderIndex()}
					searchQuery={providerStore.addAppSearchQuery()}
					searchResults={providerStore.addAppSearchResults()}
					selectedResultIndex={providerStore.addAppSelectedResultIndex()}
					manualUrl={providerStore.addAppManualUrl()}
					findRepoMode={providerStore.addAppFindRepoMode()}
					findRepoModeIndex={providerStore.addAppFindRepoModeIndex()}
					appName={providerStore.addAppName()}
					branches={providerStore.addAppBranches()}
					selectedBranchIndex={providerStore.addAppSelectedBranchIndex()}
					branchFilterQuery={providerStore.addAppBranchFilter()}
					loading={providerStore.addAppLoading()}
					error={providerStore.addAppError()}
					appType={providerStore.addAppAppType()}
					appTypeIndex={providerStore.addAppAppTypeIndex()}
				/>
			</Show>

			<Show when={uiStore.showWorktreeManagerModal()}>
				<WorktreeManagerModal
					appName={
						uiStore.worktreeManagerAppId()
							? (appStore
									.apps()
									.find((a) => a.ident === uiStore.worktreeManagerAppId())
									?.displayName ??
								uiStore.worktreeManagerAppId() ??
								"")
							: ""
					}
					worktrees={uiStore.worktreeManagerWorktrees()}
					selectedIndex={uiStore.worktreeManagerSelectedIndex()}
				/>
			</Show>

			<Show when={uiStore.showBranchSelector()}>
				<BranchSelectorView
					branches={uiStore.filteredBranches()}
					currentBranch={uiStore.targetAppForBranch()?.branch || ""}
					selectedIndex={uiStore.branchSelectorIndex()}
					appName={uiStore.targetAppForBranch()?.displayName || ""}
					loading={uiStore.branchesLoading()}
					filterQuery={uiStore.branchFilterQuery()}
					filterActive={uiStore.branchFilterActive()}
					worktreeCreateMode={uiStore.branchSelectorWorktreeCreateMode()}
					onFilterChange={(query) => {
						uiStore.setBranchFilterQuery(query);
						uiStore.setBranchSelectorIndex(0);
					}}
				/>
			</Show>

			<Show when={uiStore.showCreateBranchModal()}>
				<BranchCreateModal
					branchName={uiStore.createBranchName()}
					onBranchNameChange={(value) => uiStore.setCreateBranchName(value)}
				/>
			</Show>

			<Show when={uiStore.showErrorDialog()}>
				<ErrorDialog
					title={uiStore.errorDialogTitle()}
					message={uiStore.errorDialogMessage()}
					onClose={() => uiStore.setShowErrorDialog(false)}
				/>
			</Show>

			<Show when={uiStore.showConfirmDialog()}>
				<ConfirmDialog
					title={uiStore.confirmDialogTitle()}
					message={uiStore.confirmDialogMessage()}
				/>
			</Show>

			<Show when={uiStore.showProfilePicker()}>
				<ProfilePickerView
					profiles={uiStore.profilePickerProfiles()}
					hasDockerfile={uiStore.profilePickerHasDockerfile()}
					selectedIndex={uiStore.profilePickerSelectedIndex()}
					onSelect={uiStore.setProfilePickerSelectedIndex}
					onSubmit={(profile) => {
						uiStore.setShowProfilePicker(false);
						const ident = uiStore.profilePickerAppIdent();
						if (ident) {
							// Try to find an application first, otherwise look for an infra service.
							const appOrSvc =
								appStore.apps().find((a) => a.ident === ident) ||
								appStore.infraServices().find((s) => s.ident === ident);
							if (appOrSvc) {
								void dockerActions.performDockerOperation(
									"start",
									appOrSvc as any,
									profile === "default (no profile)" ? "" : profile,
								);
							}
						}
					}}
					onCancel={() => uiStore.setShowProfilePicker(false)}
					loading={uiStore.profilePickerLoading()}
				/>
			</Show>

			<Show when={uiStore.showEditorPicker()}>
				<EditorPickerView selectedIndex={uiStore.editorPickerSelectedIndex()} />
			</Show>

			<Show when={uiStore.showScriptArgsModal()}>
				<ScriptArgsModal
					scriptName={
						appStore.tableFilteredApps()[appStore.selectedIndex()]
							?.displayName || ""
					}
					parameters={uiStore.scriptArgsParameters()}
					values={uiStore.scriptArgValues()}
					selectedIndex={uiStore.scriptArgsSelectedIndex()}
					historyIndex={uiStore.scriptArgsHistoryCursor()}
					historyTotal={uiStore.scriptArgsHistoryForCurrent().length}
					error={uiStore.scriptArgsError()}
				/>
			</Show>

			<Show when={uiStore.showScriptAddModal()}>
				<ScriptAddModal
					mode={uiStore.scriptAddMode()}
					targetPath={uiStore.scriptAddTargetPath()}
					sourcePath={uiStore.scriptAddSourcePath()}
					selectedField={uiStore.scriptAddSelectedField()}
					error={uiStore.scriptAddError()}
				/>
			</Show>

			<Show when={uiStore.showLoadingModal()}>
				<box
					position="absolute"
					left={0}
					top={0}
					width={props.dimensions.width}
					height={props.dimensions.height}
					flexDirection="column"
					justifyContent="center"
					alignItems="center"
					backgroundColor={RGBA.fromInts(0, 0, 0, 150)}
				>
					<box
						border
						borderStyle="rounded"
						borderColor={uiColors.primary}
						style={{
							paddingLeft: 4,
							paddingRight: 4,
							paddingTop: 2,
							paddingBottom: 2,
							backgroundColor: uiColors.bgBase,
							flexDirection: "column",
							alignItems: "center",
							gap: 1,
						}}
					>
						<text fg={uiColors.primary}>
							{props.spinnerFrames[appStore.spinnerFrame()]}
						</text>
						<text fg={uiColors.textPrimary}>
							{uiStore.loadingModalMessage()}
						</text>
					</box>
				</box>
			</Show>

			<Show when={mrStore.showDiffModal() && mrStore.currentDiffFile()}>
				<DiffViewModal
					filePath={
						mrStore.currentDiffFile()!.new_path ||
						mrStore.currentDiffFile()!.old_path
					}
					diff={mrStore.currentDiffFile()!.diff}
					currentFileIndex={mrStore.selectedChangedFileIndex()}
					totalFiles={mrStore.mrChanges().length}
					selectedLine={mrStore.diffModalSelectedLine()}
					visualModeActive={mrStore.diffModalVisualMode()}
					visualModeStart={mrStore.diffModalVisualStart()}
					forceSplitView={mrStore.diffModalForceSplitView()}
					commentMode={mrStore.showCommentModal()}
					commentText={mrStore.commentText()}
					discussions={mrStore.mrDiscussions()}
					currentHeadSHA={mrStore.selectedMR()?.head_pipeline?.sha}
					replyModeDiscussionId={mrStore.replyMode()}
					replyText={mrStore.replyText()}
					collapsedThreads={mrStore.collapsedThreads()}
					onSelectedLineChange={mrStore.setDiffModalSelectedLine}
					onScrollBoxReady={(sb) => { mrStore.diffModalScrollBoxRef = sb; }}
					onReplyToDiscussion={mrActions.replyToDiscussion}
					onClose={() => {
						mrStore.setShowDiffModal(false);
						mrStore.setCurrentDiffFile(null);
						mrStore.setDiffModalSelectedLine(0);
						mrStore.setDiffModalVisualMode(false);
						mrStore.setDiffModalVisualStart(0);
						mrStore.setDiffModalForceSplitView(false);
						mrStore.diffModalScrollBoxRef = undefined;

						if (appStore.previousViewMode() === "discussionsView") {
							appStore.setViewMode("discussionsView");
						}
					}}
					onNavigateFile={(direction) => {
						const changes = mrStore.mrChanges();
						if (!changes || changes.length === 0) return;

						let newIndex: number;
						if (direction === 1) {
							newIndex =
								(mrStore.selectedChangedFileIndex() + 1) % changes.length;
						} else {
							newIndex = mrStore.selectedChangedFileIndex() - 1;
							if (newIndex < 0) newIndex = changes.length - 1;
						}

						mrStore.setSelectedChangedFileIndex(newIndex);
						mrStore.setDiffModalSelectedLine(0);
						mrStore.setCurrentDiffFile(changes[newIndex]);
					}}
				/>
			</Show>

			<Show when={logStore.showLogModal()}>
				<LogModal
					title={logStore.logTitle()}
					logs={logStore.logs()}
					onScrollBoxReady={(sb) => {
						logStore.logScrollBoxRef = sb;
						// Read the actual scrollTop and viewport height after the first
						// layout pass. stickyScroll has already positioned the viewport at
						// the bottom, so syncLogScroll correctly initialises logScrollTop.
						setTimeout(() => logActions.syncLogScroll(), 0);
					}}
					onClose={logActions.closeLogModal}
					scrollTop={logStore.logScrollTop()}
					viewportHeight={logStore.logViewportHeight()}
					selectedLine={logStore.logSelectedLine()}
					visualModeActive={logStore.logVisualModeActive()}
					visualModeStart={logStore.logVisualModeStart()}
					searchMode={logStore.logSearchMode()}
					searchQuery={logStore.logSearchQuery()}
					searchMatchLines={logStore.logSearchMatchLines()}
					searchMatchLinesList={logStore.logSearchMatchLinesList()}
					searchMatchIndex={logStore.logSearchMatchIndex()}
					aiPromptMode={logStore.logAiPromptMode()}
					aiPromptText={logStore.logAiPromptText()}
					aiLoading={logStore.logAiLoading()}
					aiStreaming={logStore.logAiStreaming()}
					aiSummary={logStore.logAiSummary()}
					aiError={logStore.logAiError()}
					aiVisible={logStore.logAiVisible()}
					aiFollowupText={logStore.logAiFollowupText()}
					onAiDismiss={logActions.dismissAiOverlay}
					onAiScrollBoxReady={(sb) => {
						logStore.logAiScrollBoxRef = sb;
					}}
				/>
			</Show>

			<Show when={mrStore.mrAiVisible()}>
				<MrAiReviewOverlay
					loading={mrStore.mrAiLoading()}
					streaming={mrStore.mrAiStreaming()}
					summary={mrStore.mrAiSummary()}
					error={mrStore.mrAiError()}
					onDismiss={() => mrStore.setMrAiVisible(false)}
					onScrollBoxReady={(sb) => {
						mrStore.mrAiScrollBoxRef = sb;
					}}
				/>
			</Show>

			<Show
				when={mrStore.showTestDetailModal() && mrStore.selectedTestForDetail()}
			>
				<TestDetailModal
					test={mrStore.selectedTestForDetail()!}
					copyStatus={mrStore.testDetailCopyStatus()}
					onCopy={() => {}}
					onClose={() => mrStore.setShowTestDetailModal(false)}
				/>
			</Show>

			<Show when={uiStore.copyStatus()}>
				<box
					position="absolute"
					right={2}
					bottom={1}
					paddingLeft={2}
					paddingRight={2}
					paddingTop={0}
					paddingBottom={0}
					backgroundColor={uiColors.success}
				>
					<text fg={uiColors.bgBase} attributes={TextAttributes.BOLD}>
						{uiStore.copyStatus()}
					</text>
				</box>
			</Show>
		</>
	);
}
