/** @jsxImportSource @opentui/solid */
import { type JSX } from 'solid-js';
import { useTerminalDimensions } from '@opentui/solid';
import { createMemo } from 'solid-js';
import { GenericModal } from './GenericModal';
import { ScrollableList } from './ScrollableList';
import { formatHelpTextLines } from './HelpText';

export interface ListViewModalProps<T> {
  // ── Data ───────────────────────────────────────────────────────────────────
  /** Full (pre-filtered) list of items to display. */
  items: T[];
  /** Currently selected item index within `items`. */
  selectedIndex: number;
  /** When true the loading state is shown instead of the list. */
  loading?: boolean;

  // ── Modal shell ────────────────────────────────────────────────────────────
  title: string;
  helpText: string;
  widthPercent?: number;
  heightPercent?: number;

  // ── Layout budget ──────────────────────────────────────────────────────────
  /**
   * Lines consumed per item row (default `1`).
   * Passed through to ScrollableList as `estimatedItemHeight`.
   */
  estimatedItemHeight?: number;

  /**
   * Additional lines of chrome rendered inside the modal **above** the list
   * (e.g. the `header` slot).  GenericModal's own chrome (title row, help-text
   * row, top/bottom padding = 4 lines) is already accounted for automatically.
   *
   * Default: `2`  (matches the historical `reservedHeight = 6 − 4` default).
   */
  reservedHeight?: number;

  // ── Slots ──────────────────────────────────────────────────────────────────
  /** Rendered above the filter bar and the list. */
  header?: JSX.Element;
  /** Rendered when `items` is empty and `loading` is false. */
  emptyContent?: JSX.Element;
  /** Text shown while loading. Default: `"Loading…"` */
  loadingText?: string;
  /**
   * Optional noun appended to the item count indicator.
   * E.g. `"branches"` → `"Showing 1–10 of 20 branches"`.
   */
  scrollIndicatorLabel?: string;

  // ── Built-in filter bar ────────────────────────────────────────────────────
  /**
   * Placeholder text shown in the dormant filter bar.
   * When provided a standard filter bar is always rendered below `header`.
   */
  filterPlaceholder?: string;
  /** When `true`, the filter `<input>` is rendered and auto-focused. */
  filterActive?: boolean;
  /**
   * Current filter query string (lives in the caller's store).
   * Displayed in the dormant bar; pre-populates the active input.
   */
  filterQuery?: string;
  /**
   * Called each time the user types in the filter input.
   */
  onFilterChange?: (query: string) => void;

  // ── Row renderer ───────────────────────────────────────────────────────────
  /**
   * Called for each visible item.  `isSelected` is a **getter** so that
   * SolidJS fine-grained reactivity is preserved when `selectedIndex` changes
   * without `items` changing.
   *
   * Usage: `<MyRow isSelected={isSelected()} ... />`
   */
  renderItem: (item: T, isSelected: () => boolean, absoluteIndex: number) => JSX.Element;
}

/**
 * ListViewModal — modal dialog wrapper around ScrollableList.
 *
 * Combines `GenericModal` (centered overlay with title / help-text footer) with
 * the `ScrollableList` primitive so consumers get virtual scrolling, a filter
 * bar, and a scroll indicator without any boilerplate.
 *
 * All keyboard / navigation logic stays in the caller.
 */
export function ListViewModal<T>(props: ListViewModalProps<T>): JSX.Element {
  const dimensions = useTerminalDimensions();

  const heightPercent = () => props.heightPercent ?? 0.7;

  /**
   * Height of the GenericModal dialog box in terminal lines.
   * Mirrors GenericModal's own computation.
   */
  const dialogHeight = createMemo(() =>
    Math.floor(dimensions().height * heightPercent()),
  );
  const dialogWidth = createMemo(() =>
    Math.floor(dimensions().width * (props.widthPercent ?? 0.5)),
  );
  const helpLineCount = createMemo(() =>
    formatHelpTextLines(props.helpText ? props.helpText.split(/\s+•\s+/).map((chunk) => {
      const [key, ...actionParts] = chunk.trim().split(/\s+/);
      return { key: key ?? '', action: actionParts.join(' ') };
    }) : [], Math.max(1, dialogWidth() - 4)).length,
  );

  /**
   * Lines available for ScrollableList content (= everything inside the modal
   * excluding GenericModal's own chrome).
   *
   * GenericModal chrome:
   *   paddingTop (1) + title row (1) + paddingBottom (1) + wrapped helpText rows (N) = 3 + N
   *
   * `props.reservedHeight` covers extra slot content above the list (default 2).
   */
  const availableLines = createMemo(() =>
    Math.max(4, dialogHeight() - (3 + helpLineCount()) - (props.reservedHeight ?? 2)),
  );

  return (
    <GenericModal
      title={props.title}
      helpText={props.helpText}
      widthPercent={props.widthPercent}
      heightPercent={props.heightPercent}
    >
      {/* Optional header slot (rendered above filter bar + list) */}
      {props.header}

      <ScrollableList<T>
        items={props.items}
        selectedIndex={props.selectedIndex}
        renderItem={props.renderItem}
        availableLines={availableLines()}
        estimatedItemHeight={props.estimatedItemHeight}
        showScrollIndicator={true}
        scrollIndicatorLabel={props.scrollIndicatorLabel}
        loading={props.loading}
        loadingText={props.loadingText}
        emptyContent={props.emptyContent}
        filterPlaceholder={props.filterPlaceholder}
        filterActive={props.filterActive}
        filterQuery={props.filterQuery}
        onFilterChange={props.onFilterChange}
      />
    </GenericModal>
  );
}
