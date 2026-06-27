import type { Discussion, MRChange, MergeRequest, MRListResult } from '@devenv/types';
import type { ClientDeps } from './client-types';
import { handleFetchError } from './error-handler';

/**
 * Get merge requests for a specific app, with pagination support.
 * Returns a paginated result with items and metadata.
 */
export async function getMergeRequests(
  deps: ClientDeps,
  appIdent: string,
  state: string = 'opened',
  scope: 'current' | 'all' = 'current',
  sourceType?: string,
  page: number = 1,
  perPage: number = 50,
  search?: string,
  sort?: string,
  direction?: 'asc' | 'desc',
  labels?: string[],
): Promise<MRListResult> {
  const params = new URLSearchParams({
    appIdent,
    state,
  });
  if (scope === 'all') {
    params.append('allBranches', 'true');
  }
  if (search) {
    params.append('search', search);
  }
  if (sort) params.append('sort', sort);
  if (direction) params.append('direction', direction);
  if (labels?.length) params.append('labels', labels.join(','));
  params.append('page', String(page));
  params.append('perPage', String(perPage));
  const endpoint = sourceType === 'github' ? 'github/pull-requests' : 'gitlab/merge-requests';
  const response = await deps.fetchFn(`${deps.baseUrl}/api/${endpoint}?${params}`);

  if (response.status === 404 || response.status === 400) {
    return { items: [], totalCount: -1, totalPages: -1, currentPage: 1, perPage };
  }

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }

  return (await response.json()) as MRListResult;
}

/**
 * Get changed files for a specific merge request
 */
export async function getMRChanges(
  deps: ClientDeps,
  appIdent: string,
  mrIID: number,
  sourceType?: string
): Promise<MRChange[]> {
  const endpoint = sourceType === 'github' ? 'github/pr-changes' : 'gitlab/mr-changes';
  const response = await deps.fetchFn(
    `${deps.baseUrl}/api/${endpoint}?appIdent=${encodeURIComponent(appIdent)}&mrIID=${mrIID}`
  );

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }

  return (await response.json()) as MRChange[];
}

/**
 * Get MR versions (SHAs) for a specific merge request
 */
export async function getMRVersions(deps: ClientDeps, appIdent: string, mrIID: number): Promise<any[]> {
  const url = `${deps.baseUrl}/api/gitlab/mr-versions?appIdent=${encodeURIComponent(appIdent)}&mrIID=${mrIID}`;
  const response = await deps.fetchFn(url);

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }

  return (await response.json()) as any[];
}

/**
 * Create a comment on a merge request diff
 */
