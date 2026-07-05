import { For, Show } from 'solid-js';
import { TextAttributes } from '@opentui/core';
import type { StatusLogEntry } from '@devenv/types';
import { uiColors } from '../colors';
import { CenteredState } from './CenteredState';
import { RunningText } from './RunningText';

export interface StatusLogViewProps {
  entries: StatusLogEntry[];
  height?: number; // in rows/lines
  width?: number; // in columns
  isMaximized?: boolean;
  runningTextEnabled?: boolean;
  runningTextOffset?: number;
}

/**
 * StatusLogView - Displays recent status log entries
 * Shows operations like pull, push, build, start, stop with status indicators
 */
export function StatusLogView(props: StatusLogViewProps) {
  const displayHeight = () => props.height || 4;
  const displayWidth = () => props.width || 80;

  /**
   * Format timestamp from ISO 8601 to YYYY-MM-DD HH:MM:SS
   * Example: "2025-12-15T10:53:58Z" → "2025-12-15 10:53:58"
   */
  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch {
      return '0000-00-00 00:00:00';
    }
  };

  /**
   * Convert status to display status
   * Matches convertStatusType() from Go implementation
   */
  const convertStatus = (status: string): string => {
    switch (status) {
      case 'in_progress':
      case 'active':
        return 'active';
      case 'completed':
        return 'completed';
      case 'failed':
      case 'cancelled':
        return 'failed';
      case 'pending':
      default:
        return 'pending';
    }
  };

  /**
   * Get status symbol based on status type
   */
  const getStatusSymbol = (status: string): string => {
    const displayStatus = convertStatus(status);
    switch (displayStatus) {
      case 'active':
        return '⋯';
      case 'completed':
        return '✓';
      case 'failed':
        return '✗';
      default:
        return '?';
    }
  };

  /**
   * Get status color based on status type
   */
  const getStatusColor = (status: string): string => {
    const displayStatus = convertStatus(status);
    switch (displayStatus) {
      case 'active':
        return uiColors.warning; // Yellow
      case 'completed':
        return uiColors.success; // Green
      case 'failed':
        return uiColors.error; // Red
      default:
        return uiColors.textMuted; // Gray
    }
  };

  /**
   * Format a single log entry with column widths
   * Dynamically calculates message width based on available space
   */
  const formatLogEntry = (entry: StatusLogEntry): { 
    timestamp: string;
    appName: string;
    operation: string;
    symbol: string;
    color: string;
  } => {
    const timestamp = formatTimestamp(entry.Timestamp);
    
    // Get app display name or fallback to ident
    const displayName = entry.AppName || entry.AppIdent;
    const operation = entry.Operation || 'info';
    
    // Fixed column widths for structured data
    const timestampWidth = 19; // "YYYY-MM-DD HH:MM:SS"
    const appNameWidth = 25;
    const operationWidth = 10;
    const separatorsWidth = 8; // " | " (3) + " | " (3) + " " (1) + " " (1)
    const symbolWidth = 1; // Status symbol
    const borderPaddingWidth = 4; // Left padding (1) + right padding (1) + borders (2)
    
    return {
      timestamp,
      appName: displayName,
      operation,
      symbol: getStatusSymbol(entry.Status),
      color: getStatusColor(entry.Status),
    };
  };

  /**
   * Get entries to display (most recent that fit in height)
   */
  const visibleEntries = () => {
    const entries = props.entries;
    if (entries.length === 0) {
      return [];
    }
    
    // No border chrome: content area equals component height.
    const availableHeight = displayHeight();
    
    if (entries.length <= availableHeight) {
      return entries;
    }
    
    // Show most recent entries
    return entries.slice(entries.length - availableHeight);
  };

  return (
    <box
      backgroundColor={uiColors.bgMantle}
      style={{
        width: '100%',
        height: displayHeight(),
        flexDirection: 'column',
      }}
    >
      <Show
        when={visibleEntries().length > 0}
        fallback={
          <CenteredState
            message="No status updates yet... [L to maximize]"
            italic
            height="auto"
            style={{ flexGrow: 1 }}
          />
        }
      >
        <box
          style={{
            width: '100%',
            flexDirection: 'column',
            paddingLeft: 1,
            paddingRight: 1,
          }}
        >
          <For each={visibleEntries()}>
            {(entry) => {
              const formatted = formatLogEntry(entry);
              
              return (
                <box
                  style={{
                    width: '100%',
                    height: 1,
                    flexDirection: 'row',
                  }}
                >
                  {/* Single line with all info - no gaps, using padded strings */}
                  <text fg={uiColors.primary}>
                    {formatted.timestamp}
                  </text>
                  <text fg={uiColors.textMuted}> | </text>
                  <box style={{ width: 25 }}>
                    <RunningText
                      text={formatted.appName}
                      width={25}
                      fg={uiColors.primary}
                      attributes={TextAttributes.BOLD}
                      enabled={props.runningTextEnabled}
                      active={props.isMaximized}
                      offset={props.runningTextOffset}
                    />
                  </box>
                  <text fg={uiColors.textMuted}> | </text>
                  <box style={{ width: 10 }}>
                    <RunningText
                      text={formatted.operation}
                      width={10}
                      fg={uiColors.textPrimary}
                      attributes={TextAttributes.BOLD}
                      enabled={props.runningTextEnabled}
                      active={props.isMaximized}
                      offset={props.runningTextOffset}
                    />
                  </box>
                  <text fg={uiColors.textMuted}> </text>
                  <text fg={formatted.color}>
                    {formatted.symbol}
                  </text>
                  <text fg={uiColors.textMuted}> </text>
                  <RunningText
                    text={entry.Message}
                    width={Math.max(1, displayWidth() - 19 - 25 - 10 - 8 - 1 - 4)}
                    fg={formatted.color}
                    enabled={props.runningTextEnabled}
                    active={props.isMaximized}
                    offset={props.runningTextOffset}
                  />
                </box>
              );
            }}
          </For>
        </box>
      </Show>
    </box>
  );
}
