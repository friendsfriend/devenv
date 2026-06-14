import { createSignal, onMount, createEffect, For, type JSX } from 'solid-js';
import { useKeyboard, useTerminalDimensions } from '@opentui/solid';
import { uiColors } from '../colors';

export interface LogViewProps {
  /** Log content to display */
  logs: string;
  /** Callback when user presses ESC to close */
  onClose: () => void;
  /** Current scroll position (0-1, where 1 is bottom) */
  scrollPosition?: number;
  /** Callback when scroll position changes */
  onScroll?: (position: number) => void;
}

/**
 * LogView - Displays scrollable container/operation logs in a bordered panel
 * 
 * Based on Go's tui/logView.go but adapted for OpenTUI/SolidJS.
 * 
 * Features:
 * - Scrollable viewport with wide content (prevents wrapping)
 * - Keyboard navigation: j/k (scroll), h/l (horizontal), u/d (page), g/G (top/bottom)
 * - ESC to close (handled by parent)
 * - Auto-scroll to bottom when opened
 * - Uses Layout header for title, footer (StatusBar) for keybindings
 * 
 * @example
 * ```tsx
 * <LogView
 *   logs={containerLogs}
 *   onClose={() => setShowLogs(false)}
 * />
 * ```
 */
export function LogView(props: LogViewProps) {
  const dimensions = useTerminalDimensions();
  
  // Split logs into lines for scrolling
  const lines = () => props.logs.split('\n');
  const [scrollOffset, setScrollOffset] = createSignal(0);
  const [isAtBottom, setIsAtBottom] = createSignal(true);
  
  // Calculate viewport height (total height - borders - padding - margins)
  // Total height minus: outer padding (2), border (2), inner padding (2), header space (1), footer space (1) = -8
  const viewportHeight = () => Math.max(5, dimensions().height - 8);
  
  // Calculate maximum scroll offset to prevent scrolling past the last line
  const maxScrollOffset = () => Math.max(0, lines().length - viewportHeight());
  
  // Auto-scroll to bottom when logs first load or change
  createEffect(() => {
    const totalLines = lines().length;
    // Start at the bottom - scroll to show the last viewportHeight lines
    const maxOffset = maxScrollOffset();
    setScrollOffset(maxOffset);
    setIsAtBottom(true);
  });

  // Keyboard navigation handlers with boundary checks
  useKeyboard((event) => {
    const totalLines = lines().length;
    const currentOffset = scrollOffset();
    const maxOffset = maxScrollOffset();

    // Check for Shift+G (go to bottom) - OpenTUI may represent this differently
    if ((event.name === 'G' || (event.name === 'g' && event.shift)) && event.shift !== false) {
      setScrollOffset(maxOffset);
      setIsAtBottom(true);
      return;
    }

    switch (event.name) {
      case 'j':
      case 'Down':
        // Scroll down one line (only if not at bottom)
        if (currentOffset < maxOffset) {
          const newOffset = currentOffset + 1;
          setScrollOffset(newOffset);
          setIsAtBottom(newOffset >= maxOffset);
        }
        break;
      case 'k':
      case 'Up':
        // Scroll up one line (only if not at top)
        if (currentOffset > 0) {
          setScrollOffset(currentOffset - 1);
          setIsAtBottom(false);
        }
        break;
      case 'd':
        // Scroll down half page (10 lines) - stop at bottom
        if (currentOffset < maxOffset) {
          const newOffset = Math.min(maxOffset, currentOffset + 10);
          setScrollOffset(newOffset);
          setIsAtBottom(newOffset >= maxOffset);
        }
        break;
      case 'u':
        // Scroll up half page (10 lines) - stop at top
        if (currentOffset > 0) {
          setScrollOffset(Math.max(0, currentOffset - 10));
          setIsAtBottom(false);
        }
        break;
      case 'g':
        // Go to top (lowercase g only, without shift)
        if (!event.shift) {
          setScrollOffset(0);
          setIsAtBottom(false);
        }
        break;
    }
  });

  // Get visible lines - return array of individual lines for rendering
  const visibleLines = () => {
    const allLines = lines();
    const offset = scrollOffset();
    const height = viewportHeight();
    // Return array of lines (from offset to offset + height)
    return allLines.slice(offset, offset + height);
  };

  return (
    <box
      style={{
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        padding: 1,
      }}
    >
      {/* Log content container with border */}
      <box
        style={{
          width: '100%',
          height: '100%',
          flexDirection: 'column',
          borderStyle: 'rounded',
          borderColor: uiColors.textMuted,
          padding: 1,
        }}
      >
        {/* Scrollable log content - maintains full height */}
        <box
          style={{
            width: '100%',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <For each={visibleLines()}>
            {(line) => (
              <box style={{ width: '100%', height: 1, flexShrink: 0 }}>
                <text style={{ fg: uiColors.textPrimary }}>
                  {line}
                </text>
              </box>
            )}
          </For>
        </box>
      </box>
    </box>
  );
}
