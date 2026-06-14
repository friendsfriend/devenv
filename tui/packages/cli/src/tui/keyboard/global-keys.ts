import type { KeyboardEvent, KeyboardStores, KeyboardActions, KeyboardContext } from './types';
import { routePastedText } from './paste-handler';

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
    if (event.name === 'j' || event.name === 'down' || event.name === 'Down') {
      const opts: string[] = [];
      if (uiStore.profilePickerHasDockerfile()) opts.push('default (no profile)');
      opts.push(...uiStore.profilePickerProfiles());
      const max = Math.max(0, opts.length - 1);
      uiStore.setProfilePickerSelectedIndex((prev) => Math.min(prev + 1, max));
      return true;
    }
    if (event.name === 'k' || event.name === 'up' || event.name === 'Up') {
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

  const isPasteShortcut = (event.ctrl || event.meta) && (event.name === 'v' || event.name === 'V');
  if (isPasteShortcut) {
    const { readFromClipboard } = await import('@devenv/core');
    const pastedText = readFromClipboard();
    if (pastedText && routePastedText(pastedText, stores.providerStore)) {
      return true;
    }
  }

  // GLOBAL: Ctrl+C — exit (we handle this manually because exitOnCtrlC: false is required
  // so that Kitty keyboard protocol can disambiguate Ctrl+C from Ctrl+Shift+C)
  if (event.ctrl && !event.shift && event.name === 'c') {
    appActions.exitApp();
    return true;
  }

  // GLOBAL: Ctrl+Shift+C — copy current terminal selection to clipboard (works in any view)
  // Requires useKittyKeyboard + exitOnCtrlC:false so the shift flag is actually set.
  if (event.ctrl && event.shift && event.name === 'c') {
    await utilActions.handleCopySelection();
    return true;
  }

  return false;
}
