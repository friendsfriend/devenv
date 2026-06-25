import { TextAttributes } from '@opentui/core';
import { createMemo, For, Show } from 'solid-js';
import { uiColors } from '../colors';
import type { Job } from '@devenv/types';
import { ScrollableList, LAYOUT_CHROME_LINES } from './ScrollableList';
import { CenteredState } from './CenteredState';
import { SearchHeader } from './SearchHeader';
import { getPipelineStatusColor } from '../statusUtils';

interface JobsDetailViewProps {
  jobs: Job[];
  pipelineId: number;
  selectedStageIndex: number;  // Parent-controlled
  selectedJobIndex: number;    // Parent-controlled
  onClose: () => void;
  onViewJobLogs?: (jobId: number, jobName: string) => void;
  onRetryJob?: (jobId: number, jobName: string) => void;
  onCancelJob?: (jobId: number, jobName: string) => void;
  loading?: boolean;
  error?: string;
  searchMode?: boolean;
  searchQuery?: string;
}

/**
 * JobsDetailView Component - Displays pipeline jobs organized by stages
 * Port of tui/jobsDetailView.go
 * 
 * Features:
 * - Jobs organized by stages with tab navigation
 * - Table showing: Status, Job Name, Duration, ID
 * - Color-coded status indicators
 * - Keyboard navigation: Tab/1-9 (stage tabs), ↑/↓ or j/k (jobs), Esc (back)
 * 
 * NOTE: This is a presentational component. Parent handles all keyboard events.
 * This is due to OpenTUI's limitation: only ONE useKeyboard() hook can be active.
 */
