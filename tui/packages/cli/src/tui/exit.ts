type ExitRenderer = { destroy(): void };
type GracefulShutdownHandler = () => void | Promise<void>;

let renderer: ExitRenderer | null = null;
let gracefulShutdownHandler: GracefulShutdownHandler | null = null;
let gracefulShutdownPromise: Promise<void> | null = null;
let abortController = new AbortController();

/** Get the shared abort signal used to cancel background work on exit. */
export function getExitSignal(): AbortSignal {
  return abortController.signal;
}

export function abortExitSignal() {
  if (!abortController.signal.aborted) abortController.abort();
}

export function setExitRenderer(r: ExitRenderer) {
  renderer = r;
}

export function destroyExitRenderer() {
  renderer?.destroy();
}

export function registerGracefulShutdownHandler(handler: GracefulShutdownHandler) {
  gracefulShutdownHandler = handler;
  return () => {
    if (gracefulShutdownHandler === handler) gracefulShutdownHandler = null;
  };
}

function fallbackExit() {
  abortExitSignal();
  destroyExitRenderer();
}

export function exitApp(): Promise<void> {
  process.exitCode = 0;
  if (!gracefulShutdownHandler) {
    fallbackExit();
    return Promise.resolve();
  }
  if (!gracefulShutdownPromise) {
    gracefulShutdownPromise = Promise.resolve()
      .then(() => gracefulShutdownHandler?.())
      .catch(() => fallbackExit());
  }
  return gracefulShutdownPromise;
}

export function immediateExitApp() {
  process.exitCode = 0;
  fallbackExit();
}

export function __resetExitForTests() {
  renderer = null;
  gracefulShutdownHandler = null;
  gracefulShutdownPromise = null;
  abortController = new AbortController();
}
