import { createMemo, For, Show } from 'solid-js';
import { ScrollBoxRenderable, TextAttributes } from '@opentui/core';
import type { TextChunk } from '@opentui/core';
import { useRenderer } from '@opentui/solid';
import { colors, uiColors } from '../colors';
import { ansiToStyledText, stripAnsi } from '../ansiToStyledText';
import { GenericModal } from './GenericModal';
import { HelpText } from './HelpText';
import { LogAiOverlay } from './LogAiOverlay';
import { ScrollableContent } from './ScrollableContent';

export interface LogModalProps {
  /** Modal title / header label (e.g. "Container Logs: my-app (auto-refresh: 10s)") */
  title: string;
  /** Raw log text — newline-separated */
  logs: string;
  /**
   * Called once on mount with the ScrollBoxRenderable so the parent can call
   * scrollBy / scrollTo directly (same imperative pattern as DiffViewModal).
   */
  onScrollBoxReady: (scrollBox: ScrollBoxRenderable) => void;
  onClose: () => void;

  /** Current vertical scroll offset (lines from top). Updated by parent after each scroll. */
  scrollTop: number;
  /** Number of visible rows in the viewport. Used for windowed rendering. */
  viewportHeight: number;

  /** Index of the currently highlighted line (cursor). Always visible. */
  selectedLine: number;
  /** Whether visual line selection mode is active (v key toggles). */
  visualModeActive: boolean;
  /** Line index where the visual selection started. */
  visualModeStart: number;

  // ── Search ──────────────────────────────────────────────────────────────
  /** Whether the user is currently typing a search query (/ was pressed). */
  searchMode: boolean;
  /** Current search string (empty = no active search). */
  searchQuery: string;
  /**
   * Set of line indices that contain at least one match.
   * All matches are highlighted; the "current" match line gets a distinct colour.
   */
  searchMatchLines: ReadonlySet<number>;
  /** Index into the match list that is the "current" (focused) match. -1 = none. */
  searchMatchIndex: number;
  /**
   * Ordered list of matching line indices (same order as the match list).
   * Used so we can look up which line corresponds to searchMatchIndex.
   */
  searchMatchLinesList: readonly number[];

  // ── AI analysis overlay ─────────────────────────────────────────────────
  /** True while the user is typing the optional AI prompt (Shift+A pressed). */
  aiPromptMode: boolean;
  /** Text the user has typed so far for the AI prompt. */
  aiPromptText: string;
  /** True while waiting for the AI analysis response. */
  aiLoading: boolean;
  aiStreaming: boolean;
  /** The AI summary text once available, or null when not yet requested / dismissed. */
  aiSummary: string | null;
  aiError: string | null;
  /** Whether the AI overlay is currently visible (independent of state). */
  aiVisible: boolean;
  /** Called when the user presses Esc inside the AI overlay to dismiss it. */
  onAiDismiss: () => void;
  onAiScrollBoxReady?: (scrollBox: ScrollBoxRenderable) => void;
  /** Text currently typed in the followup input field. */
  aiFollowupText: string;
}

// ── helpers ────────────────────────────────────────────────────────────────

function chunkStyle(chunk: TextChunk): Record<string, unknown> {
  const attrs = chunk.attributes ?? 0;
  return {
    ...(chunk.fg && { fg: chunk.fg }),
    ...(chunk.bg && { bg: chunk.bg }),
    ...(attrs & TextAttributes.BOLD        && { bold: true }),
    ...(attrs & TextAttributes.ITALIC      && { italic: true }),
    ...(attrs & TextAttributes.UNDERLINE   && { underline: true }),
    ...(attrs & TextAttributes.DIM         && { dim: true }),
    ...(attrs & TextAttributes.BLINK       && { blink: true }),
    ...(attrs & TextAttributes.INVERSE     && { reverse: true }),
    ...(attrs & TextAttributes.STRIKETHROUGH && { strikethrough: true }),
  };
}

/**
 * Split `text` into alternating [non-match, match, non-match, …] segments for
 * the given (lowercased) query. Returns an array of { text, isMatch } tuples.
 */
