import { TextAttributes } from '@opentui/core';
import { Show } from 'solid-js';
import { colors, uiColors } from '../colors';
import type { MergeRequest } from '@devenv/types';
import { ScrollableList, LAYOUT_CHROME_LINES } from './ScrollableList';

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
  const hasSearch = () => (props.searchQuery ?? '').length > 0;

  // Lines of fixed chrome outside the list area:
  //   Layout header (3) + Layout footer (3)  = LAYOUT_CHROME_LINES (6)
  //   Outer rounded border top + bottom      = 2
  //   Table header row                       = 1
  //                                   Total  = 9
  const RESERVED_LINES = LAYOUT_CHROME_LINES + 2 + 1;

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status color
  const getStatusColor = (status?: string) => {
    if (!status) return uiColors.textMuted;
    switch (status.toLowerCase()) {
      case 'success':
        return uiColors.success;
      case 'failed':
        return uiColors.error;
      case 'running':
        return uiColors.primary;
      case 'pending':
        return uiColors.warning;
      default:
        return uiColors.textMuted;
    }
  };

  // Get state color
  const getStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'opened':
        return uiColors.success;
      case 'merged':
        return uiColors.primary;
      case 'closed':
        return uiColors.textMuted;
      default:
        return uiColors.textSecondary;
    }
  };

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
          <text style={{ fg: uiColors.primary }}>Loading merge requests...</text>
        </box>
      </Show>

      {/* Error State */}
      <Show when={!props.loading && props.error}>
        <box
          style={{
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <text style={{ fg: uiColors.error }}>{props.error}</text>
        </box>
      </Show>

      {/* Empty State */}
      <Show when={!props.loading && !props.error && props.mergeRequests.length === 0}>
        <box
          style={{
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <text style={{ fg: uiColors.textMuted }}>No merge requests found</text>
        </box>
      </Show>

      {/* MR Table */}
      <Show when={!props.loading && !props.error && props.mergeRequests.length > 0}>
        {/* Table Header */}
        <box
          backgroundColor={uiColors.bgSurface1}
          style={{
            width: '100%',
            height: 1,
            flexDirection: 'row',
            paddingLeft: 1,
            paddingRight: 1,
          }}
        >
          <Show
            when={props.searchMode || hasSearch()}
            fallback={
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
            }
          >
            <box flexDirection="row">
              <text fg={colors.peach}>/</text>
              <text fg={uiColors.textPrimary}>{props.searchQuery ?? ''}</text>
              <Show when={props.searchMode}>
                <text fg={uiColors.primary}>█</text>
              </Show>
            </box>
          </Show>
        </box>

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
                  <text style={{ fg: getStateColor(mr.state) }}>{mr.state}</text>
                </box>
                <box style={{ width: '13%' }}>
                  <text style={{ fg: getStatusColor(mr.head_pipeline?.status) }}>
                    {mr.head_pipeline?.status || '-'}
                  </text>
                </box>
                <box style={{ width: '14%' }}>
                  <text style={{ fg: uiColors.textMuted }}>{formatDate(mr.updated_at)}</text>
                </box>
              </box>
            );
          }}
        />
      </Show>
    </box>
  );
}
