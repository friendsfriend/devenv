import { TextAttributes } from '@opentui/core';
import { For, Show, createMemo } from 'solid-js';
import { useTerminalDimensions } from '@opentui/solid';
import { uiColors } from '../colors';
import { getMarkdownSyntaxStyle } from '../markdownSyntax';
import { gitlabHtmlToMarkdown, containsHtml } from '../utils/gitlabHtml';
import { calculateVisibleItems } from '../utils/virtualScroll';
import { LAYOUT_CHROME_LINES } from './ScrollableList';
import type { Discussion, MRChange } from '@devenv/types';

interface DiscussionsViewProps {
  discussions: Discussion[];
  selectedIndex: number;
  currentHeadSHA?: string;
  changes?: MRChange[];
  onClose: () => void;
  loading?: boolean;
  error?: string;
  replyModeDiscussionId?: string | null;  // Discussion ID being replied to
  replyText?: string;  // Current reply text being typed
  showOnlyComments?: boolean;  // When true, only user comments are shown (no system notes)
}

/**
 * DiscussionsView Component - Slack-style threaded conversation view
 * 
 * Design:
 * - Left column (60%): Thread list with first message preview
 * - Right panel (40%): Expanded thread showing full conversation
 * - File location shown as subtle header above each thread
 * - Modern minimal design with good spacing
 * 
 * PATTERN: Parent-controlled navigation (OpenTUI limitation)
 * - Parent manages selectedIndex state
 * - Parent handles ALL keyboard events via single useKeyboard hook
 * - Child is purely presentational
 */
