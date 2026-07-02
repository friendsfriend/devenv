import type {
	App,
	AppStatus,
	ContainerStats,
	CreateAppRequest,
	DockerInfo,
	GitInfo,
	InfraService,
	Provider,
	ProviderCreateRequest,
	ProviderUpdateRequest,
	RepoSearchResult,
	ServerEvent,
	StatusLogEntry,
} from "@devenv/types";
import type { ClientDeps, FetchFunction } from "./client-types";
import {
	getAgentSessions,
	getAgentSpaces,
	getOpencodeAgents,
	getPiSessions,
	resolveAgentFile,
	resolveOpencodeConfig,
} from "./agent-client";
import {
	getApps,
	getDockerInfo,
	getGitInfo,
	getInfraServices,
	startInfraService,
	stopInfraService,
	getInfraServiceLogs,
	getProfiles,
	getStatus,
	createApp,
	deleteApp,
} from "./apps-client";
import {
	cancelJob,
	getJobLogs,
	getPipelineJobs,
	getTestSummary,
	retryJob,
	streamJobLogs,
} from "./ci-client";
import { createCustomFetch, createCustomFetchWithSSE } from "./custom-fetch";
import {
	buildApp,
	createShellActionScript,
	getActionTargets,
	getContainerLogs,
	getKubernetesLogs,
	restartContainer,
	runApp,
	startApp,
	startContainer,
	stopApp,
	stopContainer,
	streamContainerLogs,
	streamContainerStats,
	testApp,
} from "./docker-client";
import { health, subscribeToEvents } from "./events-client";
import { createExampleConfig } from "./example-config-client";
import {
	getBranches,
	gitCheckout,
	gitFetch,
	gitPull,
	gitPush,
	listWorktrees,
	removeWorktree,
	createWorktree,
	switchWorktree,
	gitCreateBranch,
} from "./git-client";
import {
	getIssues,
	getIssue,
	getIssueComments,
	closeIssue,
	reopenIssue,
	setIssueLabels,
	setIssueAssignee,
	removeIssueAssignee,
	addIssueComment,
	getRepoLabels,
	getRepoCollaborators,
	getIssueLinkedMRs,
	getIssueReferencedIssues,
	getMRLinkedIssues,
} from "./issues-client";
import {
	analyzeLogsWithAI,
	analyzeLogsWithAIStream,
	analyzeMRWithAIStream,
	getActionLog,
	getOperationLogs,
	getStatusLog,
	addStatusLog,
} from "./logs-client";
import {
	approveMergeRequest,
	createMRComment,
	getMergeRequests,
	getMRChanges,
	getMRDiscussions,
	getMRVersions,
	rebaseMR,
	replyToDiscussion,
	resolveDiscussion,
	toggleMRApproval,
	unapproveMergeRequest,
} from "./mr-client";
import {
	createProvider,
	deleteProvider,
	getProvider,
	getProviders,
	updateProvider,
} from "./provider-client";
import { getRepoBranches, searchRepos } from "./repos-client";
import {
	addScriptArgsHistory,
	createScript,
	deleteScript,
	executeScript,
	getScriptArgsHistory,
	getScriptMetadata,
	getScripts,
	linkScript,
} from "./scripts-client";

function createFetch(): FetchFunction {
	console.error(
		"[CLIENT] Using custom Node.js http-based fetch (Bun fetch is broken for localhost)",
	);
	return createCustomFetch() as FetchFunction;
}

export class DevEnvClient {
	private deps: ClientDeps;

	constructor(
		baseUrl = "http://127.0.0.1:4050",
		customFetch?: FetchFunction,
		onError?: (title: string, message: string) => void,
	) {
		this.deps = {
			baseUrl,
			fetchFn: customFetch || createFetch(),
			sseFetchFn: createCustomFetchWithSSE() as FetchFunction,
			onError,
		};
		console.error(
			`[CLIENT] DevEnvClient constructed with baseUrl: ${this.deps.baseUrl}`,
		);
	}