function splitMatches(text: string, query: string): Array<{ text: string; isMatch: boolean }> {
  if (!query) return [{ text, isMatch: false }];
  const lower = text.toLowerCase();
  const segments: Array<{ text: string; isMatch: boolean }> = [];
  let pos = 0;
  while (pos < text.length) {
    const idx = lower.indexOf(query, pos);
    if (idx === -1) {
      segments.push({ text: text.slice(pos), isMatch: false });
      break;
    }
    if (idx > pos) {
      segments.push({ text: text.slice(pos, idx), isMatch: false });
    }
    segments.push({ text: text.slice(idx, idx + query.length), isMatch: true });
    pos = idx + query.length;
  }
  return segments;
}

// ── component ──────────────────────────────────────────────────────────────

/**
 * LogModal — scrollable log viewer rendered as a full-height popup overlay.
 *
 * Follows the same pattern as DiffViewModal:
 * - Pure presentational component, no useKeyboard hook.
 * - Scrolling is driven imperatively by the parent via scrollBy/scrollTo on the
 *   ScrollBoxRenderable exposed through onScrollBoxReady.
 * - Uses GenericModal for consistent backdrop + sizing.
 * - Starts at the bottom via stickyScroll/stickyStart="bottom".
 * - Highlights the cursor line at all times; visual mode highlights a range.
 * - Search mode: / opens an inline query bar; all matches are highlighted in
 *   yellow; n/p navigate between matches.
 */
