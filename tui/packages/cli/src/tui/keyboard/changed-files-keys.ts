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

  if (mrStore.showListFilterModal() && mrStore.listControlTarget() === 'changedFiles') {
    const params = mrStore.listFilterParameters();
    const param = params[mrStore.listFilterParameterIndex()];
    const values = param?.values ?? [];
    if (event.name === 'escape' || event.name === 'esc' || event.sequence === '\x1b' || event.name === 'return' || event.name === 'enter') {
      mrStore.setShowListFilterModal(false);
      mrStore.setSelectedChangedFileIndex(0);
      return true;
    }
    if (isDownKey(event)) {
      if (mrStore.listFilterFocusedPane() === 'parameter') {
        mrStore.setListFilterParameterIndex(i => Math.min(params.length - 1, i + 1));
        mrStore.setListFilterValueIndex(0);
      } else mrStore.setListFilterValueIndex(i => Math.min(values.length - 1, i + 1));
      return true;
    }
    if (isUpKey(event)) {
      if (mrStore.listFilterFocusedPane() === 'parameter') {
        mrStore.setListFilterParameterIndex(i => Math.max(0, i - 1));
        mrStore.setListFilterValueIndex(0);
      } else mrStore.setListFilterValueIndex(i => Math.max(0, i - 1));
      return true;
    }
    if (event.name === 'right' || event.sequence === 'l') { mrStore.setListFilterFocusedPane('value'); return true; }
    if (event.name === 'left' || event.sequence === 'h') { mrStore.setListFilterFocusedPane('parameter'); return true; }
    if (event.sequence === ' ' && param && values[mrStore.listFilterValueIndex()]) {
      const value = values[mrStore.listFilterValueIndex()].value;
      mrStore.setCurrentListFilters(filters => {
        const current = filters[param.key] ?? [];
        return { ...filters, [param.key]: current.includes(value) ? current.filter(v => v !== value) : [...current, value] };
      });
      mrStore.setSelectedChangedFileIndex(0);
      return true;
    }
    return true;
  }

  if (mrStore.showListSortModal() && mrStore.listControlTarget() === 'changedFiles') {
    const rules = mrStore.currentListSortRules();
    const selected = mrStore.listSortSelectedIndex();
    if (event.name === 'escape' || event.name === 'esc' || event.sequence === '\x1b' || event.name === 'return' || event.name === 'enter') {
      mrStore.setShowListSortModal(false);
      mrStore.setSelectedChangedFileIndex(0);
      return true;
    }
    if (isDownKey(event)) { mrStore.setListSortSelectedIndex(i => Math.min(rules.length - 1, i + 1)); return true; }
    if (isUpKey(event)) { mrStore.setListSortSelectedIndex(i => Math.max(0, i - 1)); return true; }
    if (event.sequence === ' ') {
      const order = ['asc', 'desc', 'none'] as const;
      mrStore.setCurrentListSortRules(current => current.map((rule, index) => index === selected ? { ...rule, direction: order[(order.indexOf(rule.direction) + 1) % order.length] } : rule));
      mrStore.setSelectedChangedFileIndex(0);
      return true;
    }
    if (event.sequence === 'K' && selected > 0) {
      mrStore.setCurrentListSortRules(current => { const next = [...current]; [next[selected - 1], next[selected]] = [next[selected], next[selected - 1]]; return next; });
      mrStore.setListSortSelectedIndex(selected - 1);
      return true;
    }
    if (event.sequence === 'J' && selected < rules.length - 1) {
      mrStore.setCurrentListSortRules(current => { const next = [...current]; [next[selected], next[selected + 1]] = [next[selected + 1], next[selected]]; return next; });
      mrStore.setListSortSelectedIndex(selected + 1);
      return true;
    }
    return true;
  }

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

  if (event.sequence === 'F') {
    mrStore.setListControlTarget('changedFiles');
    mrStore.setListFilterParameterIndex(0);
    mrStore.setListFilterValueIndex(0);
    mrStore.setListFilterFocusedPane('parameter');
    mrStore.setShowListFilterModal(true);
    return true;
  }

  if (event.sequence === 'O') {
    mrStore.setListControlTarget('changedFiles');
    mrStore.setListSortSelectedIndex(0);
    mrStore.setShowListSortModal(true);
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
