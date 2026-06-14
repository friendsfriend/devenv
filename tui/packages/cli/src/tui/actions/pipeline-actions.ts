import type { DevEnvClient } from '@devenv/core';
import type { Job } from '@devenv/types';
import type { AppStore } from '../stores/app-store';
import type { MrStore } from '../stores/mr-store';

export function createPipelineActions(
  appStore: AppStore,
  mrStore: MrStore,
  client: DevEnvClient,
  showError: (title: string, message: string) => void,
) {
  const loadPipelineJobs = async () => {
    const app = appStore.tableFilteredApps()[appStore.selectedIndex()];
    const mr = mrStore.selectedMR();
    if (!app || !mr || !mr.head_pipeline) {
      const msg = !app ? 'No app selected' : !mr ? 'No merge request selected' : 'No pipeline available for this merge request';
      mrStore.setJobsError(msg);
      mrStore.setJobsLoading(false);
      if (!mr || !mr.head_pipeline) return;
    }
    mrStore.setJobsLoading(true);
    mrStore.setJobsError('');
    mrStore.setCurrentPipelineId(mr!.head_pipeline!.id);
    appStore.setViewMode('jobs');
    try {
      mrStore.setJobs(await client.getPipelineJobs(app!.ident, mr!.head_pipeline!.id, app!.sourceType));
    } catch (e) {
      mrStore.setJobsError(`Failed to load pipeline #${mr!.head_pipeline!.id}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      mrStore.setJobs([]);
    } finally {
      mrStore.setJobsLoading(false);
    }
  };

  const organizeJobsByStage = () => {
    const byStage: Map<string, Job[]> = new Map();
    const stageFirstJobId: Map<string, number> = new Map();
    for (const job of mrStore.jobs()) {
      const stage = job.stage || 'default';
      if (!byStage.has(stage)) {
        byStage.set(stage, []);
        stageFirstJobId.set(stage, job.id);
      } else if (job.id < (stageFirstJobId.get(stage) || Number.MAX_SAFE_INTEGER)) {
        stageFirstJobId.set(stage, job.id);
      }
      byStage.get(stage)!.push(job);
    }
    const stages = Array.from(byStage.keys()).sort((a, b) => (stageFirstJobId.get(a) || 0) - (stageFirstJobId.get(b) || 0));
    return stages.map((stage) => ({ name: stage, jobs: byStage.get(stage)! }));
  };

  const backToMRDetail = () => {
    mrStore.setJobs([]);
    mrStore.setJobsError('');
    mrStore.setCurrentPipelineId(null);
    mrStore.setSelectedJobStageIndex(0);
    mrStore.setSelectedJobIndex(0);
    mrStore.setJobsSearchMode(false);
    mrStore.setJobsSearchQuery('');
    appStore.setViewMode('mergeRequestDetail');
  };

  const retryJob = async (jobId: number, jobName: string) => {
    const app = appStore.tableFilteredApps()[appStore.selectedIndex()];
    if (!app) return;
    try {
      await client.retryJob(app.ident, jobId);
      console.log(`Job ${jobName} (#${jobId}) retry initiated`);
    } catch (e) {
      showError('Job Retry Failed', `Failed to retry job "${jobName}" (#${jobId}).\n\nError: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const cancelJob = async (jobId: number, jobName: string) => {
    const app = appStore.tableFilteredApps()[appStore.selectedIndex()];
    if (!app) return;
    try {
      await client.cancelJob(app.ident, jobId);
      console.log(`Job ${jobName} (#${jobId}) cancel initiated`);
    } catch (e) {
      showError('Job Cancel Failed', `Failed to cancel job "${jobName}" (#${jobId}).\n\nError: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  return { loadPipelineJobs, organizeJobsByStage, backToMRDetail, retryJob, cancelJob };
}

export type PipelineActions = ReturnType<typeof createPipelineActions>;
