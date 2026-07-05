import { TextAttributes } from '@opentui/core';
import { Show, createMemo } from 'solid-js';
import { uiColors } from '../colors';
import type { ChangeRequest } from '@devenv/types';
import { ScrollableList, LAYOUT_CHROME_LINES } from './ScrollableList';
import { CenteredState } from './CenteredState';
import { SearchHeader } from './SearchHeader';
import { formatShortDate, getIssueStateColor, getPipelineStatusColor } from '../statusUtils';
import { WorkItemCard } from './WorkItemCard';
import { ContentPanel } from './ContentStack';

interface ChangeRequestViewProps {
  changeRequests: ChangeRequest[];
  selectedIndex: number;
  onClose: () => void;
  onSelectCR?: (cr: ChangeRequest) => void;
  onSelectedIndexChange?: (index: number) => void;
  loading?: boolean;
  error?: string;
  searchMode?: boolean;
  searchQuery?: string;
  currentPage?: number;
  totalPages?: number;
  state?: string;
  runningTextEnabled?: boolean;
  runningTextOffset?: number;
}

/**
 * ChangeRequestView Component - Displays change requests as compact cards.
 *
 * PATTERN: Parent-controlled navigation (OpenTUI limitation)
 * - Parent manages selectedIndex state
 * - Parent handles ALL keyboard events via single useKeyboard hook
 * - Child is purely presentational
 */
export function ChangeRequestView(props: ChangeRequestViewProps) {
  // Lines of fixed chrome outside the list area:
  //   Layout header (2) + Layout footer (3)  = LAYOUT_CHROME_LINES (5)
  //   Top/bottom spacers + summary header    = 3
  const RESERVED_LINES = LAYOUT_CHROME_LINES + 3;

  const getMergeStatusText = (cr: ChangeRequest) => {
    if (cr.has_conflicts) return { text: '✗', fg: uiColors.error };
    if (cr.merge_status === 'can_be_merged') return { text: '✓', fg: uiColors.success };
    if (cr.draft || cr.work_in_progress) return { text: '○', fg: uiColors.warning };
    return { text: '○', fg: uiColors.textMuted };
  };

  const stateColor = createMemo(() => {
    const s = props.state ?? 'opened';
    if (s === 'opened') return uiColors.success;
    if (s === 'closed') return uiColors.error;
    return uiColors.warning; // "all"
  });

  const summary = createMemo(() => {
    const cp = props.currentPage ?? 1;
    const tp = props.totalPages;
    const loaded = props.changeRequests.length;
    return tp && tp > 0
      ? `[Pg ${cp}/${tp}] [${loaded} loaded]`
      : `[Pg ${cp}] [${loaded} loaded]`;
  });

  const scrollSelection = (direction: 'up' | 'down' | 'left' | 'right', delta: number) => {
    if (!props.onSelectedIndexChange || props.changeRequests.length === 0) return;
    const amount = Math.max(1, delta);
    const next = direction === 'down' || direction === 'right'
      ? props.selectedIndex + amount
      : props.selectedIndex - amount;
    props.onSelectedIndexChange(Math.max(0, Math.min(next, props.changeRequests.length - 1)));
  };

  return (
    <ContentPanel>
      <Show when={props.loading}>
        <CenteredState message="Loading change requests..." color={uiColors.primary} />
      </Show>

      <Show when={!props.loading && props.error}>
        <CenteredState message={props.error!} color={uiColors.error} />
      </Show>

      <Show when={!props.loading && !props.error}>
        <SearchHeader searchMode={props.searchMode} searchQuery={props.searchQuery}>
          <box style={{ width: '100%', flexDirection: 'row' }}>
            <text fg={uiColors.textPrimary}>Change requests</text>
            <box style={{ width: 'auto', flexDirection: 'row', gap: 1 }}>
              <text fg={stateColor()} attributes={TextAttributes.BOLD}>{`[${props.state ?? 'opened'}]`}</text>
            </box>
            <box style={{ width: 'auto', marginLeft: 'auto' }}>
              <text fg={uiColors.textMuted}>{summary()}</text>
            </box>
          </box>
        </SearchHeader>

        <Show when={props.changeRequests.length === 0}
          fallback={
            <ScrollableList<ChangeRequest>
              items={props.changeRequests}
              selectedIndex={props.selectedIndex}
              reservedLines={RESERVED_LINES}
              estimatedItemHeight={2}
              showScrollIndicator={false}
              onScroll={scrollSelection}
              renderItem={(cr, isSelected, index) => {
                const mergeStatus = getMergeStatusText(cr);
                const pipeline = cr.head_pipeline?.status || '-';
                return (
                  <WorkItemCard
                    marker={`!${cr.iid}`}
                    prefix={`${mergeStatus.text} `}
                    prefixColor={mergeStatus.fg}
                    title={cr.title}
                    statusText={cr.state}
                    statusColor={getIssueStateColor(cr.state)}
                    statusSuffixText={` • pipeline ${pipeline}`}
                    statusSuffixColor={getPipelineStatusColor(cr.head_pipeline?.status)}
                    metadata={`@${cr.author.name} • updated ${formatShortDate(cr.updated_at)}`}
                    selected={isSelected()}
                    index={index}
                    onMouseUp={props.onSelectCR ? () => props.onSelectCR!(cr) : undefined}
                    runningTextEnabled={props.runningTextEnabled}
                    runningTextOffset={props.runningTextOffset}
                  />
                );
              }}
            />
          }
        >
          <CenteredState message="No change requests found" />
        </Show>
      </Show>
    </ContentPanel>
  );
}