	getApps(): Promise<App[]> {
		return getApps(this.deps);
	}
	createExampleConfig(): Promise<void> {
		return createExampleConfig(this.deps);
	}
	getScripts(): Promise<import("@devenv/types").ScriptListResponse> {
		return getScripts(this.deps);
	}
	executeScript(
		relativePath: string,
		args: string[] = [],
	): Promise<import("@devenv/types").ExecuteScriptResponse> {
		return executeScript(this.deps, relativePath, args);
	}
	createScript(
		targetPath: string,
	): Promise<import("@devenv/types").ScriptMutationResponse> {
		return createScript(this.deps, targetPath);
	}
	linkScript(
		targetPath: string,
		sourcePath: string,
	): Promise<import("@devenv/types").ScriptMutationResponse> {
		return linkScript(this.deps, targetPath, sourcePath);
	}
	deleteScript(
		relativePath: string,
	): Promise<import("@devenv/types").ScriptMutationResponse> {
		return deleteScript(this.deps, relativePath);
	}
	getScriptArgsHistory(
		relativePath: string,
		limit: number = 50,
	): Promise<import("@devenv/types").ScriptArgsHistoryResponse> {
		return getScriptArgsHistory(this.deps, relativePath, limit);
	}
	addScriptArgsHistory(
		relativePath: string,
		values: Record<string, string>,
	): Promise<void> {
		return addScriptArgsHistory(this.deps, relativePath, values);
	}
	getScriptMetadata(
		relativePath: string,
	): Promise<import("@devenv/types").ScriptMetadataResponse> {
		return getScriptMetadata(this.deps, relativePath);
	}
	getInfraServices(): Promise<InfraService[]> {
		return getInfraServices(this.deps);
	}
	startInfraService(ident: string, runner?: string): Promise<void> {
		return startInfraService(this.deps, ident, runner);
	}
	stopInfraService(ident: string): Promise<void> {
		return stopInfraService(this.deps, ident);
	}
	getInfraServiceLogs(ident: string): Promise<string> {
		return getInfraServiceLogs(this.deps, ident);
	}
	getStatus(): Promise<AppStatus[]> {
		return getStatus(this.deps);
	}
	getDockerInfo(ident: string): Promise<DockerInfo> {
		return getDockerInfo(this.deps, ident);
	}
	getGitInfo(ident: string): Promise<GitInfo> {
		return getGitInfo(this.deps, ident);
	}
	getContainerLogs(containerID: string): Promise<string> {
		return getContainerLogs(this.deps, containerID);
	}
	streamContainerStats(
		containerID: string,
		signal: AbortSignal,
		onData: (stats: ContainerStats) => void,
		onError?: (err: Error) => void,
	): Promise<void> {
		return streamContainerStats(
			this.deps,
			containerID,
			signal,
			onData,
			onError,
		);
	}
	streamContainerLogs(
		containerID: string,
		signal: AbortSignal,
		onLine: (line: string) => void,
		onError?: (err: Error) => void,
		tail: string = "100",
	): Promise<void> {
		return streamContainerLogs(
			this.deps,
			containerID,
			signal,
			onLine,
			onError,
			tail,
		);
	}
	streamJobLogs(
		appIdent: string,
		jobId: number,
		signal: AbortSignal,
		onLine: (line: string) => void,
		onError?: (err: Error) => void,
	): Promise<void> {
		return streamJobLogs(this.deps, appIdent, jobId, signal, onLine, onError);
	}
	getOperationLogs(appIdent: string, limit: number = 100): Promise<string> {
		return getOperationLogs(this.deps, appIdent, limit);
	}
	getActionLog(appIdent: string): Promise<string> {
		return getActionLog(this.deps, appIdent);
	}
	getStatusLog(limit: number = 50): Promise<StatusLogEntry[]> {
		return getStatusLog(this.deps, limit);
	}
	addStatusLog(
		entry: Pick<
			StatusLogEntry,
			"AppIdent" | "AppName" | "Operation" | "Status" | "Message"
		>,
	): Promise<void> {
		return addStatusLog(this.deps, entry);
	}
	getMergeRequests(
		appIdent: string,
		state: string = "opened",
		scope: "current" | "all" = "current",
		sourceType?: string,
		page: number = 1,
		perPage: number = 50,
		search?: string,
		sort?: string,
		direction?: "asc" | "desc",
		labels?: string[],
	): Promise<import("@devenv/types").MRListResult> {
		return getMergeRequests(
			this.deps,
			appIdent,
			state,
			scope,
			sourceType,
			page,
			perPage,
			search,
			sort,
			direction,
			labels,
		);
	}
	getIssues(
		appIdent: string,
		scope: import("@devenv/types").IssueScope = "all",
		sourceType?: string,
		page: number = 1,
		perPage: number = 50,
		search?: string,
		state?: string,
		sort?: string,
		direction?: "asc" | "desc",
		labels?: string[],
	): Promise<import("@devenv/types").IssueListResult> {
		return getIssues(
			this.deps,
			appIdent,
			scope,
			sourceType,
			page,
			perPage,
			search,
			state,
			sort,
			direction,
			labels,
		);
	}
	getIssue(
		appIdent: string,
		number: number,
		sourceType?: string,
	): Promise<import("@devenv/types").Issue> {
		return getIssue(this.deps, appIdent, number, sourceType);
	}
	getIssueComments(
		appIdent: string,
		number: number,
		sourceType?: string,
	): Promise<import("@devenv/types").IssueCommentListResult> {
		return getIssueComments(this.deps, appIdent, number, sourceType);
	}

