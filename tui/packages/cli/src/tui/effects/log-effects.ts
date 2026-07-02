import { createEffect, onCleanup } from 'solid-js';
import type { DevEnvClient } from '@devenv/core';

type LogEffectStore = {
  logRefreshParams: () => {
    type: 'container' | 'kubernetes' | 'operation' | 'action' | 'job' | null;
    containerID?: string;
    appIdent?: string;
    jobId?: number;
    sourceType?: string;
  };
  showLogModal: () => boolean;
  setLogs: (value: string | ((prev: string) => string)) => void;
};

let logStreamAbortController: AbortController | null = null;

export function setupLogEffects(logStore: LogEffectStore, client: DevEnvClient) {
  createEffect(() => {
    const params = logStore.logRefreshParams();
    if (!params.type || !logStore.showLogModal()) return;

    if (params.type === 'container' && params.containerID) {
      if (logStreamAbortController) logStreamAbortController.abort();
      const controller = new AbortController();
      logStreamAbortController = controller;
      client.streamContainerLogs(
        params.containerID,
        controller.signal,
        (line: string) => logStore.setLogs((prev) => (prev ? `${prev}\n${line}` : line)),
        (err: Error) => {
          if (err.name !== 'AbortError') console.error('Log stream error:', err);
        },
        '0',
      );
      onCleanup(() => {
        controller.abort();
        if (logStreamAbortController === controller) logStreamAbortController = null;
      });
      return;
    }

    if (params.type === 'job' && params.jobId && params.appIdent && params.sourceType !== 'github') {
      if (logStreamAbortController) logStreamAbortController.abort();
      const controller = new AbortController();
      logStreamAbortController = controller;
      client.streamJobLogs(
        params.appIdent,
        params.jobId,
        controller.signal,
        (line: string) => logStore.setLogs((prev) => (prev ? `${prev}\n${line}` : line)),
        (err: Error) => {
          if (err.name !== 'AbortError') console.error('Job log stream error:', err);
        },
      );
      onCleanup(() => {
        controller.abort();
        if (logStreamAbortController === controller) logStreamAbortController = null;
      });
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        if (params.type === 'operation' && params.appIdent) {
          logStore.setLogs(await client.getOperationLogs(params.appIdent, 1000));
        } else if (params.type === 'action' && params.appIdent) {
          logStore.setLogs(await client.getActionLog(params.appIdent));
        } else if (params.type === 'kubernetes' && params.appIdent) {
          logStore.setLogs(await client.getKubernetesLogs(params.appIdent));
        } else if (params.type === 'job' && params.jobId) {
          logStore.setLogs(await client.getJobLogs(params.appIdent || '', params.jobId, params.sourceType));
        }
      } catch {}
    }, 1000);

    onCleanup(() => clearInterval(intervalId));
  });
}
