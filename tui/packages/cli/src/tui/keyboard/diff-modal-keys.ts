import { getLogger } from '@devenv/core';
import type { KeyboardEvent, KeyboardStores, KeyboardActions, KeyboardContext } from './types';

import { isDownKey, isUpKey } from './nav-keys';
/**
 * Handles keyboard events for the Diff modal:
 * - Comment modal (on top of diff)
 * - Reply mode (below comment modal)
 * - Visual selection mode
 * - Line/file navigation
 * - Comment creation & navigation
 * - Open file in editor
 */
export async function handleDiffModalKeys(
  event: KeyboardEvent,
  stores: KeyboardStores,
  actions: KeyboardActions,
  ctx: KeyboardContext,
): Promise<boolean> {
  const { mrStore, appStore } = stores;
  const { mrActions, utilActions } = actions;
  const { showError, getSelectedApp } = ctx;

  if (!mrStore.showDiffModal()) return false;

  // CHECK COMMENT MODAL FIRST (it's on top of diff modal)
  if (mrStore.showCommentModal()) {
    // ESC to cancel comment
    if (event.name === 'escape' || event.name === 'Escape' || event.name === 'esc') {
      mrStore.setShowCommentModal(false);
      mrStore.setCommentText('');
      return true;
    }

    // Ctrl+Enter to submit comment (only if not already submitting)
    if (event.ctrl && (event.name === 'return' || event.name === 'enter' || event.name === 'Return' || event.name === 'Enter')) {
      if (!mrStore.commentSubmitting()) {
        mrActions.submitComment();
      }
      return true;
    }
    // Comment modal is open — block all other keys (text input handled by component)
    return true;
  }

  // CHECK REPLY MODE SECOND (below comment modal but above diff modal)
  if (mrStore.replyMode()) {
    // ESC to cancel reply
    if (event.name === 'escape' || event.name === 'Escape' || event.name === 'esc') {
      mrStore.setReplyMode(null);
      mrStore.setReplyText('');
      getLogger().write('INFO', 'Reply mode cancelled');
      return true;
    }

    // Ctrl+Enter to submit reply
    if (event.ctrl && (event.name === 'return' || event.name === 'enter' || event.name === 'Return' || event.name === 'Enter')) {
      const discussionId = mrStore.replyMode();
      const text = mrStore.replyText().trim();

      if (!text) {
        showError('Empty Reply', 'Please enter a reply');
        return true;
      }

      mrActions.replyToDiscussion(discussionId!, text);
      mrStore.setReplyMode(null);
      mrStore.setReplyText('');
      return true;
    }

    // Backspace to delete last character
    if (event.name === 'backspace' || event.name === 'Backspace') {
      mrStore.setReplyText(mrStore.replyText().slice(0, -1));
      return true;
    }

    // Regular text input (printable characters)
    if (event.name && event.name.length === 1 && !event.ctrl && !event.meta) {
      mrStore.setReplyText(mrStore.replyText() + event.name);
      return true;
    }

    // Space key
    if (event.name === 'space' || event.name === ' ') {
      mrStore.setReplyText(mrStore.replyText() + ' ');
      return true;
    }

    return true; // Block all other keys when reply mode is active
  }

  // DIFF MODAL HANDLING (when comment modal is NOT open)
  const changes = mrStore.mrChanges();

  // Debug: Log all key presses in diff modal
  getLogger().write('DEBUG', `[DIFF MODAL] Key pressed: name="${event.name}", ctrl=${event.ctrl}, shift=${event.shift}, alt=${event.meta}`);

  // ESC to close modal
  if (event.name === 'escape' || event.name === 'Escape' || event.name === 'esc') {
    mrStore.setShowDiffModal(false);
    mrStore.setCurrentDiffFile(null);
    mrStore.setDiffModalSelectedLine(0);
    mrStore.setDiffModalVisualMode(false);
    mrStore.setDiffModalVisualStart(0);
    mrStore.setDiffModalForceSplitView(false);

    // Return to previous view if it was discussions view
    if (appStore.previousViewMode() === 'discussionsView') {
      appStore.setViewMode('discussionsView');
      appStore.setPreviousViewMode(null);
    }

    return true;
  }

  // v to toggle visual selection mode (vim-style)
  if (event.name === 'v') {
    if (mrStore.diffModalVisualMode()) {
      mrStore.setDiffModalVisualMode(false);
    } else {
      mrStore.setDiffModalVisualMode(true);
      mrStore.setDiffModalVisualStart(mrStore.diffModalSelectedLine());
    }
    return true;
  }

  // c to create a code review comment on selected line(s)
  if (event.name === 'c') {
    const selectedLine = mrStore.diffModalSelectedLine();
    if (selectedLine < 0) {
      getLogger().write('DEBUG', `c pressed but selectedLine < 0: ${selectedLine}`);
      return true;
    }

    getLogger().write('DEBUG', `Opening comment modal for line ${selectedLine}`);

    try {
      mrStore.setCommentText('');
      getLogger().write('DEBUG', `About to call mrStore.setShowCommentModal(true)`);
      mrStore.setShowCommentModal(true);
      getLogger().write('DEBUG', `Comment modal state set to: ${mrStore.showCommentModal()}`);
    } catch (e) {
      getLogger().write('ERROR', `Failed to set comment modal: ${e}`);
    }
    return true;
  }

  // r to reply to a comment at current line
  if (event.name === 'r' && !event.shift) {
    const discussion = mrActions.getDiscussionAtCurrentLine();
    if (discussion) {
      mrStore.setReplyMode(discussion.id);
      mrStore.setReplyText('');
      getLogger().write('INFO', `Entering reply mode for discussion ${discussion.id}`);
    } else {
      showError('No Comment', 'No comment found at this line to reply to');
    }
    return true;
  }

  // Shift+R to resolve/unresolve a discussion at current line
  if (event.name === 'r' && event.shift) {
    getLogger().write('DEBUG', `Shift+R pressed, event.name="${event.name}", shift=${event.shift}`);
    const discussion = mrActions.getDiscussionAtCurrentLine();
    if (discussion) {
      const currentlyResolved = discussion.notes[0]?.resolved || false;
      getLogger().write('INFO', `Toggling discussion ${discussion.id} resolved state from ${currentlyResolved} to ${!currentlyResolved}`);
      mrActions.resolveDiscussion(discussion.id, currentlyResolved ? 'unresolve' : 'resolve');
    } else {
      showError('No Comment', 'No comment found at this line to resolve');
    }
    return true;
  }

  // t to toggle collapse/expand thread at current line
  if (event.name === 't') {
    const discussion = mrActions.getDiscussionAtCurrentLine();
    if (discussion && discussion.notes.length > 1) {
      mrStore.setCollapsedThreads(prev => {
        const next = new Set(prev);
        if (next.has(discussion.id)) {
          next.delete(discussion.id);
          getLogger().write('INFO', `Expanded thread ${discussion.id}`);
        } else {
          next.add(discussion.id);
          getLogger().write('INFO', `Collapsed thread ${discussion.id}`);
        }
        return next;
      });
    } else if (discussion) {
      showError('Single Comment', 'This comment has no replies to collapse');
    } else {
      showError('No Comment', 'No comment found at this line to collapse');
    }
    return true;
  }

  // Shift+N to jump to previous line with a comment
  if (event.name === 'N' || event.sequence === 'N' || (event.name === 'n' && event.shift)) {
    getLogger().write('DEBUG', `[DIFF MODAL] Shift+N pressed: name="${event.name}", sequence="${event.sequence}", shift=${event.shift}`);
    const linesWithComments = mrActions.getLinesWithComments();
    if (linesWithComments.length === 0) {
      showError('No Comments', 'No comments found in this diff');
      return true;
    }

    const currentLine = mrStore.diffModalSelectedLine();
    let prevLine: number | undefined;
    for (let i = linesWithComments.length - 1; i >= 0; i--) {
      if (linesWithComments[i] < currentLine) {
        prevLine = linesWithComments[i];
        break;
      }
    }

    if (prevLine !== undefined) {
      mrStore.setDiffModalSelectedLine(prevLine);
    } else {
      const lastComment = linesWithComments[linesWithComments.length - 1];
      if (lastComment !== currentLine) {
        mrStore.setDiffModalSelectedLine(lastComment);
      }
    }
    return true;
  }

  // n to jump to next line with a comment (lowercase n only)
  if (event.name === 'n' || event.sequence === 'n') {
    getLogger().write('DEBUG', `[DIFF MODAL] n pressed: name="${event.name}", sequence="${event.sequence}", shift=${event.shift}`);
    const linesWithComments = mrActions.getLinesWithComments();
    getLogger().write('DEBUG', `[DIFF MODAL] Lines with comments: [${linesWithComments.join(', ')}]`);

    if (linesWithComments.length === 0) {
      showError('No Comments', 'No comments found in this diff');
      return true;
    }

    const currentLine = mrStore.diffModalSelectedLine();
    getLogger().write('DEBUG', `[DIFF MODAL] Current line: ${currentLine}`);

    const nextLine = linesWithComments.find(line => line > currentLine);
    getLogger().write('DEBUG', `[DIFF MODAL] Next line found: ${nextLine}`);

    if (nextLine !== undefined) {
      getLogger().write('DEBUG', `[DIFF MODAL] Jumping to next line: ${nextLine}`);
      mrStore.setDiffModalSelectedLine(nextLine);
    } else {
      const firstComment = linesWithComments[0];
      getLogger().write('DEBUG', `[DIFF MODAL] No next line, wrapping. First comment: ${firstComment}, current: ${currentLine}`);
      if (firstComment !== currentLine) {
        getLogger().write('DEBUG', `[DIFF MODAL] Wrapping to first comment: ${firstComment}`);
        mrStore.setDiffModalSelectedLine(firstComment);
      } else {
        getLogger().write('DEBUG', `[DIFF MODAL] Already on first comment, staying put`);
      }
    }
    return true;
  }

  // j or Down to move down one line in diff
  if (isDownKey(event)) {
    mrStore.setDiffModalSelectedLine(mrStore.diffModalSelectedLine() + 1);
    return true;
  }

  // k or Up to move up one line in diff
  if (isUpKey(event)) {
    mrStore.setDiffModalSelectedLine(Math.max(mrStore.diffModalSelectedLine() - 1, 0));
    return true;
  }

  // h or Left to go to previous file
  if (event.name === 'h' || event.name === 'left' || event.name === 'Left') {
    const newIndex = Math.max(mrStore.selectedChangedFileIndex() - 1, 0);
    if (newIndex !== mrStore.selectedChangedFileIndex()) {
      mrStore.setSelectedChangedFileIndex(newIndex);
      mrStore.setDiffModalSelectedLine(0);
      mrStore.setDiffModalVisualMode(false);
      mrStore.setDiffModalVisualStart(0);
      const selectedChange = changes[newIndex];
      if (selectedChange && selectedChange.diff) {
        mrStore.setCurrentDiffFile(selectedChange);
      }
    }
    return true;
  }

  // l or Right to go to next file
  if (event.name === 'l' || event.name === 'right' || event.name === 'Right') {
    const newIndex = Math.min(mrStore.selectedChangedFileIndex() + 1, changes.length - 1);
    if (newIndex !== mrStore.selectedChangedFileIndex()) {
      mrStore.setSelectedChangedFileIndex(newIndex);
      mrStore.setDiffModalSelectedLine(0);
      mrStore.setDiffModalVisualMode(false);
      mrStore.setDiffModalVisualStart(0);
      const selectedChange = changes[newIndex];
      if (selectedChange && selectedChange.diff) {
        mrStore.setCurrentDiffFile(selectedChange);
      }
    }
    return true;
  }

  // s to toggle split / staggered view — always a plain flip since the initial
  // value is pre-calculated at modal open time (never null during normal use).
  if (event.name === 's') {
    mrStore.setDiffModalForceSplitView(!mrStore.diffModalForceSplitView());
    return true;
  }

  // e — open current diff file in editor, jumping to the first changed line
  if (event.name === 'e') {
    const diffFile = mrStore.currentDiffFile();
    const app = getSelectedApp();
    if (diffFile && app?.localDirectoryPath) {
      const { join } = require('path') as typeof import('path');
      const filePath = join(app.localDirectoryPath, diffFile.new_path);

      let firstChangedLine: number | undefined;
      if (diffFile.diff) {
        let newLineNum = 0;
        outer: for (const line of diffFile.diff.split('\n')) {
          if (line.startsWith('@@')) {
            const m = line.match(/@@ -\d+,?\d* \+(\d+),?\d* @@/);
            if (m) newLineNum = parseInt(m[1], 10) - 1;
          } else if (line.startsWith('+') && !line.startsWith('+++')) {
            newLineNum++;
            firstChangedLine = newLineNum;
            break outer;
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            firstChangedLine = newLineNum + 1;
            break outer;
          } else if (!line.startsWith('---') && !line.startsWith('+++')) {
            newLineNum++;
          }
        }
      }

      utilActions.openInEditor(filePath, firstChangedLine);
    }
    return true;
  }

  // Block all other keys when modal is open - consume the event
  return true;
}