	// ─── Issue Mutations ───────────────────────────────────────────────────

	closeIssue(
		appIdent: string,
		number: number,
		sourceType: string | undefined,
		reason?: string,
	): Promise<import("@devenv/types").Issue> {
		return closeIssue(this.deps, appIdent, number, sourceType, reason);
	}

	reopenIssue(
		appIdent: string,
		number: number,
		sourceType: string | undefined,
	): Promise<import("@devenv/types").Issue> {
		return reopenIssue(this.deps, appIdent, number, sourceType);
	}

	setIssueLabels(
		appIdent: string,
		number: number,
		sourceType: string | undefined,
		labels: string[],
	): Promise<import("@devenv/types").Issue> {
		return setIssueLabels(this.deps, appIdent, number, sourceType, labels);
	}

	setIssueAssignee(
		appIdent: string,
		number: number,
		sourceType: string | undefined,
		assignee: string,
	): Promise<import("@devenv/types").Issue> {
		return setIssueAssignee(this.deps, appIdent, number, sourceType, assignee);
	}

	removeIssueAssignee(
		appIdent: string,
		number: number,
		sourceType: string | undefined,
	): Promise<import("@devenv/types").Issue> {
		return removeIssueAssignee(this.deps, appIdent, number, sourceType);
	}

	addIssueComment(
		appIdent: string,
		number: number,
		sourceType: string | undefined,
		body: string,
	): Promise<import("@devenv/types").IssueComment> {
		return addIssueComment(this.deps, appIdent, number, sourceType, body);
	}

	getRepoLabels(
		appIdent: string,
		sourceType: string | undefined,
	): Promise<string[]> {
		return getRepoLabels(this.deps, appIdent, sourceType);
	}

	getRepoCollaborators(
		appIdent: string,
		sourceType: string | undefined,
	): Promise<string[]> {
		return getRepoCollaborators(this.deps, appIdent, sourceType);
	}

	getIssueLinkedMRs(
		appIdent: string,
		number: number,
		sourceType?: string,
	): Promise<import("@devenv/types").MergeRequest[]> {
		return getIssueLinkedMRs(this.deps, appIdent, number, sourceType);
	}

	getIssueReferencedIssues(
		appIdent: string,
		number: number,
		sourceType?: string,
	): Promise<import("@devenv/types").Issue[]> {
		return getIssueReferencedIssues(this.deps, appIdent, number, sourceType);
	}

