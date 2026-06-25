import { TextAttributes } from '@opentui/core';
import { Show } from 'solid-js';
import { uiColors } from '../colors';
import type { MergeRequest } from '@devenv/types';
import { ScrollableList, LAYOUT_CHROME_LINES } from './ScrollableList';
import { CenteredState } from './CenteredState';
import { SearchHeader } from './SearchHeader';
import { formatShortDate, getIssueStateColor, getPipelineStatusColor } from '../statusUtils';

interface MergeRequestViewProps {
  mergeRequests: MergeRequest[];
  selectedIndex: number;
  onClose: () => void;
  onSelectMR?: (mr: MergeRequest) => void;
  loading?: boolean;
  error?: string;
  searchMode?: boolean;
  searchQuery?: string;
  currentPage?: number;
  totalPages?: number;
}

/**
 * MergeRequestView Component - Displays merge requests in table format
 * Matches the styling of the Table component
 * Port of tui/mergeRequestView.go
 * 
 * PATTERN: Parent-controlled navigation (OpenTUI limitation)
 * - Parent manages selectedIndex state
 * - Parent handles ALL keyboard events via single useKeyboard hook
 * - Child is purely presentational
 * 
 * Note: OpenTUI only allows ONE useKeyboard hook to be active.
 * Multiple hooks don't work - only the first registered hook receives events.
 */
export function MergeRequestView(props: MergeRequestViewProps) {
  // Lines of fixed chrome outside the list area:
  //   Layout header (3) + Layout footer (3)  = LAYOUT_CHROME_LINES (6)
  //   Outer rounded border top + bottom      = 2
  //   Table header row                       = 1
  //                                   Total  = 9
  const RESERVED_LINES = LAYOUT_CHROME_LINES + 2 + 1;

  // Get merge status indicator
  const getMergeStatusText = (mr: MergeRequest) => {
    if (mr.has_conflicts) return { text: '✗', fg: uiColors.error };
    if (mr.merge_status === 'can_be_merged')
      return { text: '✓', fg: uiColors.success };
    if (mr.draft || mr.work_in_progress)
      return { text: '○', fg: uiColors.warning };
    return { text: '○', fg: uiColors.textMuted };
  };

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
      <Show when={props.loading}>
        <CenteredState message="Loading merge requests..." color={uiColors.primary} />
      </Show>

      <Show when={!props.loading && props.error}>
        <CenteredState message={props.error!} color={uiColors.error} />
      </Show>

      <Show when={!props.loading && !props.error && props.mergeRequests.length === 0}>
        <CenteredState message="No merge requests found" />
      </Show>

      {/* MR Table */}
      <Show when={!props.loading && !props.error && props.mergeRequests.length > 0}>
        {/* Table Header */}
        <SearchHeader searchMode={props.searchMode} searchQuery={props.searchQuery}>
              <>
                <box style={{ width: 8 }}>
                  <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
                    !ID
                  </text>
                </box>
                <box style={{ width: '30%' }}>
                  <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
                    Title
                  </text>
                </box>
                <box style={{ width: '14%' }}>
                  <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
                    Author
                  </text>
                </box>
                <box style={{ width: '10%' }}>
                  <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
                    State
                  </text>
                </box>
                <box style={{ width: '13%' }}>
                  <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
                    Pipeline
                  </text>
                </box>
                <box style={{ width: '14%' }}>
                  <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
                    Updated
                  </text>
                </box>
                <box style={{ width: 'auto', marginLeft: 'auto' }}>
                  <text fg={uiColors.textMuted}>
                    {(() => {
                      const cp = props.currentPage ?? 1;
                      const tp = props.totalPages;
                      if (tp && tp > 0) return `[Pg ${cp}/${tp}]`;
                      return `[Pg ${cp}]`;
                    })()}
                  </text>
                </box>
              </>
        </SearchHeader>

        {/* Table Body — rendered via ScrollableList */}
        <ScrollableList<MergeRequest>
          items={props.mergeRequests}
          selectedIndex={props.selectedIndex}
          reservedLines={RESERVED_LINES}
          estimatedItemHeight={1}
          showScrollIndicator={false}
          renderItem={(mr, isSelected) => {
            const mergeStatus = getMergeStatusText(mr);
            return (
              <box
                backgroundColor={isSelected() ? uiColors.bgSurface2 : undefined}
                style={{
                  width: '100%',
                  height: 1,
                  flexDirection: 'row',
                  paddingLeft: 1,
                  paddingRight: 1,
                }}
              >
                <box style={{ width: 8 }}>
                  <text style={{ fg: isSelected() ? uiColors.primary : uiColors.textSecondary }}>
                    !{mr.iid}
                  </text>
                </box>
                <box style={{ width: '30%', flexDirection: 'row' }}>
                  <text style={{ fg: mergeStatus.fg }}>{mergeStatus.text}{' '}</text>
                  <text style={{ fg: isSelected() ? uiColors.textPrimary : uiColors.textSecondary }}>
                    {mr.title}
                  </text>
                </box>
                <box style={{ width: '14%' }}>
                  <text style={{ fg: uiColors.textSecondary }}>{mr.author.name}</text>
                </box>
                <box style={{ width: '10%' }}>
                  <text style={{ fg: getIssueStateColor(mr.state) }}>{mr.state}</text>
                </box>
                <box style={{ width: '13%' }}>
                  <text style={{ fg: getPipelineStatusColor(mr.head_pipeline?.status) }}>
                    {mr.head_pipeline?.status || '-'}
                  </text>
                </box>
                <box style={{ width: '14%' }}>
                  <text style={{ fg: uiColors.textMuted }}>{formatShortDate(mr.updated_at)}</text>
                </box>
              </box>
            );
          }}
        />
      </Show>
    </box>
  );
}
