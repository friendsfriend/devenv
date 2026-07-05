import type { ServerEvent } from '@devenv/types';
import type { ClientDeps } from './client-types';
import { handleFetchError } from './error-handler';

/**
 * Subscribe to server events (SSE).
 * Pass optional AbortSignal to cancel the subscription gracefully.
 */
export async function* subscribeToEvents(deps: ClientDeps, signal?: AbortSignal): AsyncGenerator<ServerEvent> {
  const response = await deps.sseFetchFn(`${deps.baseUrl}/api/events`, {
    signal,
  });
  if (!response.ok) {
    await handleFetchError(response, deps.onError);
    throw new Error(`Failed to subscribe to events: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  // If already aborted before we got the reader, bail early
  if (signal?.aborted) {
    await reader.cancel();
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  // Cancel reader when the abort signal fires so the read loop breaks cleanly
  const onAbort = () => { reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const event = JSON.parse(data) as ServerEvent;
            yield event;
          } catch (e) {
            console.error('Failed to parse event:', e);
          }
        }
      }
    }
  } finally {
    signal?.removeEventListener('abort', onAbort);
    try { reader.releaseLock(); } catch { /* reader may have been cancelled */ }
  }
}

/**
 * Check if server is healthy
 */
export async function health(deps: ClientDeps): Promise<boolean> {
  try {
    const response = await deps.fetchFn(`${deps.baseUrl}/api/health`, {
      signal: AbortSignal.timeout(1000),
    });
    return response.ok;
  } catch (e) {
    console.error(`Health check failed: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}
