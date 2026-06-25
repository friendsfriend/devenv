import type { KeyboardEvent, KeyboardStores, KeyboardActions, KeyboardContext } from './types';
import { EDITOR_OPTIONS } from '@devenv/ui';
import { guides as allGuides } from '../guides';

import { isDownKey, isUpKey } from './nav-keys';
/**
 * Handles keyboard events for miscellaneous modals and views:
 * - Passphrase modal (ESC to cancel, Enter to submit, text input)
 * - SSH host picker (ESC/q to close, j/k navigation, Enter to launch, search)
 * - Agent view (sessions step + newSessionSpacePicker step)
 * - Providers view (a to add, e to edit, d to delete, j/k navigation)
 * - Generic ESC handler for non-table views not handled elsewhere
 */
export async function handleMiscModalKeys(
  event: KeyboardEvent,
  stores: KeyboardStores,
  actions: KeyboardActions,
  ctx: KeyboardContext,
): Promise<boolean> {
  const { appStore, uiStore, agentStore, providerStore } = stores;
  const { appActions, providerActions, agentActions, utilActions } = actions;
  const { getSelectableRows, launchPi } = ctx;

  // Editor picker keyboard handler
  if (uiStore.showEditorPicker()) {
    const isEsc =
      event.name === 'escape' ||
      event.name === 'Escape' ||
      event.name === 'esc' ||
      event.sequence === '\x1b' ||
      event.raw === '\x1b';

    if (isEsc) {
      uiStore.setShowEditorPicker(false);
      return true;
    }

    const maxIdx = EDITOR_OPTIONS.length - 1;

    if (isDownKey(event)) {
      uiStore.setEditorPickerSelectedIndex((prev) => Math.min(prev + 1, maxIdx));
      return true;
    }

    if (isUpKey(event)) {
      uiStore.setEditorPickerSelectedIndex((prev) => Math.max(prev - 1, 0));
      return true;
    }

    if (event.name === 'return' || event.name === 'Return' || event.name === 'enter' || event.name === 'Enter') {
      const selected = EDITOR_OPTIONS[uiStore.editorPickerSelectedIndex()];
      uiStore.setShowEditorPicker(false);
      if (selected) utilActions.openInEditorWith(selected.id);
      return true;
    }

    return true; // Consume all other keys while picker is open
  }

  // Script add modal keyboard handler
  if (uiStore.showScriptAddModal()) {
    const mode = uiStore.scriptAddMode();
    const fieldCount = mode === 'link' ? 3 : 2; // mode + target (+ source)

    const isEsc =
      event.name === 'escape' ||
      event.name === 'Escape' ||
      event.name === 'esc' ||
      event.sequence === '\x1b' ||
      event.raw === '\x1b';

    if (isEsc) {
      appActions.closeAddScriptModal();
      return true;
    }

    if (event.name === 'return' || event.name === 'Return' || event.name === 'enter' || event.name === 'Enter') {
      void appActions.submitAddScript();
      return true;
    }

    if (event.name === 'tab' || isDownKey(event)) {
      uiStore.setScriptAddSelectedField((prev) => (prev + 1) % fieldCount);
      return true;
    }

    if (isUpKey(event)) {
      uiStore.setScriptAddSelectedField((prev) => (prev - 1 + fieldCount) % fieldCount);
      return true;
    }

    const selectedField = Math.max(0, Math.min(uiStore.scriptAddSelectedField(), fieldCount - 1));

    if (selectedField === 0) {
      const toggleMode = () => {
        uiStore.setScriptAddMode((prev) => (prev === 'create' ? 'link' : 'create'));
        uiStore.setScriptAddSelectedField(0);
        uiStore.setScriptAddError(null);
      };
      if (
        event.name === 'left' || event.name === 'Left' || event.name === 'h' ||
        event.name === 'right' || event.name === 'Right' || event.name === 'l' ||
        event.sequence === ' '
      ) {
        toggleMode();
        return true;
      }
    }

    const updateTextField = (updater: (value: string) => string) => {
      if (selectedField === 1) {
        uiStore.setScriptAddTargetPath((prev) => updater(prev));
        uiStore.setScriptAddError(null);
        return true;
      }
      if (selectedField === 2 && mode === 'link') {
        uiStore.setScriptAddSourcePath((prev) => updater(prev));
        uiStore.setScriptAddError(null);
        return true;
      }
      return false;
    };

    if (event.name === 'backspace' || event.name === 'Backspace' || event.name === 'delete') {
      if (updateTextField((prev) => prev.slice(0, -1))) return true;
    }

    if (event.sequence && event.sequence.length === 1 && event.sequence >= ' ' && !event.ctrl && !event.meta) {
      if (updateTextField((prev) => prev + event.sequence)) return true;
    }

    return true;
  }

  // Script args modal keyboard handler
  if (uiStore.showScriptArgsModal()) {
    // Parameters are fetched from server via getScriptMetadata and stored in uiStore
    const params = uiStore.scriptArgsParameters();

    const loadHistoryAt = (index: number) => {
      const history = uiStore.scriptArgsHistoryForCurrent();
      if (index < 0 || index >= history.length) return;
      uiStore.setScriptArgValues({ ...history[index] });
      uiStore.setScriptArgsHistoryCursor(index);
      uiStore.setScriptArgsError(null);
    };

    if (
      event.name === 'escape' ||
      event.name === 'Escape' ||
      event.name === 'esc' ||
      event.sequence === '\x1b' ||
      event.raw === '\x1b'
    ) {
      uiStore.setShowScriptArgsModal(false);
      uiStore.setScriptArgsError(null);
      return true;
    }

    if (isUpKey(event)) {
      const history = uiStore.scriptArgsHistoryForCurrent();
      if (history.length > 0) {
        const current = uiStore.scriptArgsHistoryCursor();
        const next = current < 0 ? 0 : Math.min(current + 1, history.length - 1);
        loadHistoryAt(next);
      }
      return true;
    }

    if (isDownKey(event)) {
      const history = uiStore.scriptArgsHistoryForCurrent();
      if (history.length > 0) {
        const current = uiStore.scriptArgsHistoryCursor();
        if (current <= 0) {
          uiStore.setScriptArgsHistoryCursor(-1);
        } else {
          loadHistoryAt(current - 1);
        }
      }
      return true;
    }

    if (isDownKey(event)) {
      if (params.length > 0) uiStore.setScriptArgsSelectedIndex((prev) => Math.min(prev + 1, params.length - 1));
      return true;
    }

    if (isUpKey(event)) {
      if (params.length > 0) uiStore.setScriptArgsSelectedIndex((prev) => Math.max(prev - 1, 0));
      return true;
    }

    if (
      event.name === 'return' ||
      event.name === 'Return' ||
      event.name === 'enter' ||
      event.name === 'Enter'
    ) {
      void utilActions.submitScriptArgsAndRun();
      return true;
    }

    const selectedParam = params[Math.max(0, Math.min(uiStore.scriptArgsSelectedIndex(), Math.max(0, params.length - 1)))];

    if (selectedParam) {
      if (selectedParam.type === 'bool') {
        const isToggle = event.sequence === ' ';
        const isLeft = event.name === 'left' || event.name === 'Left' || event.name === 'h';
        const isRight = event.name === 'right' || event.name === 'Right' || event.name === 'l' || event.name === 'tab';

        if (isToggle || isLeft || isRight) {
          uiStore.setScriptArgValues((prev) => {
            const current = prev[selectedParam.name] === 'true';
            const next = isLeft ? false : isRight ? true : !current;
            return { ...prev, [selectedParam.name]: next ? 'true' : 'false' };
          });
          uiStore.setScriptArgsError(null);
          return true;
        }
      }

      if (selectedParam.type === 'enum' && selectedParam.choices && selectedParam.choices.length > 0) {
        const choices = selectedParam.choices;
        const current = uiStore.scriptArgValues()[selectedParam.name] || choices[0];
        const currentIndex = Math.max(0, choices.indexOf(current));

        const isPrev = event.name === 'left' || event.name === 'Left' || event.name === 'h';
        const isNext = event.name === 'right' || event.name === 'Right' || event.name === 'l' || event.name === 'tab';

        if (isPrev || isNext) {
          const nextIndex = isPrev
            ? (currentIndex - 1 + choices.length) % choices.length
            : (currentIndex + 1) % choices.length;
          uiStore.setScriptArgValues((prev) => ({ ...prev, [selectedParam.name]: choices[nextIndex] }));
          uiStore.setScriptArgsError(null);
          return true;
        }
      }

      if (event.name === 'backspace' || event.name === 'Backspace' || event.name === 'delete') {
        if (selectedParam.type !== 'bool' && selectedParam.type !== 'enum') {
          uiStore.setScriptArgValues((prev) => ({ ...prev, [selectedParam.name]: (prev[selectedParam.name] || '').slice(0, -1) }));
          uiStore.setScriptArgsError(null);
        }
        return true;
      }

      if (event.sequence && event.sequence.length === 1 && event.sequence >= ' ' && !event.ctrl && !event.meta) {
        if (selectedParam.type !== 'bool' && selectedParam.type !== 'enum') {
          uiStore.setScriptArgValues((prev) => ({ ...prev, [selectedParam.name]: (prev[selectedParam.name] || '') + event.sequence }));
          uiStore.setScriptArgsError(null);
        }
        return true;
      }
    }

    return true;
  }

  // Passphrase modal keyboard handler — must come before sshPicker block
  if (uiStore.showPassphraseModal()) {
    if (
      event.name === 'escape' ||
      event.name === 'Escape' ||
      event.name === 'esc' ||
      event.sequence === '\x1b' ||
      event.raw === '\x1b'
    ) {
      uiStore.setShowPassphraseModal(false);
      uiStore.setPassphraseText('');
      uiStore.setPassphraseError(null);
      uiStore.setPendingSshHost(null);
      appStore.setViewMode('table');
      return true;
    }
    if (
      event.name === 'return' ||
      event.name === 'Return' ||
      event.name === 'enter' ||
      event.name === 'Enter'
    ) {
      void utilActions.submitPassphrase();
      return true;
    }
    if (
      event.name === 'backspace' ||
      event.name === 'Backspace' ||
      event.name === 'delete'
    ) {
      uiStore.setPassphraseText((prev) => prev.slice(0, -1));
      return true;
    }
    // Printable characters
    if (
      event.sequence &&
      event.sequence.length === 1 &&
      event.sequence >= ' ' &&
      !event.ctrl &&
      !event.meta
    ) {
      uiStore.setPassphraseText((prev) => prev + event.sequence);
      return true;
    }
    return true; // Consume all other keys while modal is open
  }

  // SSH host picker keyboard handler
  if (appStore.viewMode() === 'sshPicker') {
    const isEsc =
      event.name === 'escape' ||
      event.name === 'Escape' ||
      event.name === 'esc' ||
      event.sequence === '\x1b' ||
      event.raw === '\x1b' ||
      event.name === 'q' ||
      event.name === 'Q';

    if (isEsc) {
      if (agentStore.sshFilterActive()) {
        // First Esc: exit filter mode and clear query
        agentStore.setSshFilterActive(false);
        agentStore.setSshSearchQuery('');
        agentStore.setSelectedSshIndex(0);
        return true;
      }
      // Close the picker
      agentStore.setSshSearchQuery('');
      agentStore.setSelectedSshIndex(0);
      appStore.setViewMode('table');
      return true;
    }

    // Build filtered list (same logic as SshHostPickerView)
    const q = agentStore.sshSearchQuery().toLowerCase();
    const filtered = q
      ? agentStore.sshHosts().filter(
          (h) =>
            h.alias.toLowerCase().includes(q) ||
            (h.hostname ?? '').toLowerCase().includes(q) ||
            (h.user ?? '').toLowerCase().includes(q),
        )
      : agentStore.sshHosts();
    const maxIdx = Math.max(0, filtered.length - 1);

    if ((event.ctrl && isDownKey(event)) || isDownKey(event)) {
      agentStore.setSelectedSshIndex((prev) => Math.min(prev + 1, maxIdx));
      return true;
    }

    if ((event.ctrl && isUpKey(event)) || isUpKey(event)) {
      agentStore.setSelectedSshIndex((prev) => Math.max(prev - 1, 0));
      return true;
    }

    if (event.name === 'return' || event.name === 'Return' || event.name === 'enter' || event.name === 'Enter') {
      if (agentStore.sshFilterActive()) {
        // Enter in filter mode: finish filtering, return focus to the list
        agentStore.setSshFilterActive(false);
        return true;
      }
      const host = filtered[Math.min(agentStore.selectedSshIndex(), maxIdx)];
      if (host) {
        void utilActions.launchSsh(host);
      }
      return true;
    }

    // / — activate filter mode
    if (event.sequence === '/' && !agentStore.sshFilterActive()) {
      agentStore.setSshSearchQuery('');
      agentStore.setSshFilterActive(true);
      return true;
    }

    // When filter is active: let the focused <input> in ListViewModal handle printable keys
    if (agentStore.sshFilterActive()) {
      return false;
    }

    // Normal mode only: letter-based navigation
    const sshPageSize = (() => {
      const rows = process.stdout.rows ?? 24;
      return Math.max(1, Math.max(5, Math.floor(rows * 0.7) - 4 - 2));
    })();
    if (isDownKey(event)) {
      agentStore.setSelectedSshIndex((prev) => Math.min(prev + 1, maxIdx));
      return true;
    }
    if (isUpKey(event)) {
      agentStore.setSelectedSshIndex((prev) => Math.max(prev - 1, 0));
      return true;
    }
    if (event.name === 'd') {
      agentStore.setSelectedSshIndex((prev) => Math.min(prev + Math.floor(sshPageSize / 2), maxIdx));
      return true;
    }
    if (event.name === 'u') {
      agentStore.setSelectedSshIndex((prev) => Math.max(prev - Math.floor(sshPageSize / 2), 0));
      return true;
    }

    // Normal mode: consume all keys (no accidental typing)
    return true;
  }

  // Agent view keyboard handler
  if (appStore.viewMode() === 'agentView') {
    const isEsc =
      event.name === 'escape' ||
      event.name === 'Escape' ||
      event.name === 'esc' ||
      event.sequence === '\x1b' ||
      event.raw === '\x1b' ||
      event.name === 'q' ||
      event.name === 'Q';

    const buildAgentViewRows = () => {
      const query = agentStore.agentSearchQuery().toLowerCase();
      const rows: Parameters<typeof getSelectableRows>[0] = [];
      rows.push({ kind: 'new' });
      const allSessions: Array<{ session: { id: string; title: string; timeCreated: number; timeUpdated: number }; agentName: string }> = [];
      for (const group of agentStore.piAgentGroups()) {
        for (const s of group.sessions) {
          if (!query || (s.title || '').toLowerCase().includes(query)) {
            allSessions.push({ session: s, agentName: group.name });
          }
        }
      }
      allSessions.sort((a, b) => b.session.timeUpdated - a.session.timeUpdated);
      for (const entry of allSessions) {
        rows.push({ kind: 'pi-session', session: entry.session, agentName: entry.agentName });
      }
      return rows;
    };

    {
      if (isEsc) {
        if (agentStore.agentFilterActive()) {
          // First Esc: exit filter mode and clear query
          agentStore.setAgentFilterActive(false);
          agentStore.setAgentSearchQuery('');
          agentStore.setSelectedAgentItemIndex(0);
          return true;
        }
        // Close the agent view
        agentStore.setAgentSearchQuery('');
        agentStore.setSelectedAgentItemIndex(0);
        appStore.setViewMode('table');
        return true;
      }

      const rows = buildAgentViewRows();
      const selectableRows = getSelectableRows(rows);
      const maxSelectableIdx = Math.max(0, selectableRows.length - 1);

      if ((event.ctrl && isDownKey(event)) || isDownKey(event)) {
        agentStore.setSelectedAgentItemIndex((prev) => Math.min(prev + 1, maxSelectableIdx));
        return true;
      }

      if ((event.ctrl && isUpKey(event)) || isUpKey(event)) {
        agentStore.setSelectedAgentItemIndex((prev) => Math.max(prev - 1, 0));
        return true;
      }

      if (event.name === 'return' || event.name === 'Return' || event.name === 'enter' || event.name === 'Enter') {
        if (agentStore.agentFilterActive()) {
          // Enter in filter mode: finish filtering, return focus to the list
          agentStore.setAgentFilterActive(false);
          return true;
        }
        const selected = selectableRows[Math.min(agentStore.selectedAgentItemIndex(), maxSelectableIdx)]?.row;
        if (!selected) return true;
        if (selected.kind === 'new') {
          void launchPi(null);
          return true;
        }
        if (selected.kind === 'pi-session') {
          void launchPi(selected.session.id);
        }
        return true;
      }

      // / — activate filter mode
      if (event.sequence === '/' && !agentStore.agentFilterActive()) {
        agentStore.setAgentSearchQuery('');
        agentStore.setAgentFilterActive(true);
        return true;
      }

      // When filter is active: let the focused <input> in ListViewModal handle printable keys
      if (agentStore.agentFilterActive()) {
        return false;
      }

      // Normal mode only: letter-based navigation
      const agentSessionPageSize = (() => {
        const termRows = process.stdout.rows ?? 24;
        return Math.max(1, Math.max(5, Math.floor(termRows * 0.75) - 4 - 2));
      })();
      if (isDownKey(event)) {
        agentStore.setSelectedAgentItemIndex((prev) => Math.min(prev + 1, maxSelectableIdx));
        return true;
      }
      if (isUpKey(event)) {
        agentStore.setSelectedAgentItemIndex((prev) => Math.max(prev - 1, 0));
        return true;
      }
      if (event.name === 'd') {
        agentStore.setSelectedAgentItemIndex((prev) => Math.min(prev + Math.floor(agentSessionPageSize / 2), maxSelectableIdx));
        return true;
      }
      if (event.name === 'u') {
        agentStore.setSelectedAgentItemIndex((prev) => Math.max(prev - Math.floor(agentSessionPageSize / 2), 0));
        return true;
      }

      // Normal mode: consume all keys (no accidental typing)
      return true;
    }

    return true;
  }

  // Providers view specific handler
  if (appStore.viewMode() === 'providers') {
    const providerList = providerStore.providers();

    if (event.name === 'a') {
      providerActions.openAddProviderModal();
      return true;
    }

    if (event.name === 'e') {
      if (providerList.length > 0) {
        providerActions.openEditProviderModal();
      }
      return true;
    }

    if (event.name === 'd' && providerList.length > 0) {
      void providerActions.deleteSelectedProvider();
      return true;
    }

    if ((isDownKey(event)) && providerList.length > 0) {
      providerStore.setSelectedProviderIndex(i => Math.min(i + 1, providerList.length - 1));
      return true;
    }
    if ((isUpKey(event)) && providerList.length > 0) {
      providerStore.setSelectedProviderIndex(i => Math.max(i - 1, 0));
      return true;
    }
    // Note: providers view doesn't return true for unhandled keys — falls through
    // to the generic ESC handler below
  }

  // ── Help view ────────────────────────────────────────────────────
  if (appStore.viewMode() === 'help') {
    const isEsc =
      event.name === 'escape' ||
      event.name === 'Escape' ||
      event.name === 'esc' ||
      event.sequence === '\x1b' ||
      event.raw === '\x1b';

    // Esc: clear search first, then close help
    if (isEsc) {
      if (appStore.helpSearchActive() || appStore.helpSearchQuery()) {
        appStore.setHelpSearchQuery('');
        appStore.setHelpSearchActive(false);
      } else {
        uiStore.helpKeybindScrollBoxRef = undefined;
        actions.helpActions.closeHelp();
      }
      return true;
    }

    // q or ?: close help (same key toggles it from the table)
    if (event.name === 'q' || event.name === 'Q' || event.name === '?' || event.sequence === '?') {
      uiStore.helpKeybindScrollBoxRef = undefined;
      actions.helpActions.closeHelp();
      return true;
    }

    // Tab: switch between keybindings and guides
    if (event.name === 'tab' || event.name === 'Tab' || event.sequence === '\t') {
      const nextTab = appStore.helpActiveTab() === 'keybinds' ? 'guides' : 'keybinds';
      appStore.setHelpSearchActive(false);
      appStore.setHelpSearchQuery('');
      appStore.setHelpActiveTab(nextTab);
      appStore.setHelpGuideIndex(nextTab === 'guides' ? 0 : -1);
      return true;
    }

    // /: search keybindings
    if (event.sequence === '/' || event.name === '/') {
      appStore.setHelpActiveTab('keybinds');
      if (!appStore.helpSearchActive()) {
        appStore.setHelpSearchQuery('');
        appStore.setHelpSearchActive(true);
      }
      return true;
    }

    // s: toggle scope (all contexts vs current)
    if (event.name === 's' || event.sequence === 's') {
      appStore.setHelpActiveTab('keybinds');
      appStore.setHelpAllContexts(!appStore.helpAllContexts());
      appStore.setHelpGuideIndex(-1);
      return true;
    }

    // j/k/up/down, d/u, g/G: scroll keybind list when keybindings tab is active and not searching
    if (!appStore.helpSearchActive() && appStore.helpActiveTab() === 'keybinds') {
      const sb = uiStore.helpKeybindScrollBoxRef;
      if (isDownKey(event)) {
        sb?.scrollBy(1);
        return true;
      }
      if (isUpKey(event)) {
        sb?.scrollBy(-1);
        return true;
      }
      if (event.name === 'd' || event.sequence === 'd') {
        const half = Math.max(1, Math.floor((sb?.viewport.height ?? 10) / 2));
        sb?.scrollBy(half);
        return true;
      }
      if (event.name === 'u' || event.sequence === 'u') {
        const half = Math.max(1, Math.floor((sb?.viewport.height ?? 10) / 2));
        sb?.scrollBy(-half);
        return true;
      }
      if ((event.name === 'g' || event.sequence === 'g') && !event.shift) {
        sb?.scrollTo(0);
        return true;
      }
      if (event.name === 'G' || event.sequence === 'G' || (event.name === 'g' && event.shift)) {
        sb?.scrollTo(sb?.scrollHeight ?? 0);
        return true;
      }
    }

    // j/k or down/up: navigate guide list when guides tab is active and not searching
    if (!appStore.helpSearchActive() && appStore.helpActiveTab() === 'guides') {
      const isDown =
        event.name === 'j' || event.name === 'down' || event.name === 'Down';
      const isUp =
        event.name === 'k' || event.name === 'up' || event.name === 'Up';
      if (isDown || isUp) {
        const maxIdx = allGuides.length - 1;
        if (maxIdx >= 0) {
          const current = appStore.helpGuideIndex() < 0 ? 0 : appStore.helpGuideIndex();
          appStore.setHelpGuideIndex(isDown
            ? Math.min(current + 1, maxIdx)
            : Math.max(current - 1, 0)
          );
        }
        return true;
      }
      // Enter: open selected guide
      if (event.name === 'return' || event.name === 'enter' || event.name === 'Return' || event.name === 'Enter') {
        const idx = appStore.helpGuideIndex();
        if (idx >= 0 && idx < allGuides.length) {
          const guide = allGuides[idx];
          if (guide) {
            uiStore.helpKeybindScrollBoxRef = undefined;
            actions.helpActions.closeHelp();
            void guide.import().then((content) => {
              uiStore.setMarkdownModalTitle("");
              uiStore.setMarkdownModalContent(content);
              uiStore.setShowMarkdownModal(true);
            });
          }
          return true;
        }
      }
    }

    return true;
  }

  // For non-table views not handled above, handle ESC to go back
  if (appStore.viewMode() !== 'table' && appStore.viewMode() !== 'appDetail') {
    if (
      event.name === 'escape' ||
      event.name === 'Escape' ||
      event.name === 'esc' ||
      event.sequence === '\x1b' ||
      event.raw === '\x1b'
    ) {
      // Go back to table (MR detail and other views already handled above)
      appStore.setViewMode('table');
    }
    return true;
  }

  return false;
}
