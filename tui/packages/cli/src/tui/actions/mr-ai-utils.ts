import type { MergeRequest } from '@devenv/types';

/**
 * Builds the default review prompt shown to the user before they start the
 * review. The server appends the inline-comment callback instructions
 * automatically, so this just describes what the agent should review.
 */
export function buildMrReviewPrompt(mr: MergeRequest): string {
  const descLine = mr.description?.trim()
    ? `\nDescription: ${mr.description.trim()}`
    : '';

  return `You are reviewing a merge request. You are already inside the feature branch worktree.

MR: ${mr.title}
Branch: ${mr.source_branch} → ${mr.target_branch}
Author: ${mr.author?.name ?? 'unknown'} (@${mr.author?.username ?? 'unknown'})${descLine}

Start by running:
  git diff origin/${mr.target_branch}...HEAD

Review all changes and provide a structured code review. Browse relevant files for additional context as needed.`;
}