export function JobsDetailView(props: JobsDetailViewProps) {

  // Organize jobs by stage
  const organizedJobs = createMemo(() => {
    const byStage: Map<string, Job[]> = new Map();
    const stageFirstJobId: Map<string, number> = new Map();
    
    for (const job of props.jobs) {
      const stage = job.stage || 'default';
      if (!byStage.has(stage)) {
        byStage.set(stage, []);
        // Track the first (lowest ID) job for each stage to determine order
        stageFirstJobId.set(stage, job.id);
      } else {
        // Update if this job has a lower ID (created earlier)
        const currentFirstId = stageFirstJobId.get(stage)!;
        if (job.id < currentFirstId) {
          stageFirstJobId.set(stage, job.id);
        }
      }
      byStage.get(stage)!.push(job);
    }

    // Sort stages by the ID of their first job (execution order)
    const stages = Array.from(byStage.keys()).sort((a, b) => {
      const idA = stageFirstJobId.get(a) || 0;
      const idB = stageFirstJobId.get(b) || 0;
      return idA - idB;
    });
    
    return stages.map(stage => ({
      name: stage,
      jobs: byStage.get(stage)!,
    }));
  });

  // Get current stage jobs (filtered by search query)
  const currentStageJobs = createMemo(() => {
    const stages = organizedJobs();
    if (stages.length === 0) return [];
    const idx = props.selectedStageIndex;
    if (idx < 0 || idx >= stages.length) return [];
    const jobs = stages[idx].jobs;
    const q = (props.searchQuery ?? '').toLowerCase();
    if (!q) return jobs;
    return jobs.filter(j =>
      [j.name, j.status, String(j.id)].some(v => v && v.toLowerCase().includes(q))
    );
  });

  // Lines of fixed chrome outside the list area:
  //   Layout header (2) + Layout footer (3)  = LAYOUT_CHROME_LINES (5)
  //   Outer rounded border top + bottom      = 2
  //   Stage tabs bar                         = 3
  //   Table header row                       = 1
  //                                   Total  = 12
  const RESERVED_LINES = LAYOUT_CHROME_LINES + 2 + 3 + 1;

  // Format duration
  const formatDuration = (job: Job): string => {
    if (job.status === 'running' && job.started_at) {
      const start = new Date(job.started_at);
      const duration = Math.floor((Date.now() - start.getTime()) / 1000 / 60);
      return `${duration}m`;
    } else if (job.duration !== undefined && job.duration !== null) {
      const minutes = Math.floor(job.duration / 60);
      return `${minutes}m`;
    }
    return '-';
  };

  // Get stage border color based on job statuses
  // Priority: failed > warning/pending/running > success > default
  const getStageBorderColor = (jobs: Job[]): string => {
    let hasFailed = false;
    let hasWarning = false;
    let hasSuccess = false;

    for (const job of jobs) {
      const status = job.status.toLowerCase();
      
      // Check for failures (highest priority)
      if (status === 'failed') {
        hasFailed = true;
        break; // No need to check further, failure takes precedence
      }
      
      // Check for warnings/pending/running
      if (status === 'pending' || status === 'created' || status === 'running') {
        hasWarning = true;
      }
      
      // Check for success
      if (status === 'success') {
        hasSuccess = true;
      }
    }

    // Return color based on priority
    if (hasFailed) {
      return uiColors.error; // Red border for failed jobs
    }
    if (hasWarning) {
      return uiColors.warning; // Yellow border for pending/running jobs
    }
    if (hasSuccess) {
      return uiColors.success; // Green border for all successful
    }
    return uiColors.textMuted; // Gray border for other cases (canceled, skipped, etc.)
  };

  return (
    <box
      border={true}
      borderStyle="rounded"
      borderColor={uiColors.textMuted}
      style={{
        width: '100%',
        height: '100%',
        flexDirection: 'column',
      }}
    >
      <Show when={props.loading}>
        <CenteredState message="Loading pipeline jobs..." color={uiColors.primary} />
      </Show>

      <Show when={!props.loading && props.error}>
        <CenteredState message={props.error!} color={uiColors.error} />
      </Show>

      <Show when={!props.loading && !props.error && props.jobs.length === 0}>
        <CenteredState message="No jobs found for this pipeline" />
      </Show>

      {/* Jobs Table */}
      <Show when={!props.loading && !props.error && props.jobs.length > 0}>
        {/* Stage Tabs */}
        <box
          style={{
            width: '100%',
            flexDirection: 'row',
            gap: 1,
          }}
        >
          <For each={organizedJobs()}>
            {(stage, index) => {
              const isActive = () => props.selectedStageIndex === index();
              return (
                <box
                  border={true}
                  borderStyle="rounded"
                  borderColor={isActive() ? uiColors.primary : getStageBorderColor(stage.jobs)}
                  style={{
                    paddingLeft: 2,
                    paddingRight: 2,
                    height: 3,
                    alignItems: 'center',
                  }}
                >
                  <box
                    backgroundColor={isActive() ? uiColors.bgSurface0 : undefined}
                    style={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <text
                      fg={isActive() ? uiColors.primary : uiColors.textMuted}
                      attributes={isActive() ? TextAttributes.BOLD : undefined}
                    >
                      {stage.name} ({stage.jobs.length})
                    </text>
                  </box>
                </box>
              );
            }}
          </For>
        </box>

        {/* Table Header */}
        <SearchHeader searchMode={props.searchMode} searchQuery={props.searchQuery} resultCount={currentStageJobs().length}>
              <>
                <box style={{ width: '15%' }}>
                  <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>Status</text>
                </box>
                <box style={{ width: '50%' }}>
                  <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>Job Name</text>
                </box>
                <box style={{ width: '15%' }}>
                  <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>Duration</text>
                </box>
                <box style={{ width: '20%' }}>
                  <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>ID</text>
                </box>
              </>
        </SearchHeader>

        {/* Table Body — rendered via ScrollableList */}
        <ScrollableList<Job>
          items={currentStageJobs()}
          selectedIndex={props.selectedJobIndex}
          reservedLines={RESERVED_LINES}
          estimatedItemHeight={1}
          showScrollIndicator={false}
          emptyContent={<text fg={uiColors.textMuted}>No jobs in this stage</text>}
          renderItem={(job, isSelected) => (
            <box
              backgroundColor={isSelected() ? uiColors.bgSurface2 : undefined}
              style={{
                width: '100%',
                height: 1,
                flexDirection: 'row',
                paddingLeft: 1,
                paddingRight: 1,
              }}
            >
              <box style={{ width: '15%' }}>
                <text fg={getPipelineStatusColor(job.status)} attributes={TextAttributes.BOLD}>
                  {job.status.toUpperCase()}
                </text>
              </box>
              <box style={{ width: '50%' }}>
                <text style={{ fg: isSelected() ? uiColors.textPrimary : uiColors.textSecondary }}>
                  {job.name}
                </text>
              </box>
              <box style={{ width: '15%' }}>
                <text style={{ fg: uiColors.textSecondary }}>{formatDuration(job)}</text>
              </box>
              <box style={{ width: '20%' }}>
                <text style={{ fg: uiColors.textMuted }}>#{job.id}</text>
              </box>
            </box>
          )}
        />
      </Show>
    </box>
  );
}
