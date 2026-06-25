import { createMemo, createSignal } from 'solid-js';
import type { App, WorktreeInfo } from '@devenv/types';
import type { BranchInfo, AppDetailKind } from '@devenv/ui';
import type { SshHost } from '@devenv/types';

export function createUiStore() {
  let markdownModalScrollBoxRef: import('@opentui/core').ScrollBoxRenderable | undefined;
  let helpKeybindScrollBoxRef: import('@opentui/core').ScrollBoxRenderable | undefined;
  const [showErrorDialog, setShowErrorDialog] = createSignal(false);
  const [errorDialogTitle, setErrorDialogTitle] = createSignal('Error');
  const [errorDialogMessage, setErrorDialogMessage] = createSignal('');
  const [showConfirmDialog, setShowConfirmDialog] = createSignal(false);
  const [confirmDialogTitle, setConfirmDialogTitle] = createSignal('');
  const [confirmDialogMessage, setConfirmDialogMessage] = createSignal('');
  const [confirmDialogAction, setConfirmDialogAction] = createSignal<(() => void) | null>(null);
  const [showBranchSelector, setShowBranchSelector] = createSignal(false);
  const [branches, setBranches] = createSignal<BranchInfo[]>([]);
  const [branchSelectorIndex, setBranchSelectorIndex] = createSignal(0);
  const [copyStatus, setCopyStatus] = createSignal<string | null>(null);
  const [branchesLoading, setBranchesLoading] = createSignal(false);
  const [targetAppForBranch, setTargetAppForBranch] = createSignal<App | null>(null);
  const [branchFilterQuery, setBranchFilterQuery] = createSignal('');
  const [branchFilterActive, setBranchFilterActive] = createSignal(false);
  const [worktrees, setWorktrees] = createSignal<WorktreeInfo[]>([]);
  const [showProfilePicker, setShowProfilePicker] = createSignal(false);
  const [profilePickerProfiles, setProfilePickerProfiles] = createSignal<string[]>([]);
  const [profilePickerHasDockerfile, setProfilePickerHasDockerfile] = createSignal(false);
  const [profilePickerLoading, setProfilePickerLoading] = createSignal(false);
  const [profilePickerSelectedIndex, setProfilePickerSelectedIndex] = createSignal(0);
  const [profilePickerAppIdent, setProfilePickerAppIdent] = createSignal<string | null>(null);
  const [showLoadingModal, setShowLoadingModal] = createSignal(false);
  const [loadingModalMessage, setLoadingModalMessage] = createSignal('Loading...');
  const [showPassphraseModal, setShowPassphraseModal] = createSignal(false);
  const [passphraseText, setPassphraseText] = createSignal('');
  const [passphraseError, setPassphraseError] = createSignal<string | null>(null);
  const [pendingSshHost, setPendingSshHost] = createSignal<SshHost | null>(null);
  const [showEditorPicker, setShowEditorPicker] = createSignal(false);
  const [editorPickerSelectedIndex, setEditorPickerSelectedIndex] = createSignal(0);
  const [showCreateBranchModal, setShowCreateBranchModal] = createSignal(false);
  const [createBranchName, setCreateBranchName] = createSignal('');
  // When true, the branch selector was opened from the worktree manager to create a new worktree.
  // Enter selects a branch for a new worktree instead of checking it out.
  const [branchSelectorWorktreeCreateMode, setBranchSelectorWorktreeCreateMode] = createSignal(false);
  const [showWorktreeManagerModal, setShowWorktreeManagerModal] = createSignal(false);
  const [worktreeManagerAppId, setWorktreeManagerAppId] = createSignal<string | null>(null);
  const [worktreeManagerWorktrees, setWorktreeManagerWorktrees] = createSignal<WorktreeInfo[]>([]);
  const [worktreeManagerSelectedIndex, setWorktreeManagerSelectedIndex] = createSignal(0);
  const [showScriptArgsModal, setShowScriptArgsModal] = createSignal(false);
  const [showScriptAddModal, setShowScriptAddModal] = createSignal(false);
  const [scriptAddMode, setScriptAddMode] = createSignal<'create' | 'link'>('create');
  const [scriptAddTargetPath, setScriptAddTargetPath] = createSignal('');
  const [scriptAddSourcePath, setScriptAddSourcePath] = createSignal('');
  const [scriptAddSelectedField, setScriptAddSelectedField] = createSignal(0);
  const [scriptAddError, setScriptAddError] = createSignal<string | null>(null);
  const [scriptArgsError, setScriptArgsError] = createSignal<string | null>(null);
  const [scriptArgsSelectedIndex, setScriptArgsSelectedIndex] = createSignal(0);
  const [scriptArgsTargetScript, setScriptArgsTargetScript] = createSignal<string | null>(null);
  const [scriptArgValues, setScriptArgValues] = createSignal<Record<string, string>>({});
  const [scriptArgsHistory, setScriptArgsHistory] = createSignal<Record<string, Record<string, string>[]>>({});
  const [scriptArgsHistoryCursor, setScriptArgsHistoryCursor] = createSignal(-1);
  const [scriptArgsParameters, setScriptArgsParameters] = createSignal<import('@devenv/types').ScriptParameter[]>([]);
  const [showMarkdownModal, setShowMarkdownModal] = createSignal(false);
  const [markdownModalTitle, setMarkdownModalTitle] = createSignal('');
  const [markdownModalContent, setMarkdownModalContent] = createSignal('');

  const filteredBranches = createMemo(() => {
    const query = branchFilterQuery().toLowerCase();
    const allBranches = branches();
    if (!query) return allBranches;
    return allBranches.filter((branch) => branch.name.toLowerCase().includes(query));
  });

  const showError = (title: string, message: string) => {
    setErrorDialogTitle(title);
    setErrorDialogMessage(message);
    setShowErrorDialog(true);
  };

  const scriptArgsHistoryForCurrent = createMemo(() => {
    const key = scriptArgsTargetScript();
    if (!key) return [] as Record<string, string>[];
    return scriptArgsHistory()[key] ?? [];
  });

  return {
    showErrorDialog,
    setShowErrorDialog,
    errorDialogTitle,
    setErrorDialogTitle,
    errorDialogMessage,
    setErrorDialogMessage,
    showConfirmDialog,
    setShowConfirmDialog,
    confirmDialogTitle,
    setConfirmDialogTitle,
    confirmDialogMessage,
    setConfirmDialogMessage,
    confirmDialogAction,
    setConfirmDialogAction,
    showBranchSelector,
    setShowBranchSelector,
    branches,
    setBranches,
    branchSelectorIndex,
    setBranchSelectorIndex,
    copyStatus,
    setCopyStatus,
    branchesLoading,
    setBranchesLoading,
    targetAppForBranch,
    setTargetAppForBranch,
    branchFilterQuery,
    setBranchFilterQuery,
    branchFilterActive,
    setBranchFilterActive,
    worktrees,
    setWorktrees,
    showProfilePicker,
    setShowProfilePicker,
    profilePickerProfiles,
    setProfilePickerProfiles,
    profilePickerHasDockerfile,
    setProfilePickerHasDockerfile,
    profilePickerLoading,
    setProfilePickerLoading,
    profilePickerSelectedIndex,
    setProfilePickerSelectedIndex,
    profilePickerAppIdent,
    setProfilePickerAppIdent,
    showLoadingModal,
    setShowLoadingModal,
    loadingModalMessage,
    setLoadingModalMessage,
    showPassphraseModal,
    setShowPassphraseModal,
    passphraseText,
    setPassphraseText,
    passphraseError,
    setPassphraseError,
    pendingSshHost,
    setPendingSshHost,
    showEditorPicker,
    setShowEditorPicker,
    editorPickerSelectedIndex,
    setEditorPickerSelectedIndex,
    showCreateBranchModal,
    setShowCreateBranchModal,
    createBranchName,
    setCreateBranchName,
    branchSelectorWorktreeCreateMode,
    setBranchSelectorWorktreeCreateMode,
    showWorktreeManagerModal,
    setShowWorktreeManagerModal,
    worktreeManagerAppId,
    setWorktreeManagerAppId,
    worktreeManagerWorktrees,
    setWorktreeManagerWorktrees,
    worktreeManagerSelectedIndex,
    setWorktreeManagerSelectedIndex,
    showScriptArgsModal,
    setShowScriptArgsModal,
    showScriptAddModal,
    setShowScriptAddModal,
    scriptAddMode,
    setScriptAddMode,
    scriptAddTargetPath,
    setScriptAddTargetPath,
    scriptAddSourcePath,
    setScriptAddSourcePath,
    scriptAddSelectedField,
    setScriptAddSelectedField,
    scriptAddError,
    setScriptAddError,
    scriptArgsError,
    setScriptArgsError,
    scriptArgsSelectedIndex,
    setScriptArgsSelectedIndex,
    scriptArgsTargetScript,
    setScriptArgsTargetScript,
    scriptArgValues,
    setScriptArgValues,
    scriptArgsHistory,
    setScriptArgsHistory,
    scriptArgsHistoryCursor,
    setScriptArgsHistoryCursor,
    scriptArgsHistoryForCurrent,
    scriptArgsParameters,
    setScriptArgsParameters,
    showMarkdownModal,
    setShowMarkdownModal,
    markdownModalTitle,
    setMarkdownModalTitle,
    markdownModalContent,
    setMarkdownModalContent,
    get markdownModalScrollBoxRef() { return markdownModalScrollBoxRef; },
    set markdownModalScrollBoxRef(value: import('@opentui/core').ScrollBoxRenderable | undefined) { markdownModalScrollBoxRef = value; },
    get helpKeybindScrollBoxRef() { return helpKeybindScrollBoxRef; },
    set helpKeybindScrollBoxRef(value: import('@opentui/core').ScrollBoxRenderable | undefined) { helpKeybindScrollBoxRef = value; },
    filteredBranches,
    showError,
  };
}

export type UiStore = ReturnType<typeof createUiStore>;
