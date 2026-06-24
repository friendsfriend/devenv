import { getLogger } from '@devenv/core';
import type { KeyboardEvent, KeyboardStores, KeyboardActions, KeyboardContext } from './types';
import { computeInitialSplitView } from './diff-modal-utils';

import { isDownKey, isUpKey } from './nav-keys';
/**
 * Handles keyboard events for the Changed Files view:
 * - Search mode (type query, clear)
 * - q to quit, / to search, ESC to go back
 * - Shift+D to switch to discussions view
 * - Enter to open diff modal
 * - j/k/g/G for navigation
 */
export async function handleChangedFilesKeys(
  event: KeyboardEvent,
  stores: KeyboardStores,
  actions: KeyboardActions,
  ctx: KeyboardContext,
): Promise<boolean> {
  const { appStore, mrStore } = stores;
  const { appActions } = actions;

  if (appStore.viewMode() !== 'changedFiles') return false;

  // Changed files search mode — capture all keys while user is typing
  if (mrStore.changedFilesSearchMode()) {
    if (
      event.name === 'escape' || event.name === 'Escape' ||
      event.name === 'esc' || event.sequence === '\x1b'
    ) {
      mrStore.setChangedFilesSearchMode(false);
      mrStore.setChangedFilesSearchQuery('');
      mrStore.setSelectedChangedFileIndex(0);
      return true;
    }
    if (event.name === 'return' || event.name === 'enter') {
      mrStore.setChangedFilesSearchMode(false);
      mrStore.setSelectedChangedFileIndex(0);
      return true;
    }
    if (event.name === 'backspace' || event.name === 'delete') {
      mrStore.setChangedFilesSearchQuery(q => q.slice(0, -1));
      mrStore.setSelectedChangedFileIndex(0);
      return true;
    }
    const ch = event.sequence ?? event.name ?? '';
    if (ch.length === 1 && ch >= ' ') {
      mrStore.setChangedFilesSearchQuery(q => q + ch);
      mrStore.setSelectedChangedFileIndex(0);
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
    mrStore.setChangedFilesSearchMode(true);
    mrStore.setChangedFilesSearchQuery('');
    mrStore.setSelectedChangedFileIndex(0);
    return true;
  }

  // ESC: clear search first, then go back to MR detail
  if (event.name === 'escape' || event.name === 'Escape' || event.name === 'esc') {
    if (mrStore.changedFilesSearchQuery()) {
      mrStore.setChangedFilesSearchQuery('');
      mrStore.setChangedFilesSearchMode(false);
      mrStore.setSelectedChangedFileIndex(0);
      return true;
    }
    mrStore.setSelectedChangedFileIndex(0);
    appStore.setViewMode('mergeRequestDetail');
    return true;
  }

  // Shift+D to switch to Discussions view
  if (event.sequence === 'D' || event.name === 'D' || (event.name === 'd' && event.shift)) {
    getLogger().write('DEBUG', `[CHANGED FILES VIEW] Shift+D detected! Switching to discussionsView`);
    mrStore.setDiscussionsShowOnlyComments(false);
    appStore.setViewMode('discussionsView');
    mrStore.setSelectedDiscussionIndex(0);
    return true;
  }

  const changes = mrStore.changedFilesFiltered();
  if (changes.length === 0) return true;

  if (event.name === 'return' || event.name === 'enter') {
    const selectedChange = changes[mrStore.selectedChangedFileIndex()];
    if (selectedChange && selectedChange.diff) {
      mrStore.setCurrentDiffFile(selectedChange);
      mrStore.setDiffModalSelectedLine(0);
      mrStore.setDiffModalVisualMode(false);
      mrStore.setDiffModalVisualStart(0);
      mrStore.setDiffModalForceSplitView(computeInitialSplitView(selectedChange.diff, ctx.renderer.width));
      mrStore.setShowDiffModal(true);
    }
    return true;
  }

  // j or Down to move down
  if (isDownKey(event)) {
    mrStore.setSelectedChangedFileIndex((prev) => Math.min(prev + 1, changes.length - 1));
    return true;
  }

  // k or Up to move up
  if (isUpKey(event)) {
    mrStore.setSelectedChangedFileIndex((prev) => Math.max(prev - 1, 0));
    return true;
  }

  // g to go to top
  if (event.name === 'g' || event.sequence === 'g') {
    mrStore.setSelectedChangedFileIndex(0);
    return true;
  }

  // G (Shift+G) to go to bottom
  if (event.sequence === 'G') {
    mrStore.setSelectedChangedFileIndex(changes.length - 1);
    return true;
  }

  return true;
}
