import { TextAttributes } from '@opentui/core';
import { For, Show, createMemo } from 'solid-js';
import { useTerminalDimensions } from '@opentui/solid';
import { uiColors } from '../colors';
import { getMarkdownSyntaxStyle } from '../markdownSyntax';
import { gitlabHtmlToMarkdown, containsHtml } from '../utils/gitlabHtml';
import { calculateVisibleItems } from '../utils/virtualScroll';
import { LAYOUT_CHROME_LINES } from './ScrollableList';
import { ContentPanel } from './ContentStack';
import type { Discussion, MRChange, IssueComment, NotePosition } from '@devenv/types';

// ── Normalized timeline item shared by MR discussions and issue comments ──

export interface TimelineNote {
  id: number;
  type: string;
  body: string;
  author: { name: string; username: string };
  created_at: string;
  updated_at: string;
  system: boolean;
  resolvable?: boolean;
  resolved?: boolean;
}

export interface TimelineItem {
  id: string;
  notes: TimelineNote[];
  /** MR-only: position in diff */
  position?: NotePosition;
  /** MR-only: resolvable thread */
  resolvable?: boolean;
  /** MR-only: thread is resolved */
  resolved?: boolean;
}

export interface TimelineViewProps {
  /** Normalized timeline items */
  items: TimelineItem[];
  selectedIndex: number;
  onClose: () => void;
  loading?: boolean;
  error?: string;

  // MR-specific features (optional — only wired when viewing MR discussions)
  currentHeadSHA?: string;
  changes?: MRChange[];
  replyModeId?: string | null;
  replyText?: string;
  showOnlyComments?: boolean;

  // Issue mode — simpler rendering, no reply/resolve/diff
  isIssueTimeline?: boolean;

  // Title shown in the header
  title?: string;

  // Callbacks
  onSelect?: (index: number) => void;
}

// ── Normalizers ──────────────────────────────────────────────────────────

/** Normalize a Discussion (MR) into a TimelineItem. */
function discussionToItem(d: Discussion): TimelineItem {
  const resolvableNotes = d.notes.filter(n => n.resolvable);
  const allResolved = resolvableNotes.length > 0 && resolvableNotes.every(n => n.resolved);
  return {
    id: d.id,
    notes: d.notes.map(n => ({
      id: n.id,
      type: n.type,
      body: n.body,
      author: n.author,
      created_at: n.created_at,
      updated_at: n.updated_at,
      system: n.system,
      resolvable: n.resolvable,
      resolved: n.resolved,
    })),
    position: d.position,
    resolvable: resolvableNotes.length > 0,
    resolved: allResolved,
  };
}

/** Normalize an IssueComment into a single-note TimelineItem. */
export function commentToItem(c: IssueComment): TimelineItem {
  return {
    id: `ic-${c.id}`,
    notes: [{
      id: c.id,
      type: 'DiscussionNote',
      body: c.body,
      author: c.author,
      created_at: c.created_at,
      updated_at: c.updated_at,
      system: c.system,
    }],
  };
}

/** Check if an object is an IssueComment (has `system` directly, no `notes`). */
function isIssueComment(obj: any): obj is IssueComment {
  return typeof obj === 'object' && obj !== null && 'system' in obj && !('notes' in obj);
}

/** Convert any supported input to TimelineItem[]. */
export function toTimelineItems(
  source: Discussion[] | IssueComment[] | TimelineItem[],
): TimelineItem[] {
  if (source.length === 0) return [];
  const first = source[0] as any;
  // TimelineItem[] — already has .notes and no .system at top level
  if ('notes' in first && !('system' in first) && !('position' in first)) {
    return source as TimelineItem[];
  }
  // IssueComment[] — has .system at top level, no .notes
  if (isIssueComment(first)) {
    return (source as IssueComment[]).map(commentToItem);
  }
  // Discussion[] — has .notes with .system inside
  if ('notes' in first && Array.isArray(first.notes)) {
    return (source as Discussion[]).map(discussionToItem);
  }
  return source as TimelineItem[];
}

// ── Component ────────────────────────────────────────────────────────────

/**
 * TimelineView — unified timeline display for MR discussions and issue comments.
 *
 * Two-column layout:
 *   Left  (60%) — vertical timeline list
 *   Right (40%) — expanded detail / full conversation
 *
 * PATTERN: Parent-controlled navigation (OpenTUI limitation)
 * - Parent manages selectedIndex state
 * - Parent handles ALL keyboard events
 * - Child is purely presentational
 */
