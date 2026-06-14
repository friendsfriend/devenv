import type { KeyboardEvent, KeyboardStores, KeyboardActions, KeyboardContext } from './types';

/**
 * Handles keyboard events for the Jobs view:
 * - Search mode (type query, clear)
 * - q to quit, / to search, ESC to go back
 * - v to view job logs, r to retry, c to cancel
 * - Tab/number keys for stage selection
 * - j/k for navigation
 */
export async function handleJobsKeys(
  event: KeyboardEvent,
  stores: KeyboardStores,
  actions: KeyboardActions,
  _ctx: KeyboardContext,
): Promise<boolean> {
  const { appStore, mrStore } = stores;
  const { appActions, logActions, pipelineActions } = actions;

  if (appStore.viewMode() !== 'jobs') return false;

  // Jobs search mode — capture all keys while user is typing
  if (mrStore.jobsSearchMode()) {
    if (
      event.name === 'escape' || event.name === 'Escape' ||
      event.name === 'esc' || event.sequence === '\x1b'
    ) {
      mrStore.setJobsSearchMode(false);
      mrStore.setJobsSearchQuery('');
      mrStore.setSelectedJobIndex(0);
      return true;
    }
    if (event.name === 'return' || event.name === 'enter') {
      mrStore.setJobsSearchMode(false);
      mrStore.setSelectedJobIndex(0);
      return true;
    }
    if (event.name === 'backspace' || event.name === 'delete') {
      mrStore.setJobsSearchQuery(q => q.slice(0, -1));
      mrStore.setSelectedJobIndex(0);
      return true;
    }
    const ch = event.sequence ?? event.name ?? '';
    if (ch.length === 1 && ch >= ' ') {
      mrStore.setJobsSearchQuery(q => q + ch);
      mrStore.setSelectedJobIndex(0);
      return true;
    }
    return true; // swallow all other keys
  }

  // q to quit
  if (event.name === 'q' || event.name === 'Q') {
    appActions.exitApp();
    return true;
  }

  // '/' to enter search mode
  if (event.name === '/' || event.sequence === '/') {
    mrStore.setJobsSearchMode(true);
    mrStore.setJobsSearchQuery('');
    mrStore.setSelectedJobIndex(0);
    return true;
  }

  // ESC: clear search first, then go back
  if (event.name === 'escape' || event.name === 'Escape' || event.name === 'esc') {
    if (mrStore.jobsSearchQuery()) {
      mrStore.setJobsSearchQuery('');
      mrStore.setJobsSearchMode(false);
      mrStore.setSelectedJobIndex(0);
      return true;
    }
    pipelineActions.backToMRDetail();
    return true;
  }

  const organizedJobs = pipelineActions.organizeJobsByStage();
  if (organizedJobs.length === 0) return true;

  const currentStageJobs = organizedJobs[mrStore.selectedJobStageIndex()]?.jobs || [];

  // 'v' to view job logs
  if (event.name === 'v') {
    if (currentStageJobs.length > 0 && mrStore.selectedJobIndex() < currentStageJobs.length) {
      const job = currentStageJobs[mrStore.selectedJobIndex()];
      logActions.loadJobLogs(job.id, job.name);
    }
    return true;
  }

  // 'r' to retry failed job
  if (event.name === 'r') {
    if (currentStageJobs.length > 0 && mrStore.selectedJobIndex() < currentStageJobs.length) {
      const job = currentStageJobs[mrStore.selectedJobIndex()];
      if (job.status === 'failed' || job.status === 'canceled') {
        pipelineActions.retryJob(job.id, job.name);
      }
    }
    return true;
  }

  // 'c' to cancel running job
  if (event.name === 'c') {
    if (currentStageJobs.length > 0 && mrStore.selectedJobIndex() < currentStageJobs.length) {
      const job = currentStageJobs[mrStore.selectedJobIndex()];
      if (job.status === 'running' || job.status === 'pending') {
        pipelineActions.cancelJob(job.id, job.name);
      }
    }
    return true;
  }

  // Tab to cycle through stages
  if (event.name === 'tab' || event.sequence === '\t') {
    mrStore.setSelectedJobStageIndex((prev) => {
      return prev >= organizedJobs.length - 1 ? 0 : prev + 1;
    });
    mrStore.setSelectedJobIndex(0);
    return true;
  }

  // Number keys (1-9) for direct stage selection
  const numMatch = event.name?.match(/^[1-9]$/);
  if (numMatch) {
    const stageNum = parseInt(numMatch[0], 10) - 1;
    if (stageNum >= 0 && stageNum < organizedJobs.length) {
      mrStore.setSelectedJobStageIndex(stageNum);
      mrStore.setSelectedJobIndex(0);
    }
    return true;
  }

  // j or Down to move down in job list
  if (event.name === 'j' || event.name === 'down' || event.name === 'Down') {
    mrStore.setSelectedJobIndex((prev) => Math.min(prev + 1, currentStageJobs.length - 1));
    return true;
  }

  // k or Up to move up in job list
  if (event.name === 'k' || event.name === 'up' || event.name === 'Up') {
    mrStore.setSelectedJobIndex((prev) => Math.max(prev - 1, 0));
    return true;
  }

  return true;
}