export function LogModal(props: LogModalProps) {
  const renderer = useRenderer();
  let scrollBox: ScrollBoxRenderable | undefined;

  const dimensions = () => ({
    width: renderer.width,
    height: renderer.height,
  });

  const lines = createMemo(() => props.logs.split('\n'));
  const lineCount = () => lines().length;

  // No windowed rendering — all lines are passed to <For> and OpenTUI's built-in
  // viewportCulling handles skipping off-screen nodes at the renderer level.
  // Windowed rendering (topSpacer + slice + bottomSpacer) caused a layout race:
  // setting logScrollTop grew topSpacerHeight in the same tick as sb.scrollTo(),
  // so OpenTUI clamped the scroll to the old (small) scrollHeight → blank page.

  const isInVisualSelection = (index: number): boolean => {
    if (!props.visualModeActive) return false;
    const start = Math.min(props.visualModeStart, props.selectedLine);
    const end   = Math.max(props.visualModeStart, props.selectedLine);
    return index >= start && index <= end;
  };

  const isCurrentSearchMatch = (index: number): boolean => {
    if (props.searchMatchIndex < 0) return false;
    return props.searchMatchLinesList[props.searchMatchIndex] === index;
  };

  // ── header ──────────────────────────────────────────────────────────────

  const matchCount = () => props.searchMatchLines.size;

  const customHeader = () => (
    <box flexShrink={0} flexDirection="row" justifyContent="space-between" alignItems="center">
      <box flexDirection="row" gap={1} alignItems="center">
        <text fg={uiColors.textPrimary}>
          <b>{props.title}</b>
        </text>
        <Show when={props.visualModeActive}>
          <text fg={uiColors.warning}> VISUAL</text>
        </Show>
        {/* While typing: show live input; after confirm: show query + match count */}
        <Show
          when={props.searchMode}
          fallback={
            <Show when={props.searchQuery.length > 0}>
              <text fg={colors.peach}>
                {' '}/{props.searchQuery}
                {matchCount() > 0
                  ? ` (${(props.searchMatchIndex >= 0 ? props.searchMatchIndex + 1 : 1)}/${matchCount()})`
                  : ' (no matches)'}
              </text>
            </Show>
          }
        >
          <box flexDirection="row" alignItems="center">
            <text fg={colors.peach}> /</text>
            <text fg={uiColors.textPrimary}>{props.searchQuery}</text>
            <text fg={uiColors.primary}>█</text>
          </box>
        </Show>
      </box>
      <text fg={uiColors.textMuted}>
        {String(lineCount())} lines
      </text>
    </box>
  );

  // ── footer ──────────────────────────────────────────────────────────────

  const customFooter = () => (
    <box paddingTop={1} flexShrink={0}>
      <HelpText entries={
        props.searchMode
          ? [
              { key: 'Enter', action: 'Confirm search' },
              { key: 'Backspace', action: 'Delete char' },
              { key: 'Esc', action: 'Cancel search' },
            ]
          : props.visualModeActive
          ? [
              { key: 'j/k', action: 'Extend selection' },
              { key: 'c', action: 'Copy selection' },
              { key: 'A', action: 'AI (selection)' },
              { key: 'Esc', action: 'Exit visual' },
            ]
          : [
              { key: 'j/k', action: 'Up/Down' },
              { key: 'h/l ←/→', action: 'Left/Right' },
              { key: 'u/d', action: 'Page' },
              { key: 'g/G', action: 'Top/Bot' },
              { key: '/', action: 'Search' },
              { key: 'n/p', action: 'Next/Prev match' },
              { key: 'v', action: 'Visual mode' },
              { key: 'c', action: 'Copy line' },
              { key: 'e', action: 'Open in editor' },
              { key: 'A', action: 'AI analysis' },
              { key: 'Esc', action: 'Close' },
            ]
      } />
    </box>
  );

  // ── render ──────────────────────────────────────────────────────────────

  return (
    <GenericModal
      title=""
      helpText=""
      widthPercent={0.92}
      heightPercent={(dimensions().height - 4) / dimensions().height}
      customHeader={customHeader()}
      customFooter={customFooter()}
      onBackdropClick={props.onClose}
    >
      <ScrollableContent
        axes={['x', 'y']}
        keyboardAxes={['x']}
        onScrollBoxReady={(r) => {
          scrollBox = r;
          props.onScrollBoxReady(r);
        }}
        viewportCulling={true}
        stickyScroll={true}
        stickyStart="bottom"
      >
        <box paddingLeft={1} paddingRight={1}>
          <For each={lines()}>
            {(line, localIndex) => {
              const index = localIndex;
              const isCursor = () => index() === props.selectedLine;
              const inSelection = () => isInVisualSelection(index());
              const isMatchLine = () => props.searchMatchLines.has(index());
              const isCurrentMatch = () => isCurrentSearchMatch(index());

              const bgColor = () => {
                if (isCursor())       return uiColors.primary;
                if (inSelection())    return uiColors.bgSurface2;
                if (isCurrentMatch()) return uiColors.bgSurface2;
                return undefined;
              };

              const fgColor = () => {
                if (isCursor()) return uiColors.bgBase;
                return uiColors.textPrimary;
              };

              const lineWidth = Math.max(stripAnsi(line).length, 1);
              const styledLine = ansiToStyledText(line);

              const query = () => props.searchQuery.toLowerCase();
              const hasSearch = () => query().length > 0 && isMatchLine();

              return (
                <box
                  flexDirection="row"
                  backgroundColor={bgColor()}
                  style={{ flexShrink: 0, height: 1, minWidth: '100%', width: lineWidth }}
                >
                  <Show
                    when={hasSearch()}
                    fallback={
                      styledLine
                        ? <text fg={fgColor()}>
                            <For each={styledLine.chunks}>
                              {(chunk) => <span style={chunkStyle(chunk)}>{chunk.text}</span>}
                            </For>
                          </text>
                        : <text fg={fgColor()}>{line}</text>
                    }
                  >
                    <For each={splitMatches(stripAnsi(line), query())}>
                      {(seg) => (
                        <Show
                          when={seg.isMatch}
                          fallback={<text fg={fgColor()}>{seg.text}</text>}
                        >
                          <text
                            fg={colors.base}
                            bg={isCurrentMatch() ? colors.peach : colors.yellow}
                          >
                            {seg.text}
                          </text>
                        </Show>
                      )}
                    </For>
                  </Show>
                </box>
              );
            }}
          </For>
        </box>
      </ScrollableContent>
      <Show when={props.aiVisible && (props.aiPromptMode || props.aiLoading || props.aiSummary !== null || props.aiError !== null)}>
        <LogAiOverlay
          promptMode={props.aiPromptMode}
          promptText={props.aiPromptText}
          loading={props.aiLoading}
          streaming={props.aiStreaming}
          summary={props.aiSummary}
          error={props.aiError}
          followupText={props.aiFollowupText}
          onDismiss={props.onAiDismiss}
          onScrollBoxReady={props.onAiScrollBoxReady}
        />
      </Show>
    </GenericModal>
  );
}
