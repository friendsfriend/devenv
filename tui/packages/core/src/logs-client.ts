import type { StatusLogEntry } from '@devenv/types';
import type { ClientDeps } from './client-types';
import { handleFetchError } from './error-handler';

export async function getOperationLogs(
  deps: ClientDeps,
  appIdent: string,
  limit: number = 100
): Promise<string> {
  const response = await deps.fetchFn(
    `${deps.baseUrl}/api/logs/operation/${encodeURIComponent(appIdent)}?limit=${limit}`
  );

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }

  return await response.text();
}

export async function getActionLog(deps: ClientDeps, appIdent: string): Promise<string> {
  const response = await deps.fetchFn(
    `${deps.baseUrl}/api/logs/action/${encodeURIComponent(appIdent)}`
  );

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }

  return await response.text();
}

/**
 * Get recent status log entries
 */
export async function getStatusLog(deps: ClientDeps, limit: number = 50): Promise<StatusLogEntry[]> {
  const response = await deps.fetchFn(`${deps.baseUrl}/api/logs/status?limit=${limit}`);

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }

  const data = (await response.json()) as { entries: StatusLogEntry[] };
  return data.entries || [];
}

/**
 * Persist a status log entry to the backend. The server writes it to disk and
 * broadcasts it via SSE so all connected clients receive it immediately.
 */
export async function addStatusLog(
  deps: ClientDeps,
  entry: Pick<StatusLogEntry, 'AppIdent' | 'AppName' | 'Operation' | 'Status' | 'Message'>
): Promise<void> {
  const response = await deps.fetchFn(`${deps.baseUrl}/api/logs/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appIdent: entry.AppIdent,
      appName: entry.AppName,
      operation: entry.Operation,
      status: entry.Status,
      message: entry.Message,
    }),
  });

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }
}

export async function analyzeLogsWithAI(
  deps: ClientDeps,
  logs: string,
  prompt?: string
): Promise<string> {
  const response = await deps.fetchFn(`${deps.baseUrl}/api/ai/analyze-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logs, prompt: prompt ?? '' }),
  });

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }

  const data = (await response.json()) as { summary: string };
  return data.summary ?? '';
}

export async function* analyzeLogsWithAIStream(
  deps: ClientDeps,
  logs: string,
  prompt?: string,
  onSessionId?: (sessionId: string) => void,
): AsyncGenerator<string> {
  const body: Record<string, string> = { logs, prompt: prompt ?? '' };
  const response = await deps.sseFetchFn(`${deps.baseUrl}/api/ai/analyze-logs-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;
        let parsed: { delta?: string; done?: boolean; error?: string; sessionId?: string };
        try {
          parsed = JSON.parse(raw);
        } catch {
          continue;
        }
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.done) return;
        if (parsed.sessionId) {
          onSessionId?.(parsed.sessionId);
          continue;
        }
        if (parsed.delta) yield parsed.delta;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Streams an AI code review for a merge request.
 * The server creates a temporary git worktree with the CR's source branch,
 * spawns pi inside that worktree so it can run `git diff` and browse files
 * autonomously, and streams the output back.
 */
export async function* analyzeCRWithAIStream(
  deps: ClientDeps,
  appIdent: string,
  crIID: number,
  sourceBranch: string,
  targetBranch: string,
  prompt: string
): AsyncGenerator<string> {
  const body: Record<string, string | number> = { appIdent, crIID, sourceBranch, targetBranch, prompt };

  const response = await deps.sseFetchFn(`${deps.baseUrl}/api/ai/cr-review-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;
        let parsed: { delta?: string; done?: boolean; error?: string };
        try {
          parsed = JSON.parse(raw);
        } catch {
          continue;
        }
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.done) return;
        if (parsed.delta) yield parsed.delta;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
