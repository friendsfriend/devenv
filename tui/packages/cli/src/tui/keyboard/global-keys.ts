import { getGuide } from '../guides';
import type { KeyboardEvent, KeyboardStores, KeyboardActions, KeyboardContext } from './types';
import { routePastedText } from './paste-handler';

import { isDownKey, isLeftKey, isRightKey, isUpKey } from './nav-keys';
/**
 * Handles global keys that apply regardless of view mode:
 * - ESC to close console overlay
 * - Error dialog (copy + dismiss)
 * - Confirm dialog (y/n)
 * - Profile picker navigation
 * - AI backend picker navigation
 * - Ctrl+C to exit
 * - Ctrl+Shift+C to copy selection
 */
// Track last Ctrl+C press time for double-press exit detection
let _lastCtrlCTime = 0;

export async function handleGlobalKeys(
  event: KeyboardEvent,
  stores: KeyboardStores,
  actions: KeyboardActions,
  ctx: KeyboardContext,
): Promise<boolean> {
  const { uiStore, appStore, logStore, agentStore } = stores;
  const { appActions, dockerActions, utilActions, logActions, agentActions } = actions;
  const { renderer, launchPi } = ctx;

  // GLOBAL: Escape closes the opentui console overlay if it is visible
  if ((event.name === 'escape' || event.name === 'Escape') && renderer.console.visible) {
    renderer.console.hide();
    return true;
  }

  // CRITICAL: Error dialog ALWAYS has highest priority (must handle ESC in any view)
  if (uiStore.showErrorDialog()) {
    // 'c' to copy error message to clipboard
    if (event.name === 'c') {
      const { copyToClipboard } = await import('@devenv/core');
      const success = copyToClipboard(uiStore.errorDialogMessage());
      if (success) {
        // Show brief success message by updating the error dialog message
        const originalMessage = uiStore.errorDialogMessage();
        uiStore.setErrorDialogMessage(`${originalMessage}\n\n✓ Copied to clipboard!`);
        setTimeout(() => {
          uiStore.setErrorDialogMessage(originalMessage);
        }, 1000);
      }
      return true;
    }
    // Any other key closes the dialog
    uiStore.setShowErrorDialog(false);
    return true;
  }

  if (uiStore.showMarkdownModal()) {
    if (event.name === 'escape' || event.name === 'Escape' || event.name === 'esc') {
      uiStore.setShowMarkdownModal(false);
      uiStore.markdownModalScrollBoxRef = undefined;
      return true;
    }
    const sb = uiStore.markdownModalScrollBoxRef;
    if (isDownKey(event)) { sb?.scrollBy(1); return true; }
    if (isUpKey(event)) { sb?.scrollBy(-1); return true; }
    if (event.name === 'd') {
      const half = Math.floor((sb?.viewport.height ?? 20) / 2);
      sb?.scrollBy(Math.max(1, half));
      return true;
    }
    if (event.name === 'u') {
      const half = Math.floor((sb?.viewport.height ?? 20) / 2);
      sb?.scrollBy(-Math.max(1, half));
      return true;
    }
    if (event.name === 'g' && !event.shift) { sb?.scrollTo(0); return true; }
    if (event.name === 'G') { sb?.scrollTo(sb?.scrollHeight ?? 0); return true; }
    return true;
  }

  if (uiStore.showConfirmDialog()) {
    if (event.name === 'y') {
      const action = uiStore.confirmDialogAction();
      uiStore.setShowConfirmDialog(false);
      if (action) action();
      return true;
    }
    if (event.name === 'n' || event.name === 'escape' || event.name === 'Escape') {
      uiStore.setShowConfirmDialog(false);
      return true;
    }
    return true;
  }

  if (uiStore.showProfilePicker()) {
    if (event.name === 'escape' || event.name === 'Escape' || event.name === 'esc') {
      uiStore.setShowProfilePicker(false);
      return true;
    }
    if (isDownKey(event)) {
      const opts: string[] = [];
      if (uiStore.profilePickerHasDockerfile()) opts.push('default (no profile)');
      opts.push(...uiStore.profilePickerProfiles());
      const max = Math.max(0, opts.length - 1);
      uiStore.setProfilePickerSelectedIndex((prev) => Math.min(prev + 1, max));
      return true;
    }
    if (isUpKey(event)) {
      uiStore.setProfilePickerSelectedIndex((prev) => Math.max(prev - 1, 0));
      return true;
    }
    if (event.name === 'return' || event.name === 'Return' || event.name === 'enter' || event.name === 'Enter') {
      const opts: string[] = [];
      if (uiStore.profilePickerHasDockerfile()) opts.push('default (no profile)');
      opts.push(...uiStore.profilePickerProfiles());
      const selected = opts[uiStore.profilePickerSelectedIndex()];
      if (selected) {
        uiStore.setShowProfilePicker(false);
        const ident = uiStore.profilePickerAppIdent();
        if (ident) {
          // Try app first, then infra service
          const appOrSvc = appStore.apps().find(a => a.ident === ident) || appStore.infraServices().find(s => s.ident === ident);
          if (appOrSvc) {
            void dockerActions.performDockerOperation('start', appOrSvc as any, selected === 'default (no profile)' ? '' : selected);
          }
        }
      }
      return true;
    }
    return true;
  }

  if (appStore.showFirstSteps() && appStore.viewMode() === 'table' && !stores.providerStore.showConnectProviderModal() && !stores.providerStore.showAddAppModal()) {
    const runFirstStep = async (idx: number) => {
      if (idx === 0) actions.providerActions.openAddProviderModal();
      if (idx === 1) await actions.providerActions.openAddAppModal();
      if (idx === 2) void actions.appActions.createExampleConfig();
      if (idx === 3) {
        const guide = getGuide('config-repository');
        if (guide) {
          const content = await guide.import();
          uiStore.setMarkdownModalTitle(guide.title);
          uiStore.setMarkdownModalContent(content);
        }
        uiStore.setShowMarkdownModal(true);
      }
      if (idx === 4) actions.helpActions.showHelp();
    };
    if (event.name === 'escape' || event.name === 'Escape' || event.name === 'esc') {
      appStore.setFirstStepsDismissed(true);
      return true;
    }
    if (isDownKey(event)) {
      appStore.setFirstStepsSelectedIndex((i) => i === 0 ? 1 : 4);
      return true;
    }
    if (isUpKey(event)) {
      appStore.setFirstStepsSelectedIndex((i) => i === 4 ? 1 : 0);
      return true;
    }
    if (isLeftKey(event)) {
      appStore.setFirstStepsSelectedIndex((i) => i >= 2 && i <= 3 ? i - 1 : i);
      return true;
    }
    if (isRightKey(event)) {
      appStore.setFirstStepsSelectedIndex((i) => i >= 1 && i <= 2 ? i + 1 : i);
      return true;
    }
    if (event.name === 'return' || event.name === 'Return' || event.name === 'enter' || event.name === 'Enter') {
      await runFirstStep(appStore.firstStepsSelectedIndex());
      return true;
    }
    if (event.name === '1') {
      await runFirstStep(0);
      return true;
    }
    if (event.name === '2') {
      await runFirstStep(1);
      return true;
    }
    if (event.name === '3') {
      await runFirstStep(2);
      return true;
    }
    if (event.name === '4') {
      await runFirstStep(3);
      return true;
    }
    if (event.name === '?' || event.name === 'h') {
      await runFirstStep(4);
      return true;
    }
  }

  const isPasteShortcut = (event.ctrl || event.meta || event.super) && (event.name === 'v' || event.name === 'V');
  if (isPasteShortcut) {
    const { readFromClipboard } = await import('@devenv/core');
    const pastedText = readFromClipboard();
    if (pastedText && routePastedText(pastedText, stores.providerStore)) {
      return true;
    }
  }

  // GLOBAL: Ctrl+C — copy on single press, exit on double-press (500ms window)
  // Inside tmux, Kitty protocol cannot disambiguate Ctrl+C from Ctrl+Shift+C
  // (both send \x03), so single Ctrl+C always copies the current selection.
  // Double Ctrl+C exits the app. With Kitty protocol, plain Ctrl+C arrives as
  // lowercase 'c' (no shift), while Ctrl+Shift+C arrives as uppercase 'C' with
  // shift=true — those are handled separately below.
  if (event.ctrl && !event.shift && !event.meta && !event.super && event.name === 'c') {
    const now = Date.now();
    if (now - _lastCtrlCTime < 500) {
      _lastCtrlCTime = 0;
      appActions.exitApp();
      return true;
    }
    _lastCtrlCTime = now;
    // Single Ctrl+C copies selection (works inside tmux where shift can't be detected)
    await utilActions.handleCopySelection();
    return true;
  }

  // GLOBAL: Ctrl+Shift+C, Cmd+C, or Super+C — copy selection to clipboard
  // Kitty protocol sends uppercase 'C' for Ctrl+Shift+C (codepoint 67='C', shift flag set).
  // Ghostty on macOS sends Cmd+C with super flag. Inside tmux, Kitty protocol CSI-u
  // sequences are lost, so this branch is only reached when Ghostty forwards the
  // CSI-u sequence through tmux, or on macOS with Cmd+C/Super+C.
  if ((event.ctrl && event.shift || event.meta || event.super) && (event.name === 'c' || event.name === 'C')) {
    _lastCtrlCTime = 0;
    await utilActions.handleCopySelection();
    return true;
  }

  return false;
}
