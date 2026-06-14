import { getLogger } from './logger';

/**
 * Custom fetch that uses native fetch (works in separate process)
 * Wrapped with logging for debugging
 */

export function createCustomFetch(): (url: string | URL, options?: RequestInit) => Promise<Response> {
  return async (url: string | URL, options?: RequestInit): Promise<Response> => {
    getLogger().write('DEBUG', `[FETCH] ${url}`);
    
    try {
      // Use native fetch - works fine in separate process
      const response = await fetch(url, options);
      getLogger().write('DEBUG', `[FETCH] ${url} -> ${response.status}`);
      return response;
    } catch (error) {
      getLogger().write('ERROR', `[FETCH] ${url} failed: ${error}`);
      throw error;
    }
  };
}

/**
 * Custom fetch with SSE support for subscribeToEvents
 */
export function createCustomFetchWithSSE(): (url: string | URL, options?: RequestInit) => Promise<Response> {
  // Use same implementation - native fetch handles SSE
  return createCustomFetch();
}
