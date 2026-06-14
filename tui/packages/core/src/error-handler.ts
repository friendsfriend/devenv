/**
 * Error handling utilities for the TUI
 * Provides standardized error handling and user-friendly error messages
 */

export interface ErrorResponse {
  error: string;
  message: string;
  code: number;
}

export interface ErrorHandlerOptions {
  onError?: (title: string, message: string) => void;
  defaultTitle?: string;
}

/**
 * Parse an error response from the server
 */
export function parseErrorResponse(response: Response, body: string): string {
  try {
    const json = JSON.parse(body) as ErrorResponse;
    if (json.message) {
      return json.message;
    }
  } catch {
    // Not JSON or doesn't have message field
  }
  
  // Fallback to status text or body
  if (body && body.length < 200) {
    return body;
  }
  
  return response.statusText || 'Unknown error';
}

/**
 * Extract a user-friendly error message from any error type
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object') {
    const err = error as any;
    if (err.message) return String(err.message);
    if (err.error) return String(err.error);
  }
  
  return 'An unknown error occurred';
}

/**
 * Wrap an async function with error handling that shows error dialog
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: ErrorHandlerOptions = {}
): T {
  const { onError, defaultTitle = 'Error' } = options;
  
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      const message = extractErrorMessage(error);
      
      if (onError) {
        onError(defaultTitle, message);
      } else {
        // Fallback: log to console
        console.error(`[${defaultTitle}]`, message, error);
      }
      
      throw error; // Re-throw so caller can handle if needed
    }
  }) as T;
}

/**
 * Handle fetch errors specifically
 */
export async function handleFetchError(
  response: Response,
  onError?: (title: string, message: string) => void
): Promise<never> {
  let errorMessage: string;
  
  try {
    const body = await response.text();
    errorMessage = parseErrorResponse(response, body);
  } catch {
    errorMessage = response.statusText || 'Network error';
  }
  
  const title = `HTTP ${response.status} Error`;
  
  if (onError) {
    onError(title, errorMessage);
  }
  
  throw new Error(`${title}: ${errorMessage}`);
}
