import { getLogger } from '@devenv/core';
import type { MergeRequest } from '@devenv/types';
import type { App } from '@devenv/types';
import { buildMrReviewPrompt } from './mr-ai-utils';

const isTmuxAvailable = (): boolean => {
  if (!process.env.TMUX) return false;
  try {
    const { spawnSync } = require('child_process') as typeof import('child_process');
    return spawnSync('which', ['tmux'], { stdio: 'ignore', shell: false }).status === 0;
  } catch {
    return false;
  }
};

/**
 * Creates a temporary git worktree for the MR's source branch, then launches the
 * chosen AI agent (opencode or pi) inside it with a pre-seeded review prompt.
 *
 * Flow:
 *   1. git worktree add <tmpPath> <sourceBranch>  (in app.localDirectoryPath)
 *   2. Write the review prompt to <tmpPath>/REVIEW_PROMPT.md
 *   3a. tmux available → spawn new tmux window: agent reads prompt, then worktree is cleaned up
 *   3b. no tmux       → suspend TUI, run agent synchronously, cleanup, resume TUI
 */
export async function launchMrAiReview(
  backend: 'opencode' | 'pi',
  mr: MergeRequest,
  app: App,
  renderer: { suspend: () => void; resume: () => void },
  showError: (title: string, message: string) => void,
): Promise<void> {
  const os = require('os') as typeof import('os');
  const path = require('path') as typeof import('path');
  const fs = require('fs') as typeof import('fs');
  const { spawnSync, execSync } = require('child_process') as typeof import('child_process');

  const worktreeId = `mr-review-${mr.iid}-${Date.now()}`;
  const worktreePath = path.join(os.tmpdir(), worktreeId);
  const promptFile = path.join(worktreePath, 'REVIEW_PROMPT.md');

  // --- 1. Create temp worktree ---
  try {
    execSync(`git worktree add "${worktreePath}" "${mr.source_branch}"`, {
      cwd: app.localDirectoryPath,
      stdio: 'pipe',
    });
    getLogger().write('INFO', `[MR AI Review] Worktree created: ${worktreePath}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    getLogger().write('ERROR', `[MR AI Review] Failed to create worktree: ${msg}`);
    showError('Worktree Failed', `Could not check out branch "${mr.source_branch}".\n\n${msg}`);
    return;
  }

  // --- 2. Write review prompt file ---
  const prompt = buildMrReviewPrompt(mr);
  try {
    fs.writeFileSync(promptFile, prompt, 'utf8');
  } catch (e) {
    getLogger().write('WARN', `[MR AI Review] Could not write prompt file: ${e}`);
  }

  const appPath = app.localDirectoryPath;
  const cleanupCmd = `git -C '${appPath}' worktree remove --force '${worktreePath}'`;

  // --- 3. Launch agent ---
  if (isTmuxAvailable()) {
    const windowName = `ai-review - ${app.displayName}`;

    let agentInvocation: string;
    if (backend === 'opencode') {
      // opencode run "<worktreePath>" with the prompt piped via shell substitution
      agentInvocation = `opencode run "$(cat '${promptFile}')"`;
    } else {
      // pi @file — pi natively reads @file paths as initial message content
      agentInvocation = `pi '@${promptFile}'`;
    }

    // Shell command: run agent, then clean up the worktree regardless of exit code
    const shellCmd = `${agentInvocation}; ${cleanupCmd}`;

    getLogger().write('INFO', `[MR AI Review] Spawning tmux window "${windowName}" in ${worktreePath}`);
    Bun.spawn(
      ['tmux', 'new-window', '-n', windowName, '-c', worktreePath, 'sh', '-c', shellCmd],
      { stdout: 'ignore', stderr: 'ignore', stdin: 'ignore' },
    ).unref();
  } else {
    // Non-tmux: suspend TUI, run synchronously, cleanup, resume
    renderer.suspend();
    try {
      if (backend === 'opencode') {
        spawnSync('sh', ['-c', `opencode run "$(cat '${promptFile}')"`], {
          stdio: 'inherit',
          shell: false,
          cwd: worktreePath,
        });
      } else {
        spawnSync('pi', [`@${promptFile}`], {
          stdio: 'inherit',
          shell: false,
          cwd: worktreePath,
        });
      }
    } finally {
      renderer.resume();
      // Cleanup worktree after agent exits
      try {
        execSync(cleanupCmd, { stdio: 'ignore' });
        getLogger().write('INFO', `[MR AI Review] Worktree cleaned up: ${worktreePath}`);
      } catch (e) {
        getLogger().write('WARN', `[MR AI Review] Worktree cleanup failed: ${e}`);
      }
    }
  }
}
