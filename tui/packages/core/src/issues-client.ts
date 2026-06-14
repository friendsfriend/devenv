import type {
	Issue,
	IssueCommentListResult,
	IssueListResult,
	IssueScope,
} from "@devenv/types";
import type { ClientDeps } from "./client-types";
import { handleFetchError } from "./error-handler";

/**
 * Get issues for a specific app with scope filter and pagination.
 */
export async function getIssues(
	deps: ClientDeps,
	appIdent: string,
	scope: IssueScope = "all",
	sourceType?: string,
	page: number = 1,
	perPage: number = 50,
	search?: string,
): Promise<IssueListResult> {
	const params = new URLSearchParams({
		appIdent,
		scope,
	});
	if (search) {
		params.append("search", search);
	}
	params.append("page", String(page));
	params.append("perPage", String(perPage));

	const endpoint = sourceType === "github" ? "github/issues" : "gitlab/issues";
	const response = await deps.fetchFn(
		`${deps.baseUrl}/api/${endpoint}?${params}`,
	);

	if (response.status === 404 || response.status === 400) {
		return {
			items: [],
			totalCount: -1,
			totalPages: -1,
			currentPage: 1,
			perPage,
		};
	}

	if (!response.ok) {
		await handleFetchError(response, deps.onError);
	}

	return (await response.json()) as IssueListResult;
}

/**
 * Get a single issue by number.
 */
export async function getIssue(
	deps: ClientDeps,
	appIdent: string,
	number: number,
	sourceType?: string,
): Promise<Issue> {
	const endpoint = sourceType === "github" ? "github/issue" : "gitlab/issue";
	const response = await deps.fetchFn(
		`${deps.baseUrl}/api/${endpoint}?appIdent=${encodeURIComponent(appIdent)}&number=${number}`,
	);

	if (!response.ok) {
		await handleFetchError(response, deps.onError);
	}

	return (await response.json()) as Issue;
}

/**
 * Get comments for a specific issue.
 */
export async function getIssueComments(
	deps: ClientDeps,
	appIdent: string,
	number: number,
	sourceType?: string,
): Promise<IssueCommentListResult> {
	const endpoint =
		sourceType === "github" ? "github/issue-comments" : "gitlab/issue-comments";
	const response = await deps.fetchFn(
		`${deps.baseUrl}/api/${endpoint}?appIdent=${encodeURIComponent(appIdent)}&number=${number}`,
	);

	if (!response.ok) {
		await handleFetchError(response, deps.onError);
	}

	return (await response.json()) as IssueCommentListResult;
}
