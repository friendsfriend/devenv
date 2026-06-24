import { getLogger } from '@devenv/core';
import type { AppStore } from '../stores';
import type { AppActions } from './app-actions';

interface InitDeps {
  client: ReturnType<typeof import('@devenv/core').createClient>;
  appStore: AppStore;
  appActions: AppActions;
  showError: (title: string, message: string) => void;
  serverUrl: string;
}

/**
 * Runs initialization logic on mount: health check with retries,
 * initial data fetch (apps, infra), and starts background subscriptions.
 */
export async function initializeApp(deps: InitDeps): Promise<void> {
  const { client, appStore, appActions, showError, serverUrl } = deps;

  getLogger().write('INFO', '====== TUI APP MOUNTED ======');
  getLogger().write('INFO', `Server URL: ${serverUrl}`);
  getLogger().write('INFO', `Client baseUrl: ${(client as any).baseUrl}`);

  try {
    let healthy = false;
    let retries = 10;
    let delay = 100;

    appStore.setStartupState({
      phase: 'connecting',
      message: 'Connecting to DevEnv server...',
      error: null,
    });

    while (retries > 0 && !healthy) {
      const attempt = 11 - retries;
      appStore.setStartupState({
        phase: 'connecting',
        message: `Connecting to DevEnv server... attempt ${attempt}/10`,
        error: null,
      });
      getLogger().write('DEBUG', `Attempting health check to: ${(client as any).baseUrl}/api/health`);
      healthy = await client.health();
      if (!healthy) {
        getLogger().write('DEBUG', `Health check failed, retries left: ${retries}, waiting ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 1.5, 2000);
        retries--;
      } else {
        getLogger().write('INFO', 'Health check succeeded!');
      }
    }

    if (!healthy) {
      const message = `Cannot connect to DevEnv server at ${serverUrl}. The server may still be starting or may have failed to start.`;
      appStore.setStartupState({
        phase: 'failed',
        message: 'Connection failed',
        error: message,
      });
      appStore.setError(message);
      showError('Server Connection Failed', message);
      return;
    }

    getLogger().write('INFO', 'Server health check passed!');
    appStore.setStartupState({
      phase: 'server-ready',
      message: 'DevEnv server is ready.',
      error: null,
    });
    const serverProcess = (global as any).__devenvServerProcess;
    if (serverProcess) {
      getLogger().write('DEBUG', `[APP] Server process status before apps fetch - killed: ${serverProcess.killed}, exitCode: ${serverProcess.exitCode}`);
    }

    getLogger().write('DEBUG', 'Fetching apps...');
    appStore.setStartupState({
      phase: 'loading-applications',
      message: 'Loading applications...',
      error: null,
    });
    getLogger().write('DEBUG', `About to call client.getApps() with baseUrl: ${(client as any).baseUrl}`);
    const fetchedApps = await client.getApps();
    getLogger().write('DEBUG', `Fetched ${fetchedApps.length} apps`);

    if (serverProcess) {
      getLogger().write('DEBUG', `[APP] Server process status after apps fetch - killed: ${serverProcess.killed}, exitCode: ${serverProcess.exitCode}`);
    }

    appStore.setApps(fetchedApps);
    appStore.setStartupState({
      phase: 'loading-infrastructure',
      message: 'Loading infrastructure services...',
      error: null,
    });
    getLogger().write('DEBUG', 'Fetching infrastructure services...');
    const fetchedInfraServices = await client.getInfraServices();
    getLogger().write('DEBUG', `Fetched ${fetchedInfraServices.length} infrastructure services`);
    appStore.setInfraServices(fetchedInfraServices);
    await appActions.loadScripts();

    getLogger().write('INFO', 'Initial data fetch complete');
    appStore.setStartupState({
      phase: 'complete',
      message: 'Startup complete.',
      error: null,
    });
    appStore.setLoading(false);

    void appActions.fetchStatus();
    void appActions.subscribeToUpdates();
    void appActions.fetchStatusLog();
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error occurred during initialization';
    getLogger().write('ERROR', `Initialization error: ${errorMsg}`);
    if (e instanceof Error && e.stack) {
      getLogger().write('ERROR', `Stack: ${e.stack}`);
    }
    showError('Initialization Failed', errorMsg);
    appStore.setLoading(false);
  }
}