export function DiscussionsView(props: DiscussionsViewProps) {
  const dimensions = useTerminalDimensions();

  // Check if a discussion is a system note (approval, assignment, etc.)
  // Declared first because sortedDiscussions and visibleItems depend on it.
  const isSystemDiscussion = (discussion: Discussion): boolean => {
    return discussion.notes.length > 0 && discussion.notes[0].system;
  };

  // Sort discussions by newest first (based on most recent note)
  // When showOnlyComments is true, filter out system notes first
  const sortedDiscussions = createMemo(() => {
    const filtered = props.showOnlyComments
      ? props.discussions.filter(d => !isSystemDiscussion(d))
      : props.discussions;
    return [...filtered].sort((a, b) => {
      // Get the most recent note timestamp for each discussion
      const aLatest = a.notes.reduce((latest, note) => {
        const noteTime = new Date(note.created_at).getTime();
        return noteTime > latest ? noteTime : latest;
      }, 0);

      const bLatest = b.notes.reduce((latest, note) => {
        const noteTime = new Date(note.created_at).getTime();
        return noteTime > latest ? noteTime : latest;
      }, 0);

      // Sort descending (newest first)
      return bLatest - aLatest;
    });
  });

  // Get currently selected discussion from sorted list
  const selectedDiscussion = createMemo(() => {
    return sortedDiscussions()[props.selectedIndex];
  });

  // Calculate visible items for virtual scrolling (keeps selected item in view)
  const visibleItems = createMemo(() => {
    // Lines of fixed chrome outside the list area:
    //   Layout header (3) + Layout footer (3)  = LAYOUT_CHROME_LINES (6)
    //   Outer rounded border top + bottom      = 2
    //   Own header rows (title + stats)        = 2
    //                                   Total  = 10
    const RESERVED_LINES = LAYOUT_CHROME_LINES + 2 + 2;
    const visibleHeight = dimensions().height - RESERVED_LINES;

    const items = sortedDiscussions();
    // Per-item heights: system notes render as 1 content line + 1 connector = 2,
    // user comments render as status+author+replyCount+connector = 4
    const itemHeights = items.map(d => isSystemDiscussion(d) ? 2 : 4);

    const result = calculateVisibleItems(items, {
      totalItems: items.length,
      selectedIndex: props.selectedIndex,
      visibleHeight,
      itemHeights,
    });

    return result.visibleItems;
  });

  // Format timestamp for display
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  // Get icon for system note based on content
  const getSystemNoteIcon = (body: string): string => {
    // Decode HTML before matching so tags don't interfere
    const plain = containsHtml(body) ? gitlabHtmlToMarkdown(body) : body;
    const lowerBody = plain.toLowerCase();
    if (lowerBody.includes('approved')) return '✓';
    if (lowerBody.includes('unapproved')) return '✗';
    if (lowerBody.includes('assigned')) return '→';
    if (lowerBody.includes('unassigned')) return '←';
    if (lowerBody.includes('merged')) return '⚡';
    if (lowerBody.includes('closed')) return '✕';
    if (lowerBody.includes('reopened')) return '○';
    if (lowerBody.includes('mentioned')) return '@';
    if (lowerBody.includes('milestone')) return '◆';
    if (lowerBody.includes('label')) return '●';
    if (lowerBody.includes('added') && lowerBody.includes('commit')) return '↑';
    return '•';
  };

  // Extract a single-line action summary from a system note body for the timeline.
  // Only the first meaningful line is shown — details are in the right panel.
  const systemNoteActionLine = (body: string): string => {
    // Strip any HTML to get plain text, then take the first non-empty line
    const plain = containsHtml(body) ? gitlabHtmlToMarkdown(body) : body;
    const firstLine = plain.split('\n').find(l => l.trim() !== '') ?? '';
    // Remove markdown list markers that may appear if the whole body is a list
    return firstLine.replace(/^[-*•]\s*/, '').trim();
  };

  // Convert a system note body to Markdown for the right-panel detail view.
  const systemNoteToMarkdown = (body: string): string => {
    return containsHtml(body) ? gitlabHtmlToMarkdown(body) : body;
  };

  // Check if a discussion is outdated (code changed since comment was made)
  const isDiscussionOutdated = (discussion: Discussion): boolean => {
    const position = discussion.position || (discussion.notes && discussion.notes.length > 0 ? discussion.notes[0].position : null);
    if (!position || !props.currentHeadSHA) return false;
    return position.head_sha !== props.currentHeadSHA;
  };

  // Get file path for discussion
  const getFilePath = (discussion: Discussion): string => {
    const position = discussion.position || (discussion.notes && discussion.notes.length > 0 ? discussion.notes[0].position : null);
    if (!position) return 'General comment';
    return position.new_path || position.old_path || 'Unknown file';
  };

  // Get line number for discussion
  const getLineNumber = (discussion: Discussion): string => {
    const position = discussion.position || (discussion.notes && discussion.notes.length > 0 ? discussion.notes[0].position : null);
    if (!position) return '';
    return position.new_line ? `Line ${position.new_line}` : position.old_line ? `Line ${position.old_line}` : '';
  };

  // Diff line structure (matching DiffViewModal)
  interface DiffLine {
    type: 'added' | 'removed' | 'context' | 'header';
    content: string;
    oldLineNum?: number;
    newLineNum?: number;
  }

  // Get diff snippet for a discussion (parsed into structured format)
  const getDiffSnippet = (discussion: Discussion): DiffLine[] | null => {
    if (!props.changes || !discussion.position && !discussion.notes[0]?.position) {
      return null;
    }

    const position = discussion.position || discussion.notes[0].position;
    if (!position) return null;

    // Find the matching change
    const change = props.changes.find(c =>
      c.new_path === position.new_path || c.old_path === position.old_path
    );

    if (!change || !change.diff) return null;

    // Parse diff and extract context ABOVE the comment line + the target line(s)
    const lines = change.diff.split('\n');
    const targetLine = position.new_line || position.old_line;
    if (!targetLine) return null;

    const allLines: DiffLine[] = [];
    let currentOldLine = 0;
    let currentNewLine = 0;
    const contextLinesBefore = 4; // Show 4 lines before

    // First pass: parse all lines in the diff
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Parse hunk header to get line numbers
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
        if (match) {
          currentOldLine = parseInt(match[1], 10) - 1;
          currentNewLine = parseInt(match[2], 10) - 1;
        }
        continue;
      }

      // Skip diff metadata
      if (line.startsWith('---') || line.startsWith('+++')) {
        continue;
      }

      // Track line numbers and collect all lines
      if (line.startsWith('+')) {
        currentNewLine++;
        allLines.push({
          type: 'added',
          content: line.slice(1),
          newLineNum: currentNewLine
        });
      } else if (line.startsWith('-')) {
        currentOldLine++;
        allLines.push({
          type: 'removed',
          content: line.slice(1),
          oldLineNum: currentOldLine
        });
      } else if (line.startsWith(' ')) {
        currentOldLine++;
        currentNewLine++;
        allLines.push({
          type: 'context',
          content: line.slice(1),
          oldLineNum: currentOldLine,
          newLineNum: currentNewLine
        });
      }
    }

    // Second pass: find the target line and collect context before + target
    const snippet: DiffLine[] = [];
    let targetIndex = -1;

    // Find the target line index
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      const lineNum = position.new_line
        ? line.newLineNum
        : line.oldLineNum;

      if (lineNum === targetLine) {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex === -1) return null;

    // Collect context lines before the target
    const startIndex = Math.max(0, targetIndex - contextLinesBefore);

    // Add context lines + target line
    for (let i = startIndex; i <= targetIndex; i++) {
      snippet.push(allLines[i]);
    }

    return snippet.length > 0 ? snippet : null;
  };

  // Calculate stats
  const discussionStats = createMemo(() => {
    const total = props.discussions.length;
    const systemNotes = props.discussions.filter(d => isSystemDiscussion(d)).length;
    const userComments = total - systemNotes;
    
    // Helper to check if discussion is resolved
    const isDiscussionResolved = (d: Discussion): boolean => {
      const resolvableNotes = d.notes.filter(n => n.resolvable);
      if (resolvableNotes.length === 0) return false;
      return resolvableNotes.every(n => n.resolved);
    };
    
    // Only count resolved/open for USER COMMENTS (not system events)
    const userCommentDiscussions = props.discussions.filter(d => !isSystemDiscussion(d));
    const resolved = userCommentDiscussions.filter(d => isDiscussionResolved(d)).length;
    const open = userCommentDiscussions.length - resolved;
    const outdated = props.discussions.filter(d => isDiscussionOutdated(d)).length;
    
    return { total, systemNotes, userComments, resolved, open, outdated };
  });

  // Reply mode helpers
  const replyMode = () => props.replyModeDiscussionId ?? null;
  const replyText = () => props.replyText ?? '';

  // Calculate left column width (thread list)
  const leftColumnWidth = () => Math.floor(dimensions().width * 0.6);
  const rightColumnWidth = () => dimensions().width - leftColumnWidth();

  return (
    <box
      border={true}
      borderStyle="rounded"
      borderColor={uiColors.textMuted}
      style={{
        width: '100%',
        height: '100%',
        flexDirection: 'column',
      }}
    >
      {/* Loading State */}
      <Show when={props.loading}>
        <box
          style={{
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <text fg={uiColors.primary} attributes={TextAttributes.BOLD}>
            Loading discussions...
          </text>
        </box>
      </Show>

      {/* Error State */}
      <Show when={props.error && props.error.length > 0}>
        <box
          style={{
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <text fg={uiColors.error} attributes={TextAttributes.BOLD}>
            {props.error || 'An error occurred'}
          </text>
        </box>
      </Show>

      {/* Main Content */}
      <Show when={!props.loading && !props.error}>
        {/* Header */}
        <box
          style={{
            width: '100%',
            height: 2,
            flexDirection: 'column',
            paddingLeft: 1,
            paddingRight: 1,
            flexShrink: 0,
          }}
        >
          <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
            {`Discussions (${discussionStats().userComments} comments, ${discussionStats().systemNotes} events)`}
            {props.showOnlyComments && (
              <span style={{ fg: uiColors.primary }}> [comments only]</span>
            )}
          </text>
          <text fg={uiColors.textSecondary}>
            <span style={{ fg: discussionStats().resolved === discussionStats().userComments ? uiColors.success : uiColors.warning }}>
              {`${discussionStats().resolved}/${discussionStats().userComments} Resolved`}
            </span>
            {discussionStats().outdated > 0 && (
              <>
                <span> • </span>
                <span style={{ fg: uiColors.warning }}>
                  {`${discussionStats().outdated} Outdated`}
                </span>
              </>
            )}
          </text>
        </box>

        {/* Empty State */}
        <Show when={sortedDiscussions().length === 0}>
          <box
            style={{
              width: '100%',
              flexGrow: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <text fg={uiColors.textMuted}>No discussions found</text>
          </box>
        </Show>

        {/* Two-column layout: Thread list (left) + Expanded thread (right) */}
        <Show when={sortedDiscussions().length > 0}>
          <box
            style={{
              width: '100%',
              flexGrow: 1,
              flexDirection: 'row',
              overflow: 'hidden',
            }}
          >
            {/* Left Column: Thread List */}
            <box
              style={{
                width: leftColumnWidth(),
                height: '100%',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <For each={visibleItems()}>
                {({ item: discussion, absoluteIndex }) => {
                  const isSelected = () => absoluteIndex === props.selectedIndex;
                  // A discussion is resolved if all resolvable notes are resolved
                  const isResolved = (() => {
                    const resolvableNotes = discussion.notes.filter(n => n.resolvable);
                    if (resolvableNotes.length === 0) return false;
                    return resolvableNotes.every(n => n.resolved);
                  })();
                  const isOutdated = isDiscussionOutdated(discussion);
                  const isSystem = isSystemDiscussion(discussion);
                  const filePath = getFilePath(discussion);
                  const lineNumber = getLineNumber(discussion);
                  const firstNote = discussion.notes[0];
                  const replyCount = discussion.notes.length - 1;
                  const isLast = () => absoluteIndex === sortedDiscussions().length - 1;

                  // TIMELINE LAYOUT: All items get timeline treatment
                  return (
                    <box
                      backgroundColor={isSelected() ? uiColors.bgSurface2 : undefined}
                      style={{
                        width: '100%',
                        flexDirection: 'row',
                        flexShrink: 0,
                      }}
                    >
                      {/* LEFT: Timeline Column (3 chars wide for dot) */}
                      <box
                        style={{
                          width: 3,
                          flexDirection: 'column',
                          alignItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {/* Timeline Node */}
                        <box
                          style={{
                            width: 3,
                            height: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <text
                            fg={
                              isSystem
                                ? uiColors.textMuted
                                : isResolved
                                  ? uiColors.success
                                  : uiColors.warning
                            }
                            attributes={TextAttributes.BOLD}
                          >
                            {isSystem ? '○' : '●'}
                          </text>
                        </box>

                        {/* Vertical Line (continues below unless last item) */}
                        <Show when={!isLast()}>
                          <box
                            style={{
                              width: 1,
                              flexGrow: 1,
                              flexDirection: 'column',
                            }}
                          >
                            {/* Repeat the line character to fill the space */}
                            {Array(isSystem ? 1 : 3).fill(null).map((_, i) => (
                              <text fg={uiColors.bgSurface1}>│</text>
                            ))}
                          </box>
                        </Show>
                      </box>

                      {/* RIGHT: Content Column - Aligned with dot */}
                      <box
                        style={{
                          flexGrow: 1,
                          flexDirection: 'column',
                          paddingLeft: 2,
                          paddingRight: 2,
                        }}
                      >
                        {/* COMPACT STYLE: System Notes - Single line aligned with dot */}
                        <Show when={isSystem}>
                          <box
                            style={{
                              width: '100%',
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            {/* Icon */}
                            <text fg={uiColors.textMuted}>
                              {getSystemNoteIcon(firstNote.body)}
                            </text>

                            {/* Author + action (single line only — details in right panel) */}
                            <text fg={uiColors.textSecondary} attributes={TextAttributes.BOLD}>
                              {firstNote.author?.name || 'System'}
                            </text>
                            <text fg={isSelected() ? uiColors.textSecondary : uiColors.textMuted}>
                              {systemNoteActionLine(firstNote.body)}
                            </text>

                            {/* Time */}
                            <box style={{ marginLeft: 'auto' }}>
                              <text fg={uiColors.textMuted} attributes={TextAttributes.DIM}>
                                {formatTimestamp(firstNote.created_at)}
                              </text>
                            </box>
                          </box>
                        </Show>

                        {/* FULL STYLE: User Comments - First line aligned with dot */}
                        <Show when={!isSystem}>
                          {/* First line: Status Badge + File Location + Time (aligned with dot) */}
                          <box
                            style={{
                              width: '100%',
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                            }}
                          >
                            <box flexDirection="row" gap={1}>
                              {/* Status badge - Always show for user comments */}
                              <text
                                fg={isResolved ? uiColors.success : uiColors.warning}
                                attributes={TextAttributes.BOLD}
                              >
                                {isResolved ? '✓ Resolved' : '● Open'}
                              </text>
                              <text fg={uiColors.textMuted} attributes={TextAttributes.DIM}>
                                {filePath}
                                {lineNumber && ` • ${lineNumber}`}
                              </text>
                            </box>
                            <box flexDirection="row" gap={0.5}>
                              {isOutdated && <text fg={uiColors.warning}>⚠</text>}
                              <text fg={uiColors.textMuted}>
                                {formatTimestamp(firstNote.created_at)}
                              </text>
                            </box>
                          </box>

                          {/* Author */}
                          <box style={{ width: '100%' }}>
                            <text
                              fg={isSelected() ? uiColors.textPrimary : uiColors.textSecondary}
                              attributes={TextAttributes.BOLD}
                            >
                              {firstNote.author?.name || 'Unknown'}
                            </text>
                          </box>

                          {/* Reply Count */}
                          <Show when={replyCount > 0}>
                            <box style={{ width: '100%' }}>
                              <text fg={uiColors.primary} attributes={TextAttributes.BOLD}>
                                {`${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
                              </text>
                            </box>
                          </Show>
                        </Show>
                      </box>
                    </box>
                  );
                }}
              </For>
            </box>

            {/* Right Panel: Expanded Thread View */}
            <box
              style={{
                width: rightColumnWidth(),
                height: '100%',
                flexDirection: 'column',
                overflow: 'hidden',
                paddingLeft: 2,
                paddingRight: 2,
              }}
              backgroundColor={uiColors.bgBase}
            >
              <Show when={selectedDiscussion()}>
                {(discussion) => {
                  return (
                    <>
                      {/* Code Snippet */}
                      <Show when={getDiffSnippet(discussion())}>
                        {(snippet) => (
                          <box
                            style={{
                              width: '100%',
                              flexDirection: 'column',
                              flexShrink: 0,
                              marginBottom: 2,
                            }}
                          >
                            <For each={snippet()}>
                              {(line) => {
                                // Background color based on line type (matching DiffViewModal)
                                const bgColor = () => {
                                  switch (line.type) {
                                    case 'added': return uiColors.diffAddedBg;      // #24312b (subtle green tint)
                                    case 'removed': return uiColors.diffRemovedBg;  // #3c2a32 (subtle red tint)
                                    case 'context': return uiColors.diffContextBg;  // #181825 (mantle)
                                    default: return uiColors.bgBase;
                                  }
                                };

                                // Foreground color based on line type (matching DiffViewModal)
                                const fgColor = () => {
                                  switch (line.type) {
                                    case 'added': return uiColors.diffAdded;      // #a6e3a1 (green)
                                    case 'removed': return uiColors.diffRemoved;  // #f38ba8 (red)
                                    case 'context': return uiColors.diffContext;  // #9399b2 (overlay2)
                                    default: return uiColors.textPrimary;
                                  }
                                };

                                // Sign color (+ or -)
                                const signColor = () => {
                                  switch (line.type) {
                                    case 'added': return uiColors.diffAdded;      // Green
                                    case 'removed': return uiColors.diffRemoved;  // Red
                                    default: return uiColors.textMuted;
                                  }
                                };

                                // Line number display
                                const lineNum = () => {
                                  if (line.type === 'added') return `   ${String(line.newLineNum || '')}`;
                                  if (line.type === 'removed') return `${String(line.oldLineNum || '')}   `;
                                  if (line.type === 'context') return `${String(line.oldLineNum || '')} ${String(line.newLineNum || '')}`;
                                  return '     ';
                                };

                                // Sign character
                                const sign = () => {
                                  switch (line.type) {
                                    case 'added': return '+';
                                    case 'removed': return '-';
                                    default: return ' ';
                                  }
                                };

                                return (
                                  <box
                                    flexDirection="row"
                                    backgroundColor={bgColor()}
                                    paddingLeft={1}
                                    paddingRight={1}
                                  >
                                    {/* Line numbers */}
                                    <text
                                      fg={uiColors.textMuted}
                                      flexShrink={0}
                                      width={10}
                                    >
                                      {lineNum()}
                                    </text>

                                    {/* Sign (+/-/ ) */}
                                    <text
                                      fg={signColor()}
                                      flexShrink={0}
                                      width={2}
                                    >
                                      {sign()}
                                    </text>

                                    {/* Line content */}
                                    <text
                                      fg={fgColor()}
                                      flexGrow={1}
                                    >
                                      {line.content}
                                    </text>
                                  </box>
                                );
                              }}
                            </For>
                          </box>
                        )}
                      </Show>

                      {/* Conversation Messages with Timeline */}
                      <box
                        style={{
                          width: '100%',
                          flexGrow: 1,
                          flexDirection: 'column',
                          overflow: 'hidden',
                        }}
                      >
                        <For each={discussion().notes}>
                          {(note, noteIndex) => {
                            const isLastNote = () => noteIndex() === discussion().notes.length - 1;
                            return (
                              <box
                                style={{
                                  width: '100%',
                                  flexDirection: 'row',
                                  flexShrink: 0,
                                }}
                              >
                                {/* Timeline Column */}
                                <box
                                  style={{
                                    width: 4,
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  {/* Node */}
                                  <box
                                    style={{
                                      width: 3,
                                      height: 1,
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <text fg={uiColors.primary}>●</text>
                                  </box>

                                  {/* Vertical line */}
                                  <Show when={!isLastNote()}>
                                    <box
                                      style={{
                                        width: 1,
                                        flexGrow: 1,
                                        flexDirection: 'column',
                                      }}
                                    >
                                      {/* Calculate approximate lines needed based on message length */}
                                      {(() => {
                                        const bodyLength = note.body?.length || 0;
                                        const contentWidth = rightColumnWidth() - 20; // Approximate width for content
                                        const lines = Math.max(3, Math.ceil(bodyLength / contentWidth) + 2);
                                        return Array(lines).fill(null).map((_, i) => (
                                          <text fg={uiColors.bgSurface1}>│</text>
                                        ));
                                      })()}
                                    </box>
                                  </Show>
                                </box>

                                {/* Message Content */}
                                <box
                                  style={{
                                    flexGrow: 1,
                                    flexDirection: 'column',
                                    paddingLeft: 1,
                                    paddingBottom: 1.5,
                                  }}
                                >
                                  {/* Message Header: Author + Time */}
                                  <box flexDirection="row" gap={1}>
                                    <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
                                      {note.author?.name || 'Unknown'}
                                    </text>
                                    <text fg={uiColors.textMuted}>
                                      {formatTimestamp(note.created_at)}
                                    </text>
                                  </box>

                                  {/* Message Body — convert HTML system notes to markdown, render both via <code> */}
                                  <Show when={note.body}>
                                    <code
                                      filetype="markdown"
                                      content={note.system
                                        ? systemNoteToMarkdown(note.body)
                                        : note.body}
                                      syntaxStyle={getMarkdownSyntaxStyle()}
                                      drawUnstyledText={true}
                                      fg={uiColors.textSecondary}
                                    />
                                  </Show>
                                  <Show when={!note.body}>
                                    <text fg={uiColors.textMuted}>(no content)</text>
                                  </Show>
                                </box>
                              </box>
                            );
                          }}
                        </For>

                        {/* Reply Input Area */}
                        <Show when={selectedDiscussion() && !isSystemDiscussion(selectedDiscussion()!)}>
                          <box
                            style={{
                              width: '100%',
                              flexDirection: 'column',
                              flexShrink: 0,
                              paddingTop: 1,
                            }}
                          >
                            {/* Reply Input (when in reply mode for this discussion) */}
                            <Show when={replyMode() === selectedDiscussion()!.id}>
                              <box
                                style={{
                                  width: '100%',
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 1,
                                }}
                              >
                                {/* Timeline dot for reply */}
                                <box
                                  style={{
                                    width: 4,
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <text fg={uiColors.primary}>●</text>
                                </box>

                                {/* Reply input box */}
                                <box
                                  style={{
                                    flexGrow: 1,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingLeft: 1,
                                  }}
                                  backgroundColor={uiColors.bgBase}
                                  border={true}
                                  borderStyle="single"
                                  borderColor={uiColors.borderHighlight}
                                  paddingLeft={1}
                                  paddingRight={1}
                                >
                                  <text fg={uiColors.textPrimary}>
                                    {replyText() || 'Reply here...'}█
                                  </text>
                                </box>
                              </box>
                            </Show>

                            {/* Reply Prompt (when NOT in reply mode) */}
                            <Show when={replyMode() !== selectedDiscussion()!.id}>
                              <box
                                style={{
                                  width: '100%',
                                  flexDirection: 'row',
                                  gap: 1,
                                  paddingLeft: 4,
                                }}
                              >
                                <text 
                                  fg={uiColors.borderHighlight} 
                                  attributes={TextAttributes.BOLD}
                                >
                                  [r] Reply to thread
                                </text>
                              </box>
                            </Show>
                          </box>
                        </Show>
                      </box>
                    </>
                  );
                }}
              </Show>
            </box>
          </box>
        </Show>
      </Show>
    </box>
  );
}
