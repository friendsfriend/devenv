import type { KeyboardEvent, KeyboardStores, KeyboardActions, KeyboardContext } from './types';

/**
 * Handles keyboard events for the MR list view:
 * - Search mode (type query, clear)
 * - q to quit, / to search, ESC to go back
 * - Enter to select MR
 * - j/k/g/G for navigation
 */
export async function handleMrListKeys(
  event: KeyboardEvent,
  stores: KeyboardStores,
  actions: KeyboardActions,
  _ctx: KeyboardContext,
): Promise<boolean> {
  const { appStore, mrStore } = stores;
  const { appActions, mrActions } = actions;

  if (appStore.viewMode() !== 'mergeRequests') return false;

  // MR search mode — capture all keys while user is typing
  if (mrStore.mrSearchMode()) {
    if (
      event.name === 'escape' || event.name === 'Escape' ||
      event.name === 'esc' || event.sequence === '\x1b'
    ) {
      mrStore.setMrSearchMode(false);
      mrStore.setMrSearchQuery('');
      mrStore.setSelectedMRIndex(0);
      return true;
    }
    if (event.name === 'return' || event.name === 'enter') {
      const query = mrStore.mrSearchQuery();
      mrStore.setMrSearchMode(false);
      mrStore.setMrSearchQuery(''); // clear client-side filter so server results aren't double-filtered
      mrStore.setSelectedMRIndex(0);
      if (query) {
        // Submit search to server
        mrStore.setSearchTerm(query);
        mrActions.loadAllMergeRequests(1, query);
      }
      return true;
    }
    if (event.name === 'backspace' || event.name === 'delete') {
      mrStore.setMrSearchQuery(q => q.slice(0, -1));
      mrStore.setSelectedMRIndex(0);
      return true;
    }
    const ch = event.sequence ?? event.name ?? '';
    if (ch.length === 1 && ch >= ' ') {
      mrStore.setMrSearchQuery(q => q + ch);
      mrStore.setSelectedMRIndex(0);
      return true;
    }
    return true; // swallow all other keys
  }

  const mrs = mrStore.mergeRequests();

  // q to quit
  if (event.name === 'q' || event.name === 'Q') {
    appActions.exitApp();
    return true;
  }

  // '/' to enter search mode
  if (event.name === '/' || event.sequence === '/') {
    mrStore.setMrSearchMode(true);
    mrStore.setMrSearchQuery('');
    mrStore.setSelectedMRIndex(0);
    return true;
  }

  // ESC: clear search first, then go back
  if (event.name === 'escape' || event.name === 'Escape' || event.name === 'esc') {
    if (mrStore.mrSearchQuery() || mrStore.searchTerm()) {
      mrStore.setMrSearchQuery('');
      mrStore.setSearchTerm('');
      mrStore.setMrSearchMode(false);
      mrStore.setSelectedMRIndex(0);
      // Reload without search filter if we had a server-side search active
      if (mrStore.mergeRequests().length > 0) {
        mrActions.loadAllMergeRequests(1);
      }
      return true;
    }
    appStore.setViewMode('table');
    mrStore.setMergeRequests([]);
    mrStore.setMrError('');
    mrStore.setSelectedMR(null);
    mrStore.setSelectedMRIndex(0);
    mrStore.setSearchTerm('');
    return true;
  }

  // Enter to select MR
  if (event.name === 'return' || event.name === 'enter') {
    if (mrs.length > 0) {
      const selected = mrs[mrStore.selectedMRIndex()];
      if (selected) {
        mrActions.showMRDetail(selected);
      }
    }
    return true;
  }

  if (mrs.length === 0) return true;

  // j or Down to move down
  if (event.name === 'j' || event.name === 'down' || event.name === 'Down') {
    mrStore.setSelectedMRIndex((prev) => Math.min(prev + 1, mrs.length - 1));
    return true;
  }

  // k or Up to move up
  if (event.name === 'k' || event.name === 'up' || event.name === 'Up') {
    mrStore.setSelectedMRIndex((prev) => Math.max(prev - 1, 0));
    return true;
  }

  // g to go to top
  if (event.name === 'g') {
    mrStore.setSelectedMRIndex(0);
    return true;
  }

  // G (Shift+G) to go to bottom
  if (event.sequence === 'G') {
    mrStore.setSelectedMRIndex(mrs.length - 1);
    return true;
  }

  // ] or l to go to next page (vim: l = right = next)
  if (event.sequence === ']' || event.name === 'l') {
    const current = mrStore.currentPage();
    const total = mrStore.totalPages();
    // Only navigate if totalPages is unknown (>0) or we're not at the last page
    if (total <= 0 || current < total) {
      mrActions.nextPage();
    }
    return true;
  }

  // [ or h to go to previous page (vim: h = left = previous)
  if (event.sequence === '[' || event.name === 'h') {
    if (mrStore.currentPage() > 1) {
      mrActions.prevPage();
    }
    return true;
  }

  return true;
}
