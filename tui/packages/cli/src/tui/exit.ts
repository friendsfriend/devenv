let renderer: { destroy(): void } | null = null;

const abortController = new AbortController();

/** Get the shared abort signal used to cancel background work on exit. */
export function getExitSignal(): AbortSignal {
  return abortController.signal;
}

export function setExitRenderer(r: { destroy(): void }) {
  renderer = r;
}

export function exitApp() {
  process.exitCode = 0;
  // Cancel SSE subscription and other background work first
  abortController.abort();
  renderer?.destroy();
}
