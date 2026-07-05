import type { KeyboardEvent, KeyboardStores, KeyboardActions, KeyboardContext } from './types';

import { isDownKey, isUpKey } from './nav-keys';
/**
 * Handles keyboard events for the Test Results view:
 * - q to quit, ? for help (early guard from parent handler)
 * - Search mode (type query, clear)
 * - / to search, ESC to close detail modal / clear search / go back
 * - Enter to open test detail modal
 * - c to copy output when detail modal is open
 * - j/k/g/G for navigation
 */
export async function handleTestResultsKeys(
  event: KeyboardEvent,
  stores: KeyboardStores,
  actions: KeyboardActions,
  _ctx: KeyboardContext,
): Promise<boolean> {
  const { appStore, changeRequestStore } = stores;
  const { appActions, helpActions } = actions;

  if (appStore.viewMode() !== 'testResults') return false;

  // q to quit, ? for help — these are global shortcuts for this view
  if (event.name === 'q' || event.name === 'Q') {
    appActions.exitApp();
    return true;
  }
  if (event.name === '?' || event.sequence === '?') {
    helpActions.showHelp();
    return true;
  }

  // Test search mode — capture all keys while user is typing
  if (changeRequestStore.testSearchMode()) {
    if (
      event.name === 'escape' || event.name === 'Escape' ||
      event.name === 'esc' || event.sequence === '\x1b'
    ) {
      changeRequestStore.setTestSearchMode(false);
      changeRequestStore.setTestSearchQuery('');
      changeRequestStore.setSelectedTestIndex(0);
      return true;
    }
    if (event.name === 'return' || event.name === 'enter') {
      changeRequestStore.setTestSearchMode(false);
      changeRequestStore.setSelectedTestIndex(0);
      return true;
    }
    if (event.name === 'backspace' || event.name === 'delete') {
      changeRequestStore.setTestSearchQuery(q => q.slice(0, -1));
      changeRequestStore.setSelectedTestIndex(0);
      return true;
    }
    const ch = event.sequence ?? event.name ?? '';
    if (ch.length === 1 && ch >= ' ') {
      changeRequestStore.setTestSearchQuery(q => q + ch);
      changeRequestStore.setSelectedTestIndex(0);
      return true;
    }
    return true; // swallow all other keys
  }

  const testSuites = changeRequestStore.crTestSummary()?.test_suites || [];
  // Build flattened+sorted+filtered list to get correct totalTests count
  const allTests: Array<{ name: string; classname: string; status: string; suiteName: string }> = [];
  for (const suite of testSuites) {
    for (const tc of suite.test_cases) {
      allTests.push({ ...tc, suiteName: suite.name });
    }
  }
  allTests.sort((a, b) => {
    const aF = a.status === 'failed' || a.status === 'error';
    const bF = b.status === 'failed' || b.status === 'error';
    if (aF && !bF) return -1;
    if (!aF && bF) return 1;
    const cc = a.classname.localeCompare(b.classname);
    if (cc !== 0) return cc;
    return a.name.localeCompare(b.name);
  });
  const q = changeRequestStore.testSearchQuery().toLowerCase();
  const filteredTests = q
    ? allTests.filter(t =>
        [t.name, t.classname, t.suiteName, t.status].some(v => v && v.toLowerCase().includes(q))
      )
    : allTests;
  const totalTests = filteredTests.length;

  // '/' to enter search mode
  if (event.name === '/' || event.sequence === '/') {
    if (!changeRequestStore.showTestDetailModal()) {
      changeRequestStore.setTestSearchMode(true);
      changeRequestStore.setTestSearchQuery('');
      changeRequestStore.setSelectedTestIndex(0);
      return true;
    }
  }

  if (
    event.name === 'escape' ||
    event.name === 'Escape' ||
    event.name === 'esc' ||
    event.sequence === '\x1b' ||
    event.raw === '\x1b'
  ) {
    // If test detail modal is open, close it first
    if (changeRequestStore.showTestDetailModal()) {
      changeRequestStore.setShowTestDetailModal(false);
      return true;
    }
    // Clear search query first on Esc
    if (changeRequestStore.testSearchQuery()) {
      changeRequestStore.setTestSearchQuery('');
      changeRequestStore.setTestSearchMode(false);
      changeRequestStore.setSelectedTestIndex(0);
      return true;
    }
    appStore.setViewMode('changeRequestDetail');
    changeRequestStore.setSelectedTestIndex(0);
    return true;
  }

  // Enter to open test detail modal
  if (event.name === 'return' || event.name === 'enter' || event.name === 'Return' || event.name === 'Enter') {
    if (!changeRequestStore.showTestDetailModal() && totalTests > 0) {
      changeRequestStore.setShowTestDetailModal(true);
    }
    return true;
  }

  // 'c' to copy output/stack trace when detail modal is open
  if (event.name === 'c' || event.sequence === 'c') {
    if (changeRequestStore.showTestDetailModal()) {
      const test = changeRequestStore.selectedTestForDetail();
      if (test) {
        const isFailed = test.status === 'failed' || test.status === 'error';
        const text = isFailed
          ? (test.stack_trace || test.system_output || null)
          : (test.system_output || null);
        if (text) {
          const { copyToClipboard } = await import('@devenv/core');
          const success = copyToClipboard(text);
          if (success) {
            changeRequestStore.setTestDetailCopyStatus('✓ Copied!');
            setTimeout(() => changeRequestStore.setTestDetailCopyStatus(null), 1500);
          }
        }
      }
      return true;
    }
  }

  // Block navigation while detail modal is open
  if (changeRequestStore.showTestDetailModal()) return true;

  if (isDownKey(event)) {
    if (changeRequestStore.selectedTestIndex() < totalTests - 1) {
      changeRequestStore.setSelectedTestIndex(prev => prev + 1);
    }
    return true;
  }

  if (isUpKey(event)) {
    if (changeRequestStore.selectedTestIndex() > 0) {
      changeRequestStore.setSelectedTestIndex(prev => prev - 1);
    }
    return true;
  }

  if (event.name === 'g' || event.sequence === 'g') {
    changeRequestStore.setSelectedTestIndex(0);
    return true;
  }

  if (event.name === 'G' || event.sequence === 'G') {
    changeRequestStore.setSelectedTestIndex(Math.max(0, totalTests - 1));
    return true;
  }

  return true;
}
