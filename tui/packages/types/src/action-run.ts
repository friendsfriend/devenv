export type ActionRunStatus = 'pending' | 'active' | 'completed' | 'failed' | 'canceled';

export interface ActionCommand {
  id: string;
  command: string;
  status: ActionRunStatus;
  stdout: string;
  stderr: string;
  stdoutChunks?: string[];
  stderrChunks?: string[];
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

export interface ActionStep {
  id: string;
  label: string;
  status: ActionRunStatus;
  parentId?: string;
  depth?: number;
  collapsed?: boolean;
  commands: ActionCommand[];
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

export interface ActionRun {
  id: string;
  appIdent?: string;
  action?: string;
  kind?: 'app' | 'task' | 'git' | 'worktree' | 'infrastructure' | 'kubernetes' | 'utility' | string;
  profile?: string;
  targetLabel?: string;
  metadata?: Record<string, string | number | boolean>;
  title: string;
  status: ActionRunStatus;
  steps: ActionStep[];
  startedAt?: string;
  finishedAt?: string;
  collapsed?: boolean;
}

export type ActionEventProperties =
  | { run: ActionRun }
  | { runId: string; stepId: string; commandId: string; command: string; index: number }
  | { runId: string; stepId: string; commandId: string; output: string; stream: 'stdout' | 'stderr' }
  | { runId: string; stepId: string; status: 'starting' | 'healthy' | 'failed' }
  | { runId: string; stepId: string }
  | { runId: string; stepId: string; error: string }
  | { runId: string; status: ActionRunStatus };