	getMRLinkedIssues(
		appIdent: string,
		number: number,
		sourceType?: string,
	): Promise<import("@devenv/types").Issue[]> {
		return getMRLinkedIssues(this.deps, appIdent, number, sourceType);
	}
	getPipelineJobs(
		appIdent: string,
		pipelineId: number,
		sourceType?: string,
	): Promise<import("@devenv/types").Job[]> {
		return getPipelineJobs(this.deps, appIdent, pipelineId, sourceType);
	}
	getTestSummary(
		appIdent: string,
		pipelineId: number,
		sourceType?: string,
	): Promise<import("@devenv/types").TestSummary> {
		return getTestSummary(this.deps, appIdent, pipelineId, sourceType);
	}
	getMRChanges(
		appIdent: string,
		mrIID: number,
		sourceType?: string,
	): Promise<import("@devenv/types").MRChange[]> {
		return getMRChanges(this.deps, appIdent, mrIID, sourceType);
	}
	getMRVersions(appIdent: string, mrIID: number): Promise<any[]> {
		return getMRVersions(this.deps, appIdent, mrIID);
	}
	createMRComment(
		appIdent: string,
		mrIID: number,
		body: string,
		position?: {
			baseSHA: string;
			headSHA: string;
			startSHA: string;
			positionType: string;
			newPath: string;
			oldPath: string;
			newLine?: number;
			oldLine?: number;
			lineCode?: string;
			lineRange?: {
				start: { type: string; oldLine?: number; newLine?: number };
				end: { type: string; oldLine?: number; newLine?: number };
			};
		},
	): Promise<{ status: string; message: string }> {
		return createMRComment(this.deps, appIdent, mrIID, body, position);
	}
	getMRDiscussions(
		appIdent: string,
		mrIID: number,
		sourceType?: string,
	): Promise<import("@devenv/types").Discussion[]> {
		return getMRDiscussions(this.deps, appIdent, mrIID, sourceType);
	}
	toggleMRApproval(
		appIdent: string,
		mrIID: number,
		sourceType?: string,
	): Promise<void> {
		return toggleMRApproval(this.deps, appIdent, mrIID, sourceType);
	}
	approveMergeRequest(
		appIdent: string,
		mrIID: number,
		sourceType?: string,
	): Promise<void> {
		return approveMergeRequest(this.deps, appIdent, mrIID, sourceType);
	}
	unapproveMergeRequest(
		appIdent: string,
		mrIID: number,
		sourceType?: string,
	): Promise<void> {
		return unapproveMergeRequest(this.deps, appIdent, mrIID, sourceType);
	}
	rebaseMR(appIdent: string, mrIID: number): Promise<void> {
		return rebaseMR(this.deps, appIdent, mrIID);
	}
	resolveDiscussion(
		appIdent: string,
		mrIID: number,
		discussionID: string,
		resolveAction: "resolve" | "unresolve",
	): Promise<{ status: string; message: string }> {
		return resolveDiscussion(
			this.deps,
			appIdent,
			mrIID,
			discussionID,
			resolveAction,
		);
	}
	replyToDiscussion(
		appIdent: string,
		mrIID: number,
		discussionID: string,
		body: string,
	): Promise<{ status: string; message: string }> {
		return replyToDiscussion(this.deps, appIdent, mrIID, discussionID, body);
	}
	getJobLogs(
		appIdent: string,
		jobId: number,
		sourceType?: string,
	): Promise<string> {
		return getJobLogs(this.deps, appIdent, jobId, sourceType);
	}
	analyzeLogsWithAI(logs: string, prompt?: string): Promise<string> {
		return analyzeLogsWithAI(this.deps, logs, prompt);
	}
	analyzeLogsWithAIStream(
		logs: string,
		prompt?: string,
		onSessionId?: (sessionId: string) => void,
		backend?: "opencode" | "pi",
	): AsyncGenerator<string> {
		return analyzeLogsWithAIStream(
			this.deps,
			logs,
			prompt,
			onSessionId,
			backend,
		);
	}
	analyzeMRWithAIStream(
		appIdent: string,
		mrIID: number,
		sourceBranch: string,
		targetBranch: string,
		prompt: string,
		backend?: "opencode" | "pi",
	): AsyncGenerator<string> {
		return analyzeMRWithAIStream(
			this.deps,
			appIdent,
			mrIID,
			sourceBranch,
			targetBranch,
			prompt,
			backend,
		);
	}
	searchRepos(
		provider: string,
		query: string,
		host?: string,
	): Promise<RepoSearchResult[]> {
		return searchRepos(this.deps, provider, query, host);
	}
	getRepoBranches(url: string, provider?: string): Promise<string[]> {
		return getRepoBranches(this.deps, url, provider);
	}
	createApp(request: CreateAppRequest): Promise<App> {
		return createApp(this.deps, request);
	}
	deleteApp(ident: string): Promise<void> {
		return deleteApp(this.deps, ident);
	}
	getProviders(): Promise<Provider[]> {
		return getProviders(this.deps);
	}
	getProvider(name: string): Promise<Provider> {
		return getProvider(this.deps, name);
	}
	createProvider(provider: ProviderCreateRequest): Promise<Provider> {
		return createProvider(this.deps, provider);
	}
	updateProvider(
		name: string,
		updates: ProviderUpdateRequest,
	): Promise<Provider> {
		return updateProvider(this.deps, name, updates);
	}
	deleteProvider(name: string): Promise<void> {
		return deleteProvider(this.deps, name);
	}
	startApp(appIdent: string, profile: string = "", targetId?: string): Promise<void> {
		return startApp(this.deps, appIdent, profile, targetId);
	}
	createShellActionScript(
		request: import("@devenv/types").ShellActionScriptRequest,
	): Promise<import("@devenv/types").ShellActionScriptResponse> {
		return createShellActionScript(this.deps, request);
	}
	getKubernetesLogs(appIdent: string): Promise<string> {
		return getKubernetesLogs(this.deps, appIdent);
	}
	getProfiles(
		appIdent: string,
	): Promise<{ profiles: string[]; hasDockerfile: boolean }> {
		return getProfiles(this.deps, appIdent);
	}
	getActionTargets(
		appIdent: string,
		action: import("@devenv/types").AppAction,
	): Promise<import("@devenv/types").ActionTarget[]> {
		return getActionTargets(this.deps, appIdent, action);
	}
	testApp(appIdent: string, targetId?: string): Promise<void> {
		return testApp(this.deps, appIdent, targetId);
	}
	runApp(appIdent: string, profile: string = "", targetId?: string): Promise<void> {
		return runApp(this.deps, appIdent, profile, targetId);
	}
	stopApp(appIdent: string, targetId?: string): Promise<void> {
		return stopApp(this.deps, appIdent, targetId);
	}
	startContainer(containerID: string): Promise<void> {
		return startContainer(this.deps, containerID);
	}
	stopContainer(containerID: string, appIdent?: string): Promise<void> {
		return stopContainer(this.deps, containerID, appIdent);
	}
	restartContainer(containerID: string, appIdent?: string): Promise<void> {
		return restartContainer(this.deps, containerID, appIdent);
	}
	gitPull(appIdent: string): Promise<void> {
		return gitPull(this.deps, appIdent);
	}
	gitPush(appIdent: string): Promise<void> {
		return gitPush(this.deps, appIdent);
	}
	gitFetch(appIdent: string): Promise<void> {
		return gitFetch(this.deps, appIdent);
	}
	getBranches(appIdent: string): Promise<{
		appIdent: string;
		currentBranch: string;
		localBranches: string[];
		remoteBranches: string[];
	}> {
		return getBranches(this.deps, appIdent);
	}
	gitCheckout(appIdent: string, branch: string): Promise<void> {
		return gitCheckout(this.deps, appIdent, branch);
	}
	listWorktrees(
		appIdent: string,
	): Promise<import("@devenv/types").WorktreeInfo[]> {
		return listWorktrees(this.deps, appIdent);
	}
	removeWorktree(appIdent: string, branch: string): Promise<void> {
		return removeWorktree(this.deps, appIdent, branch);
	}
	createWorktree(appIdent: string, branch: string): Promise<void> {
		return createWorktree(this.deps, appIdent, branch);
	}
	switchWorktree(appIdent: string, branch: string): Promise<void> {
		return switchWorktree(this.deps, appIdent, branch);
	}
	gitCreateBranch(appIdent: string, branchName: string): Promise<void> {
		return gitCreateBranch(this.deps, appIdent, branchName);
	}
	buildApp(appIdent: string, targetId?: string): Promise<void> {
		return buildApp(this.deps, appIdent, targetId);
	}
	retryJob(appIdent: string, jobId: number): Promise<void> {
		return retryJob(this.deps, appIdent, jobId);
	}
	cancelJob(appIdent: string, jobId: number): Promise<void> {
		return cancelJob(this.deps, appIdent, jobId);
	}
	subscribeToEvents(): AsyncGenerator<ServerEvent> {
		return subscribeToEvents(this.deps);
	}
	health(): Promise<boolean> {
		return health(this.deps);
	}
	getAgentSpaces(): Promise<import("@devenv/types").AgentSpace[]> {
		return getAgentSpaces(this.deps);
	}
	getAgentSessions(): Promise<import("@devenv/types").AgentGroup[]> {
		return getAgentSessions(this.deps);
	}
	getPiSessions(): Promise<import("@devenv/types").AgentGroup[]> {
		return getPiSessions(this.deps);
	}
	getOpencodeAgents(): Promise<string[]> {
		return getOpencodeAgents(this.deps);
	}
	resolveAgentFile(
		spaceId: string,
	): Promise<{ agentsDir: string; agentId: string }> {
		return resolveAgentFile(this.deps, spaceId);
	}
	resolveOpencodeConfig(): Promise<{ configPath: string }> {
		return resolveOpencodeConfig(this.deps);
	}
}

export function createClient(
	baseUrl?: string,
	customFetch?: FetchFunction,
	onError?: (title: string, message: string) => void,
): DevEnvClient {
	return new DevEnvClient(baseUrl, customFetch, onError);
}

export type { FetchFunction };
export * from "@devenv/types";
export * from "./logger";
export * from "./custom-fetch";
export * from "./clipboard";
export * from "./diff-utils";
