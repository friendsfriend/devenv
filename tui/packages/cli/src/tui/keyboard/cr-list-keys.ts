import type { KeyboardEvent, KeyboardStores, KeyboardActions, KeyboardContext } from './types';

import { isDownKey, isUpKey } from './nav-keys';
import { isNextRelatedKey, isPreviousRelatedKey } from './horizontal-scroll';
/**
 * Handles keyboard events for the CR list view:
 * - Search mode (type query, clear)
 * - q to quit, / to search, ESC to go back
 * - Enter to select CR
 * - j/k/g/G for navigation
 */
export async function handleMrListKeys(
  event: KeyboardEvent,
  stores: KeyboardStores,
  actions: KeyboardActions,
  _ctx: KeyboardContext,
): Promise<boolean> {
  const { appStore, changeRequestStore } = stores;
  const { appActions, crActions } = actions;

  if (appStore.viewMode() !== 'changeRequests') return false;

  // CR search mode — capture all keys while user is typing
  if (changeRequestStore.crSearchMode()) {
    if (
      event.name === 'escape' || event.name === 'Escape' ||
      event.name === 'esc' || event.sequence === '\x1b'
    ) {
      changeRequestStore.setMrSearchMode(false);
      changeRequestStore.setMrSearchQuery('');
      changeRequestStore.setSelectedCRIndex(0);
      return true;
    }
    if (event.name === 'return' || event.name === 'enter') {
      const query = changeRequestStore.crSearchQuery();
      changeRequestStore.setMrSearchMode(false);
      changeRequestStore.setMrSearchQuery(''); // clear client-side filter so server results aren't double-filtered
      changeRequestStore.setSelectedCRIndex(0);
      if (query) {
        // Submit search to server
        changeRequestStore.setSearchTerm(query);
        crActions.loadAllChangeRequests(1, query);
      }
      return true;
    }
    if (event.name === 'backspace' || event.name === 'delete') {
      changeRequestStore.setMrSearchQuery(q => q.slice(0, -1));
      changeRequestStore.setSelectedCRIndex(0);
      return true;
    }
    const ch = event.sequence ?? event.name ?? '';
    if (ch.length === 1 && ch >= ' ') {
      changeRequestStore.setMrSearchQuery(q => q + ch);
      changeRequestStore.setSelectedCRIndex(0);
      return true;
    }
    return true; // swallow all other keys
  }

  const crs = changeRequestStore.changeRequests();

  // q to quit
  if (event.name === 'q' || event.name === 'Q') {
    appActions.exitApp();
    return true;
  }

  // '/' to enter search mode
  if (event.name === '/' || event.sequence === '/') {
    changeRequestStore.setMrSearchMode(true);
    changeRequestStore.setMrSearchQuery('');
    changeRequestStore.setSelectedCRIndex(0);
    return true;
  }

  // ESC: clear search first, then go back
  if (event.name === 'escape' || event.name === 'Escape' || event.name === 'esc') {
    if (changeRequestStore.crSearchQuery() || changeRequestStore.searchTerm()) {
      changeRequestStore.setMrSearchQuery('');
      changeRequestStore.setSearchTerm('');
      changeRequestStore.setMrSearchMode(false);
      changeRequestStore.setSelectedCRIndex(0);
      // Reload without search filter if we had a server-side search active
      if (changeRequestStore.changeRequests().length > 0) {
        crActions.loadAllChangeRequests(1);
      }
      return true;
    }
    appStore.setViewMode('table');
    changeRequestStore.setChangeRequests([]);
    changeRequestStore.setMrError('');
    changeRequestStore.setSelectedCR(null);
    changeRequestStore.setSelectedCRIndex(0);
    changeRequestStore.setSearchTerm('');
    return true;
  }

  // Enter to select CR
  if (event.name === 'return' || event.name === 'enter') {
    if (crs.length > 0) {
      const selected = crs[changeRequestStore.selectedChangeRequestIndex()];
      if (selected) {
        crActions.showCRDetail(selected);
      }
    }
    return true;
  }

  // s to toggle CR state — works even when list is empty (lets user switch filter)
  if (event.name === 's' && !event.shift && !event.ctrl) {
    const current = changeRequestStore.crState();
    const next =
      current === 'opened' ? 'closed' :
      current === 'closed' ? 'all' :
      'opened';
    changeRequestStore.setMrState(next);
    void crActions.loadAllChangeRequests(1, undefined, next);
    return true;
  }

  if (crs.length === 0) return true;

  // j or Down to move down
  if (isDownKey(event)) {
    changeRequestStore.setSelectedCRIndex((prev) => Math.min(prev + 1, crs.length - 1));
    return true;
  }

  // k or Up to move up
  if (isUpKey(event)) {
    changeRequestStore.setSelectedCRIndex((prev) => Math.max(prev - 1, 0));
    return true;
  }

  // g to go to top
  if (event.name === 'g') {
    changeRequestStore.setSelectedCRIndex(0);
    return true;
  }

  // G (Shift+G) to go to bottom
  if (event.sequence === 'G') {
    changeRequestStore.setSelectedCRIndex(crs.length - 1);
    return true;
  }

  // ] or Shift+J to go to next page
  if (isNextRelatedKey(event)) {
    const current = changeRequestStore.currentPage();
    const total = changeRequestStore.totalPages();
    // Only navigate if totalPages is unknown (>0) or we're not at the last page
    if (total <= 0 || current < total) {
      crActions.nextPage();
    }
    return true;
  }

  // [ or Shift+K to go to previous page
  if (isPreviousRelatedKey(event)) {
    if (changeRequestStore.currentPage() > 1) {
      crActions.prevPage();
    }
    return true;
  }

  return true;
}
