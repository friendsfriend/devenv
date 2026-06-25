import { TextAttributes } from '@opentui/core';
import { Show, createMemo } from 'solid-js';
import { uiColors } from '../colors';
import type { MRChange } from '@devenv/types';
import { ScrollableList, LAYOUT_CHROME_LINES } from './ScrollableList';
import { CenteredState } from './CenteredState';
import { SearchHeader } from './SearchHeader';

interface ChangedFilesViewProps {
  changes: MRChange[];
  selectedIndex: number;
  onClose: () => void;
  loading?: boolean;
  error?: string;
  searchMode?: boolean;
  searchQuery?: string;
}

/**
 * ChangedFilesView Component - Displays changed files in a merge request
 * Shows file paths, change types, and diff statistics
 * 
 * PATTERN: Parent-controlled navigation (OpenTUI limitation)
 * - Parent manages selectedIndex state
 * - Parent handles ALL keyboard events via single useKeyboard hook
 * - Child is purely presentational
 */
export function ChangedFilesView(props: ChangedFilesViewProps) {
  // Get change type and color
  const getChangeType = (change: MRChange) => {
    if (change.new_file) {
      return { type: 'Added', color: uiColors.success, icon: '+' };
    } else if (change.deleted_file) {
      return { type: 'Deleted', color: uiColors.error, icon: '-' };
    } else if (change.renamed_file) {
      return { type: 'Renamed', color: uiColors.primary, icon: '→' };
    } else {
      return { type: 'Modified', color: uiColors.warning, icon: '~' };
    }
  };

  // Get file path (show new_path for renamed/new, old_path for deleted)
  const getFilePath = (change: MRChange) => {
    if (change.renamed_file) {
      return `${change.old_path} → ${change.new_path}`;
    }
    return change.new_path || change.old_path;
  };

  // Calculate total stats
  const totalStats = createMemo(() => {
    let totalAdded = 0;
    let totalDeleted = 0;
    
    for (const change of props.changes) {
      totalAdded += change.lines_added || 0;
      totalDeleted += change.lines_deleted || 0;
    }
    
    return { totalAdded, totalDeleted, totalFiles: props.changes.length };
  });

  // Lines of fixed chrome outside the list area:
  //   Layout header (3) + Layout footer (3)  = LAYOUT_CHROME_LINES (6)
  //   Outer rounded border top + bottom      = 2
  //   Own header rows (title + stats)        = 2
  //   Table header row                       = 1
  //                                   Total  = 11
  const RESERVED_LINES = LAYOUT_CHROME_LINES + 2 + 2 + 1;

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
        <CenteredState message="Loading changed files..." color={uiColors.primary} bold />
      </Show>

      <Show when={props.error}>
        <CenteredState message={props.error!} color={uiColors.error} bold />
      </Show>

      {/* Content */}
      <Show when={!props.loading && !props.error}>
        {/* Header */}
        <box
          style={{
            width: '100%',
            height: 2,
            flexDirection: 'column',
            paddingLeft: 1,
            paddingRight: 1,
          }}
        >
          <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
            Changed Files ({totalStats().totalFiles} files)
          </text>
          <text fg={uiColors.textSecondary}>
            <span style={{ fg: uiColors.success }}>+{totalStats().totalAdded}</span>
            {' '}
            <span style={{ fg: uiColors.error }}>-{totalStats().totalDeleted}</span>
          </text>
        </box>

        {/* Table Header */}
        <SearchHeader searchMode={props.searchMode} searchQuery={props.searchQuery} resultCount={props.changes.length}>
              <>
                <box style={{ width: '5%' }}>
                  <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}></text>
                </box>
                <box style={{ width: '12%' }}>
                  <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>Type</text>
                </box>
                <box style={{ width: '58%' }}>
                  <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>File Path</text>
                </box>
                <box style={{ width: '25%' }}>
                  <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>Changes (+/-)</text>
                </box>
              </>
        </SearchHeader>

        {/* Empty State */}
        <Show when={props.changes.length === 0}>
          <CenteredState message="No changed files" />
        </Show>

        {/* Table Rows — rendered via ScrollableList for correct virtual windowing */}
        <ScrollableList<MRChange>
          items={props.changes}
          selectedIndex={props.selectedIndex}
          reservedLines={RESERVED_LINES}
          estimatedItemHeight={1}
          showScrollIndicator={false}
          renderItem={(change, isSelected) => {
            const changeType = getChangeType(change);
            const filePath = getFilePath(change);
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
                {/* Icon */}
                <box style={{ width: '5%' }}>
                  <text fg={changeType.color} attributes={TextAttributes.BOLD}>
                    {changeType.icon}
                  </text>
                </box>
                {/* Type */}
                <box style={{ width: '12%' }}>
                  <text
                    fg={isSelected() ? uiColors.textPrimary : changeType.color}
                    attributes={isSelected() ? TextAttributes.BOLD : undefined}
                  >
                    {changeType.type}
                  </text>
                </box>
                {/* File Path */}
                <box style={{ width: '58%' }}>
                  <text
                    fg={isSelected() ? uiColors.textPrimary : uiColors.textSecondary}
                    attributes={isSelected() ? TextAttributes.BOLD : undefined}
                  >
                    {filePath}
                  </text>
                </box>
                {/* Stats */}
                <box style={{ width: '25%' }}>
                  <text fg={isSelected() ? uiColors.textPrimary : uiColors.textMuted}>
                    <span style={{ fg: uiColors.success }}>+{change.lines_added || 0}</span>
                    {' '}
                    <span style={{ fg: uiColors.error }}>-{change.lines_deleted || 0}</span>
                  </text>
                </box>
              </box>
            );
          }}
        />
      </Show>
    </box>
  );
}