export async function createMRComment(
  deps: ClientDeps,
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
      start: {
        type: string;
        oldLine?: number;
        newLine?: number;
      };
      end: {
        type: string;
        oldLine?: number;
        newLine?: number;
      };
    };
  }
): Promise<{ status: string; message: string }> {
  const payload: any = {
    appIdent,
    mrIID,
    body,
  };
  if (position) {
    payload.position = {
      base_sha: position.baseSHA,
      head_sha: position.headSHA,
      start_sha: position.startSHA,
      position_type: position.positionType,
      new_path: position.newPath,
      old_path: position.oldPath,
      new_line: position.newLine,
      old_line: position.oldLine,
    };

    if (position.lineCode) {
      payload.position.line_code = position.lineCode;
    }

    if (position.lineRange) {
      payload.position.line_range = {
        start: {
          type: position.lineRange.start.type,
          old_line: position.lineRange.start.oldLine,
          new_line: position.lineRange.start.newLine,
        },
        end: {
          type: position.lineRange.end.type,
          old_line: position.lineRange.end.oldLine,
          new_line: position.lineRange.end.newLine,
        },
      };
    }
  }

  console.error('[SDK] Payload being sent:', JSON.stringify(payload, null, 2));

  const response = await deps.fetchFn(`${deps.baseUrl}/api/gitlab/mr-comment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }

  return (await response.json()) as { status: string; message: string };
}

/**
 * Get discussions (comments) for a merge request
 */
export async function getMRDiscussions(
  deps: ClientDeps,
  appIdent: string,
  mrIID: number,
  sourceType?: string
): Promise<Discussion[]> {
  const endpoint = sourceType === 'github' ? 'github/pr-discussions' : 'gitlab/mr-discussions';
  const response = await deps.fetchFn(
    `${deps.baseUrl}/api/${endpoint}?appIdent=${encodeURIComponent(appIdent)}&mrIID=${mrIID}`
  );

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }

  return (await response.json()) as Discussion[];
}

/**
 * Toggle merge request approval (approve if not approved, unapprove if already approved)
 * Backend determines the current approval state using the configured GitLab username
 */
export async function toggleMRApproval(
  deps: ClientDeps,
  appIdent: string,
  mrIID: number,
  sourceType?: string
): Promise<void> {
  const endpoint = sourceType === 'github' ? 'github/pr-toggle-approval' : 'gitlab/mr-toggle-approval';
  const response = await deps.fetchFn(
    `${deps.baseUrl}/api/${endpoint}?appIdent=${encodeURIComponent(appIdent)}&mrIID=${mrIID}`,
    { method: 'POST' }
  );

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }
}

/**
 * Approve a merge request
 */
export async function approveMergeRequest(
  deps: ClientDeps,
  appIdent: string,
  mrIID: number,
  sourceType?: string
): Promise<void> {
  const endpoint = sourceType === 'github' ? 'github/pr-approve' : 'gitlab/mr-approve';
  const response = await deps.fetchFn(
    `${deps.baseUrl}/api/${endpoint}?appIdent=${encodeURIComponent(appIdent)}&mrIID=${mrIID}`,
    { method: 'POST' }
  );

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }
}

/**
 * Unapprove a merge request (remove approval)
 */
export async function unapproveMergeRequest(
  deps: ClientDeps,
  appIdent: string,
  mrIID: number,
  sourceType?: string
): Promise<void> {
  const endpoint = sourceType === 'github' ? 'github/pr-unapprove' : 'gitlab/mr-unapprove';
  const response = await deps.fetchFn(
    `${deps.baseUrl}/api/${endpoint}?appIdent=${encodeURIComponent(appIdent)}&mrIID=${mrIID}`,
    { method: 'POST' }
  );

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }
}

/**
 * Rebase a merge request
 */
export async function rebaseMR(deps: ClientDeps, appIdent: string, mrIID: number): Promise<void> {
  const response = await deps.fetchFn(
    `${deps.baseUrl}/api/gitlab/mr-rebase?appIdent=${encodeURIComponent(appIdent)}&mrIID=${mrIID}`,
    { method: 'POST' }
  );

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }
}

/**
 * Resolve or unresolve a discussion thread
 */
export async function resolveDiscussion(
  deps: ClientDeps,
  appIdent: string,
  mrIID: number,
  discussionID: string,
  resolveAction: 'resolve' | 'unresolve'
): Promise<{ status: string; message: string }> {
  const response = await deps.fetchFn(`${deps.baseUrl}/api/gitlab/mr-discussion-resolve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      appIdent,
      mrIID,
      discussionID,
      resolved: resolveAction === 'resolve',
    }),
  });

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }

  return (await response.json()) as { status: string; message: string };
}

/**
 * Reply to an existing discussion thread
 */
export async function replyToDiscussion(
  deps: ClientDeps,
  appIdent: string,
  mrIID: number,
  discussionID: string,
  body: string
): Promise<{ status: string; message: string }> {
  const response = await deps.fetchFn(`${deps.baseUrl}/api/gitlab/mr-discussion-reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      appIdent,
      mrIID,
      discussionID,
      body,
    }),
  });

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }

  return (await response.json()) as { status: string; message: string };
}
