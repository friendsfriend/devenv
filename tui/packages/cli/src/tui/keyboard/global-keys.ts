import { getGuide } from '../guides';
import type { KeyboardEvent, KeyboardStores, KeyboardActions, KeyboardContext } from './types';
import { routePastedText } from './paste-handler';

import { isDownKey, isLeftKey, isRightKey, isUpKey } from './nav-keys';
import { themeNames } from '@devenv/ui';
import { applyTheme, saveThemeName } from '../theme-settings';
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

const writeOsc52 = (text: string) => {
  const base64 = Buffer.from(text).toString('base64');
  const osc52 = `\x1b]52;c;${base64}\x07`;
  process.stdout.write(process.env.TMUX ? `\x1bPtmux;\x1b${osc52}\x1b\\` : osc52);
};

const getConsoleText = (renderer: KeyboardContext['renderer']): string => {
  try {
    const consoleWidget = renderer.console as any;
    const selected = consoleWidget['getSelectedText']?.();
    if (selected) return selected;
    const lines = consoleWidget['_displayLines'] as Array<{ text: string }> | undefined;
    return lines?.map((line) => line.text).join('\n') ?? '';
  } catch {
    return '';
  }
};

const copyText = async (text: string, uiStore: KeyboardStores['uiStore']): Promise<boolean> => {
  if (!text) return false;
  writeOsc52(text);
  const { copyToClipboard } = await import('@devenv/core');
  const success = copyToClipboard(text);
  if (success) {
    uiStore.setCopyStatus('✓ Copied');
    setTimeout(() => uiStore.setCopyStatus(null), 2000);
  }
  return success;
};

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

  // GLOBAL: Ctrl+/ toggles the opentui console overlay.
  // Legacy terminals encode Ctrl+/ as Ctrl+_ (\x1f); Kitty can report '/'.
  if (event.ctrl && !event.shift && !event.meta && !event.super
    && (event.name === '/' || event.name === '_' || event.sequence === '\x1f' || event.raw === '\x1f')) {
    renderer.console.toggle();
    return true;
  }

  // GLOBAL: Ctrl+R toggles running text for focused/overflowing UI fields.
  if (event.ctrl && !event.shift && !event.meta && !event.super && (event.name === 'r' || event.name === 'R')) {
    const next = !uiStore.runningTextEnabled();
    uiStore.setRunningTextEnabled(next);
    uiStore.setRunningTextOffset(0);
    uiStore.setCopyStatus(next ? '✓ Running text on' : '✗ Running text off');
    setTimeout(() => uiStore.setCopyStatus(null), 2000);
    return true;
  }

  // GLOBAL: T opens theme picker.
  if (!uiStore.showThemePicker() && (event.name === 'T' || (event.name === 't' && event.shift))) {
    const current = uiStore.activeThemeName();
    uiStore.setThemePickerOriginalTheme(current);
    uiStore.setThemePickerFilterActive(false);
    uiStore.setThemePickerFilterQuery('');
    uiStore.setThemePickerSelectedIndex(Math.max(0, themeNames.indexOf(current)));
    uiStore.setShowThemePicker(true);
    return true;
  }

  // GLOBAL: ? opens help from every view/subview. In help view it falls through to close help.
  if (appStore.viewMode() !== 'help' && (event.name === '?' || event.sequence === '?' || (event.name === '/' && event.shift))) {
    actions.helpActions.showHelp();
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
      if (uiStore.markdownModalReturnToHelp()) {
        uiStore.setMarkdownModalReturnToHelp(false);
        actions.helpActions.showHelp();
      }
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

  if (uiStore.showThemePicker()) {
    const filteredThemes = () => {
      const query = uiStore.themePickerFilterQuery().toLowerCase();
      return query ? themeNames.filter((name) => name.toLowerCase().includes(query)) : themeNames;
    };
    const previewTheme = (index: number) => {
      const list = filteredThemes();
      const selected = list[Math.max(0, Math.min(index, list.length - 1))];
      if (selected && applyTheme(selected)) uiStore.setActiveThemeName(selected);
    };

    if (event.name === 'escape' || event.name === 'Escape' || event.name === 'esc') {
      if (uiStore.themePickerFilterActive() || uiStore.themePickerFilterQuery()) {
        uiStore.setThemePickerFilterActive(false);
        uiStore.setThemePickerFilterQuery('');
        uiStore.setThemePickerSelectedIndex(Math.max(0, themeNames.indexOf(uiStore.activeThemeName())));
        return true;
      }
      const original = uiStore.themePickerOriginalTheme();
      if (applyTheme(original)) uiStore.setActiveThemeName(original);
      uiStore.setShowThemePicker(false);
      return true;
    }
    if (event.name === '/' && !uiStore.themePickerFilterActive()) {
      uiStore.setThemePickerFilterActive(true);
      uiStore.setThemePickerFilterQuery('');
      uiStore.setThemePickerSelectedIndex(0);
      return true;
    }
    if (uiStore.themePickerFilterActive()) {
      if (event.name === 'backspace' || event.name === 'Backspace' || event.name === 'delete') {
        uiStore.setThemePickerFilterQuery((prev) => prev.slice(0, -1));
        uiStore.setThemePickerSelectedIndex(0);
        previewTheme(0);
        return true;
      }
      if (event.name === 'return' || event.name === 'Return' || event.name === 'enter' || event.name === 'Enter') {
        uiStore.setThemePickerFilterActive(false);
        return true;
      }
      if (event.sequence && event.sequence.length === 1 && event.sequence >= ' ' && !event.ctrl && !event.meta) {
        uiStore.setThemePickerFilterQuery((prev) => prev + event.sequence);
        uiStore.setThemePickerSelectedIndex(0);
        previewTheme(0);
        return true;
      }
    }
    if (isDownKey(event)) {
      uiStore.setThemePickerSelectedIndex((prev) => {
        const next = Math.min(prev + 1, Math.max(0, filteredThemes().length - 1));
        previewTheme(next);
        return next;
      });
      return true;
    }
    if (isUpKey(event)) {
      uiStore.setThemePickerSelectedIndex((prev) => {
        const next = Math.max(prev - 1, 0);
        previewTheme(next);
        return next;
      });
      return true;
    }
    if (event.name === 'return' || event.name === 'Return' || event.name === 'enter' || event.name === 'Enter') {
      const selected = filteredThemes()[uiStore.themePickerSelectedIndex()];
      if (selected && applyTheme(selected)) {
        uiStore.setActiveThemeName(selected);
        saveThemeName(selected);
        uiStore.setCopyStatus(`✓ Theme: ${selected}`);
        setTimeout(() => uiStore.setCopyStatus(null), 2000);
      }
      uiStore.setThemePickerFilterActive(false);
      uiStore.setThemePickerFilterQuery('');
      uiStore.setShowThemePicker(false);
      return true;
    }
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
          uiStore.setMarkdownModalTitle("");
          uiStore.setMarkdownModalContent(content);
        }
        uiStore.setMarkdownModalReturnToHelp(false);
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
  //
  // When no TUI selection exists, let Ctrl+C fall through so the terminal
  // emulator handles native copy (or SIGINT) instead of showing "Nothing selected".
  if (event.ctrl && !event.shift && !event.meta && !event.super && event.name === 'c') {
    const now = Date.now();
    if (now - _lastCtrlCTime < 500) {
      _lastCtrlCTime = 0;
      appActions.exitApp();
      return true;
    }
    _lastCtrlCTime = now;
    if (ctx.renderer.console.visible) {
      return copyText(getConsoleText(ctx.renderer), uiStore);
    }
    const selection = ctx.renderer.getSelection();
    if (selection && selection.getSelectedText()) {
      await utilActions.handleCopySelection();
      return true;
    }
    // No TUI selection — let terminal handle copy natively
    return false;
  }

  // GLOBAL: Ctrl+Shift+C, Cmd+C, or Super+C — copy selection to clipboard.
  if ((event.ctrl && event.shift || event.meta || event.super) && (event.name === 'c' || event.name === 'C')) {
    _lastCtrlCTime = 0;
    if (ctx.renderer.console.visible) {
      return copyText(getConsoleText(ctx.renderer), uiStore);
    }
    const selection = ctx.renderer.getSelection();
    if (selection && selection.getSelectedText()) {
      await utilActions.handleCopySelection();
      return true;
    }
    return false;
  }

  return false;
}