export function TimelineView(props: TimelineViewProps) {
  const dimensions = useTerminalDimensions();

  const isSystemItem = (item: TimelineItem): boolean => {
    return item.notes.length > 0 && item.notes[0].system;
  };

  // Sort by newest first (based on most recent note)
  const sortedItems = createMemo(() => {
    const filtered = props.showOnlyComments
      ? props.items.filter(d => !isSystemItem(d))
      : props.items;
    return [...filtered].sort((a, b) => {
      const aLatest = a.notes.reduce((latest, note) => {
        const noteTime = new Date(note.created_at).getTime();
        return noteTime > latest ? noteTime : latest;
      }, 0);
      const bLatest = b.notes.reduce((latest, note) => {
        const noteTime = new Date(note.created_at).getTime();
        return noteTime > latest ? noteTime : latest;
      }, 0);
      return bLatest - aLatest;
    });
  });

  const selectedItem = createMemo(() => {
    return sortedItems()[props.selectedIndex];
  });

  // Virtual scrolling
  const visibleItems = createMemo(() => {
    const RESERVED_LINES = LAYOUT_CHROME_LINES + 2 + 2;
    const visibleHeight = dimensions().height - RESERVED_LINES;
    const items = sortedItems();
    const itemHeights = items.map(d => isSystemItem(d) ? 2 : 4);
    const result = calculateVisibleItems(items, {
      totalItems: items.length,
      selectedIndex: props.selectedIndex,
      visibleHeight,
      itemHeights,
    });
    return result.visibleItems;
  });

  // ── Formatting helpers ────────────────────────────────────────────────

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

  const getSystemNoteIcon = (body: string): string => {
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

  const systemNoteActionLine = (body: string): string => {
    const plain = containsHtml(body) ? gitlabHtmlToMarkdown(body) : body;
    const firstLine = plain.split('\n').find(l => l.trim() !== '') ?? '';
    return firstLine.replace(/^[-*•]\s*/, '').trim();
  };

  const systemNoteToMarkdown = (body: string): string => {
    return containsHtml(body) ? gitlabHtmlToMarkdown(body) : body;
  };

  // ── MR-specific helpers ───────────────────────────────────────────────

  const isItemOutdated = (item: TimelineItem): boolean => {
    if (!props.currentHeadSHA) return false;
    const pos = item.position;
    if (!pos) return false;
    return pos.head_sha !== props.currentHeadSHA;
  };

  const getFilePath = (item: TimelineItem): string => {
    const pos = item.position;
    if (!pos) return 'General comment';
    return pos.new_path || pos.old_path || 'Unknown file';
  };

  const getLineNumber = (item: TimelineItem): string => {
    const pos = item.position;
    if (!pos) return '';
    return pos.new_line ? `Line ${pos.new_line}` : pos.old_line ? `Line ${pos.old_line}` : '';
  };

  const getItemResolved = (item: TimelineItem): boolean => {
    const resolvableNotes = item.notes.filter(n => n.resolvable);
    if (resolvableNotes.length === 0) return false;
    return resolvableNotes.every(n => n.resolved);
  };

  // ── Diff snippet (MR only) ────────────────────────────────────────────

  interface DiffLine {
    type: 'added' | 'removed' | 'context' | 'header';
    content: string;
    oldLineNum?: number;
    newLineNum?: number;
  }

  const getDiffSnippet = (item: TimelineItem): DiffLine[] | null => {
    if (!props.changes || !item.position) return null;
    const position = item.position;
    const change = props.changes.find(c =>
      c.new_path === position.new_path || c.old_path === position.old_path
    );
    if (!change || !change.diff) return null;

    const lines = change.diff.split('\n');
    const targetLine = position.new_line || position.old_line;
    if (!targetLine) return null;

    const allLines: DiffLine[] = [];
    let currentOldLine = 0;
    let currentNewLine = 0;
    const contextLinesBefore = 4;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
        if (match) {
          currentOldLine = parseInt(match[1], 10) - 1;
          currentNewLine = parseInt(match[2], 10) - 1;
        }
        continue;
      }
      if (line.startsWith('---') || line.startsWith('+++')) continue;
      if (line.startsWith('+')) {
        currentNewLine++;
        allLines.push({ type: 'added', content: line.slice(1), newLineNum: currentNewLine });
      } else if (line.startsWith('-')) {
        currentOldLine++;
        allLines.push({ type: 'removed', content: line.slice(1), oldLineNum: currentOldLine });
      } else if (line.startsWith(' ')) {
        currentOldLine++;
        currentNewLine++;
        allLines.push({ type: 'context', content: line.slice(1), oldLineNum: currentOldLine, newLineNum: currentNewLine });
      }
    }

    const snippet: DiffLine[] = [];
    let targetIndex = -1;
    for (let i = 0; i < allLines.length; i++) {
      const dl = allLines[i];
      const lineNum = position.new_line ? dl.newLineNum : dl.oldLineNum;
      if (lineNum === targetLine) { targetIndex = i; break; }
    }
    if (targetIndex === -1) return null;
    const startIndex = Math.max(0, targetIndex - contextLinesBefore);
    for (let i = startIndex; i <= targetIndex; i++) snippet.push(allLines[i]);
    return snippet.length > 0 ? snippet : null;
  };

  // ── Stats ─────────────────────────────────────────────────────────────

  const stats = createMemo(() => {
    const total = props.items.length;
    const systemNotes = props.items.filter(d => isSystemItem(d)).length;
    const userComments = total - systemNotes;
    const userItems = props.items.filter(d => !isSystemItem(d));
    const resolved = userItems.filter(d => getItemResolved(d)).length;
    const open = userItems.length - resolved;
    const outdated = props.items.filter(d => isItemOutdated(d)).length;
    return { total, systemNotes, userComments, resolved, open, outdated };
  });

  // ── Layout ────────────────────────────────────────────────────────────

  const leftColumnWidth = () => Math.floor(dimensions().width * 0.6);
  const rightColumnWidth = () => dimensions().width - leftColumnWidth();
  const replyMode = () => props.replyModeId ?? null;
  const replyText = () => props.replyText ?? '';

  return (
    <ContentPanel>
      <Show when={props.loading}>
        <box style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
          <text fg={uiColors.primary} attributes={TextAttributes.BOLD}>Loading...</text>
        </box>
      </Show>

      <Show when={props.error && props.error.length > 0}>
        <box style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
          <text fg={uiColors.error} attributes={TextAttributes.BOLD}>{props.error}</text>
        </box>
      </Show>

      <Show when={!props.loading && !props.error}>
        {/* Header */}
        <box style={{ width: '100%', height: 2, flexDirection: 'column', paddingLeft: 1, paddingRight: 1, flexShrink: 0 }}>
          <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
            {props.title || (props.isIssueTimeline ? 'Timeline' : 'Discussions (' + stats().userComments + ' comments, ' + stats().systemNotes + ' events)')}
            {props.showOnlyComments && <span style={{ fg: uiColors.primary }}> [comments only]</span>}
          </text>
          <Show when={!props.isIssueTimeline}>
            <text fg={uiColors.textSecondary}>
              <span style={{ fg: stats().resolved === stats().userComments ? uiColors.success : uiColors.warning }}>
                {stats().resolved + '/' + stats().userComments + ' Resolved'}
              </span>
              {stats().outdated > 0 && <><span> • </span><span style={{ fg: uiColors.warning }}>{stats().outdated + ' Outdated'}</span></>}
            </text>
          </Show>
        </box>

        <Show when={sortedItems().length === 0}>
          <box style={{ width: '100%', flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
            <text fg={uiColors.textMuted}>
              {props.isIssueTimeline ? 'No timeline entries' : 'No discussions found'}
            </text>
          </box>
        </Show>

        <Show when={sortedItems().length > 0}>
          <box style={{ width: '100%', flexGrow: 1, flexDirection: 'row', overflow: 'hidden' }}>
            {/* ── Left: Timeline List ── */}
            <box style={{ width: leftColumnWidth(), height: '100%', flexDirection: 'column', overflow: 'hidden' }}>
              <For each={visibleItems()}>
                {({ item, absoluteIndex }) => {
                  const isSelected = () => absoluteIndex === props.selectedIndex;
                  const resolved = getItemResolved(item);
                  const outdated = isItemOutdated(item);
                  const isSystem = isSystemItem(item);
                  const filePath = getFilePath(item);
                  const lineNumber = getLineNumber(item);
                  const firstNote = item.notes[0];
                  const replyCount = item.notes.length - 1;
                  const isLast = () => absoluteIndex === sortedItems().length - 1;

                  // Determine dot color
                  const dotColor = () => {
                    if (isSystem) return uiColors.textMuted;
                    if (props.isIssueTimeline) return uiColors.primary;
                    return resolved ? uiColors.success : uiColors.warning;
                  };
                  const dotChar = () => isSystem ? '○' : props.isIssueTimeline ? '●' : '●';

                  return (
                    <box backgroundColor={isSelected() ? uiColors.bgSurface2 : undefined}
                      style={{ width: '100%', flexDirection: 'row', flexShrink: 0 }}>
                      {/* Timeline gutter */}
                      <box style={{ width: 3, flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <box style={{ width: 3, height: 1, justifyContent: 'center', alignItems: 'center' }}>
                          <text fg={dotColor()} attributes={TextAttributes.BOLD}>{dotChar()}</text>
                        </box>
                        <Show when={!isLast()}>
                          <box style={{ width: 1, flexGrow: 1, flexDirection: 'column' }}>
                            {Array(isSystem ? 1 : 3).fill(null).map((_, i) => (
                              <text fg={uiColors.bgSurface1}>│</text>
                            ))}
                          </box>
                        </Show>
                      </box>

                      {/* Content column */}
                      <box style={{ flexGrow: 1, flexDirection: 'column', paddingLeft: 2, paddingRight: 2 }}>
                        {/* System note — compact single line */}
                        <Show when={isSystem}>
                          <box style={{ width: '100%', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                            <text fg={uiColors.textMuted}>{getSystemNoteIcon(firstNote.body)}</text>
                            <text fg={uiColors.textSecondary} attributes={TextAttributes.BOLD}>{firstNote.author?.name || 'System'}</text>
                            <text fg={isSelected() ? uiColors.textSecondary : uiColors.textMuted}>{systemNoteActionLine(firstNote.body)}</text>
                            <box style={{ marginLeft: 'auto' }}>
                              <text fg={uiColors.textMuted} attributes={TextAttributes.DIM}>{formatTimestamp(firstNote.created_at)}</text>
                            </box>
                          </box>
                        </Show>

                        {/* User comment — full style */}
                        <Show when={!isSystem}>
                          <box style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between' }}>
                            <box flexDirection="row" gap={1}>
                              <Show when={!props.isIssueTimeline}>
                                <text fg={resolved ? uiColors.success : uiColors.warning} attributes={TextAttributes.BOLD}>
                                  {resolved ? '✓ Resolved' : '● Open'}
                                </text>
                              </Show>
                              <Show when={!props.isIssueTimeline}>
                                <text fg={uiColors.textMuted} attributes={TextAttributes.DIM}>
                                  {filePath}{lineNumber && ` • ${lineNumber}`}
                                </text>
                              </Show>
                            </box>
                            <box flexDirection="row" gap={0.5}>
                              {!props.isIssueTimeline && outdated && <text fg={uiColors.warning}>⚠</text>}
                              <text fg={uiColors.textMuted}>{formatTimestamp(firstNote.created_at)}</text>
                            </box>
                          </box>
                          <box style={{ width: '100%' }}>
                            <text fg={isSelected() ? uiColors.textPrimary : uiColors.textSecondary} attributes={TextAttributes.BOLD}>
                              {firstNote.author?.name || 'Unknown'}
                            </text>
                          </box>
                          <Show when={!props.isIssueTimeline && replyCount > 0}>
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

            {/* ── Right: Expanded Detail ── */}
            <box style={{ width: rightColumnWidth(), height: '100%', flexDirection: 'column', overflow: 'hidden', paddingLeft: 2, paddingRight: 2 }}
              backgroundColor={uiColors.bgBase}>
              <Show when={selectedItem()}>
                {(item) => (
                  <>
                    {/* MR-only: Diff snippet */}
                    <Show when={!props.isIssueTimeline && getDiffSnippet(item())}>
                      {(snippet) => (
                        <box style={{ width: '100%', flexDirection: 'column', flexShrink: 0, marginBottom: 2 }}>
                          <For each={snippet()}>
                            {(line) => {
                              const bgColor = () => {
                                switch (line.type) {
                                  case 'added': return uiColors.diffAddedBg;
                                  case 'removed': return uiColors.diffRemovedBg;
                                  case 'context': return uiColors.diffContextBg;
                                  default: return uiColors.bgBase;
                                }
                              };
                              const fgColor = () => {
                                switch (line.type) {
                                  case 'added': return uiColors.diffAdded;
                                  case 'removed': return uiColors.diffRemoved;
                                  case 'context': return uiColors.diffContext;
                                  default: return uiColors.textPrimary;
                                }
                              };
                              const signColor = () => {
                                switch (line.type) {
                                  case 'added': return uiColors.diffAdded;
                                  case 'removed': return uiColors.diffRemoved;
                                  default: return uiColors.textMuted;
                                }
                              };
                              const lineNum = () => {
                                if (line.type === 'added') return `   ${String(line.newLineNum || '')}`;
                                if (line.type === 'removed') return `${String(line.oldLineNum || '')}   `;
                                if (line.type === 'context') return `${String(line.oldLineNum || '')} ${String(line.newLineNum || '')}`;
                                return '     ';
                              };
                              const sign = () => {
                                switch (line.type) { case 'added': return '+'; case 'removed': return '-'; default: return ' '; }
                              };
                              return (
                                <box flexDirection="row" backgroundColor={bgColor()} paddingLeft={1} paddingRight={1}>
                                  <text fg={uiColors.textMuted} flexShrink={0} width={10}>{lineNum()}</text>
                                  <text fg={signColor()} flexShrink={0} width={2}>{sign()}</text>
                                  <text fg={fgColor()} flexGrow={1}>{line.content}</text>
                                </box>
                              );
                            }}
                          </For>
                        </box>
                      )}
                    </Show>

                    {/* Notes/Conversation */}
                    <box style={{ width: '100%', flexGrow: 1, flexDirection: 'column', overflow: 'hidden' }}>
                      <For each={item().notes}>
                        {(note, noteIndex) => {
                          const isLastNote = () => noteIndex() === item().notes.length - 1;
                          return (
                            <box style={{ width: '100%', flexDirection: 'row', flexShrink: 0 }}>
                              <box style={{ width: 4, flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                <box style={{ width: 3, height: 1, justifyContent: 'center', alignItems: 'center' }}>
                                  <text fg={note.system ? uiColors.textMuted : uiColors.primary}>
                                    {note.system ? '○' : '●'}
                                  </text>
                                </box>
                                <Show when={!isLastNote()}>
                                  <box style={{ width: 1, flexGrow: 1, flexDirection: 'column' }}>
                                    {(() => {
                                      const bodyLength = note.body?.length || 0;
                                      const contentWidth = rightColumnWidth() - 20;
                                      const lines = Math.max(3, Math.ceil(bodyLength / contentWidth) + 2);
                                      return Array(lines).fill(null).map((_, i) => (
                                        <text fg={uiColors.bgSurface1}>│</text>
                                      ));
                                    })()}
                                  </box>
                                </Show>
                              </box>
                              <box style={{ flexGrow: 1, flexDirection: 'column', paddingLeft: 1, paddingBottom: 1.5 }}>
                                <box flexDirection="row" gap={1}>
                                  <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>{note.author?.name || 'Unknown'}</text>
                                  <text fg={uiColors.textMuted}>{formatTimestamp(note.created_at)}</text>
                                </box>
                                <Show when={note.body}>
                                  <code filetype="markdown" content={note.system ? systemNoteToMarkdown(note.body) : note.body}
                                    syntaxStyle={getMarkdownSyntaxStyle()} drawUnstyledText={true} fg={uiColors.textSecondary} />
                                </Show>
                                <Show when={!note.body}>
                                  <text fg={uiColors.textMuted}>(no content)</text>
                                </Show>
                              </box>
                            </box>
                          );
                        }}
                      </For>

                      {/* MR-only: Reply area */}
                      <Show when={!props.isIssueTimeline && selectedItem() && !isSystemItem(selectedItem()!)}>
                        <box style={{ width: '100%', flexDirection: 'column', flexShrink: 0, paddingTop: 1 }}>
                          <Show when={replyMode() === selectedItem()!.id}>
                            <box style={{ width: '100%', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                              <box style={{ width: 4, flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                <text fg={uiColors.primary}>●</text>
                              </box>
                              <box style={{ flexGrow: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 1 }}
                                backgroundColor={uiColors.bgBase} border={true} borderStyle="single"
                                borderColor={uiColors.borderHighlight} paddingLeft={1} paddingRight={1}>
                                <text fg={uiColors.textPrimary}>{replyText() || 'Reply here...'}█</text>
                              </box>
                            </box>
                          </Show>
                          <Show when={replyMode() !== selectedItem()!.id}>
                            <box style={{ width: '100%', flexDirection: 'row', gap: 1, paddingLeft: 4 }}>
                              <text fg={uiColors.borderHighlight} attributes={TextAttributes.BOLD}>[r] Reply to thread</text>
                            </box>
                          </Show>
                        </box>
                      </Show>
                    </box>
                  </>
                )}
              </Show>
            </box>
          </box>
        </Show>
      </Show>
    </ContentPanel>
  );
}
