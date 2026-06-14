import { TextAttributes } from '@opentui/core';
import { Show, createMemo } from 'solid-js';
import { colors, uiColors } from '../colors';
import type { TestCase, TestSuite } from '@devenv/types';
import { ScrollableList, LAYOUT_CHROME_LINES } from './ScrollableList';

interface TestResultsDetailViewProps {
  testSuites?: TestSuite[];
  loading?: boolean;
  error?: string;
  selectedIndex: number;
  onClose: () => void;
  searchMode?: boolean;
  searchQuery?: string;
}

/**
 * TestResultsDetailView Component - Shows all test results in table format
 * Failed tests are shown first, then sorted by class name
 * Uses the same table pattern as the application list
 * Navigation is handled by parent component
 */
export function TestResultsDetailView(props: TestResultsDetailViewProps) {

  const hasSearch = () => (props.searchQuery ?? '').length > 0;

  // Sort all tests - failed/error first, then by class name, then by test name
  const sortedTests = createMemo(() => {
    if (!props.testSuites) return [];

    const allTests: Array<TestCase & { suiteName: string }> = [];
    
    for (const suite of props.testSuites) {
      for (const testCase of suite.test_cases) {
        allTests.push({
          ...testCase,
          suiteName: suite.name,
        });
      }
    }

    // Sort: Failed/Error first, then by class name, then by test name
    return allTests.sort((a, b) => {
      const aIsFailed = a.status === 'failed' || a.status === 'error';
      const bIsFailed = b.status === 'failed' || b.status === 'error';

      // Failed tests come first
      if (aIsFailed && !bIsFailed) return -1;
      if (!aIsFailed && bIsFailed) return 1;

      // Within same status, sort by class name
      const classCompare = a.classname.localeCompare(b.classname);
      if (classCompare !== 0) return classCompare;

      // Within same class, sort by test name
      return a.name.localeCompare(b.name);
    });
  });

  // Filter sorted tests by search query
  const filteredTests = createMemo(() => {
    const q = (props.searchQuery ?? '').toLowerCase();
    if (!q) return sortedTests();
    return sortedTests().filter(t =>
      [t.name, t.classname, t.suiteName, t.status].some(v => v && v.toLowerCase().includes(q))
    );
  });

  // Lines of fixed chrome outside the list area:
  //   Layout header (3) + Layout footer (3)    = LAYOUT_CHROME_LINES (6)
  //   Own paddingTop (1) + paddingBottom (1)   = 2
  //   Own header row + marginBottom            = 2
  //   Inner rounded border top + bottom        = 2
  //   Inner table header row                   = 1
  //                                     Total  = 13
  const RESERVED_LINES = LAYOUT_CHROME_LINES + 2 + 2 + 2 + 1;

  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return { icon: '✓', color: uiColors.success };
      case 'failed':
        return { icon: '✗', color: uiColors.error };
      case 'error':
        return { icon: '⚠', color: uiColors.error };
      case 'skipped':
        return { icon: '○', color: uiColors.textMuted };
      default:
        return { icon: '?', color: uiColors.textSecondary };
    }
  };

  // Format execution time
  const formatTime = (seconds: number) => {
    if (seconds < 1) {
      return `${Math.round(seconds * 1000)}ms`;
    }
    return `${seconds.toFixed(2)}s`;
  };

  return (
    <box
      style={{
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        paddingTop: 1,
        paddingBottom: 1,
        paddingLeft: 2,
        paddingRight: 2,
      }}
    >
      {/* Header */}
      <box style={{ width: '100%', height: 1, marginBottom: 1 }}>
        <text fg={uiColors.borderHighlight} attributes={TextAttributes.BOLD}>
          Test Results (ESC to go back)
        </text>
      </box>

      {/* Loading State */}
      <Show when={props.loading}>
        <box style={{ width: '100%', height: 1 }}>
          <text fg={uiColors.warning}>Loading test results...</text>
        </box>
      </Show>

      {/* Error State */}
      <Show when={!props.loading && props.error}>
        <box style={{ width: '100%', height: 1 }}>
          <text fg={uiColors.error}>Error: {props.error}</text>
        </box>
      </Show>

      {/* Empty State */}
      <Show when={!props.loading && !props.error && (!props.testSuites || props.testSuites.length === 0)}>
        <box style={{ width: '100%', height: 1 }}>
          <text fg={uiColors.textMuted}>No test results available</text>
        </box>
      </Show>

      {/* Test Results Table */}
      <Show when={!props.loading && !props.error && filteredTests().length > 0}>
        <box
          border={true}
          borderStyle="rounded"
          borderColor={uiColors.textMuted}
          style={{
            width: '100%',
            flexGrow: 1,
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
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
                  <box style={{ width: '65%' }}>
                    <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
                      Test Name
                    </text>
                  </box>
                  <box style={{ width: '15%' }}>
                    <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
                      Time
                    </text>
                  </box>
                  <box style={{ width: '20%' }}>
                    <text fg={uiColors.textPrimary} attributes={TextAttributes.BOLD}>
                      Status
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
                <Show when={!props.searchMode && hasSearch()}>
                  <text fg={uiColors.textMuted}> ({filteredTests().length} results)</text>
                </Show>
              </box>
            </Show>
          </box>

          {/* Table Body — rendered via ScrollableList */}
          <ScrollableList<TestCase & { suiteName: string }>
            items={filteredTests()}
            selectedIndex={props.selectedIndex}
            reservedLines={RESERVED_LINES}
            estimatedItemHeight={1}
            showScrollIndicator={false}
            renderItem={(test, isSelected) => {
              const display = getStatusDisplay(test.status);
              const isFailed = test.status === 'failed' || test.status === 'error';
              const testName = `${test.classname}.${test.name}`;
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
                  <box style={{ width: '65%' }}>
                    <text
                      fg={isSelected() ? uiColors.textPrimary : display.color}
                      attributes={isFailed ? TextAttributes.BOLD : undefined}
                    >
                      {testName}
                    </text>
                  </box>
                  <box style={{ width: '15%' }}>
                    <text fg={isSelected() ? uiColors.textPrimary : uiColors.textMuted}>
                      {formatTime(test.execution_time)}
                    </text>
                  </box>
                  <box style={{ width: '20%' }}>
                    <text
                      fg={isSelected() ? uiColors.textPrimary : display.color}
                      attributes={isFailed ? TextAttributes.BOLD : undefined}
                    >
                      {test.status}
                    </text>
                  </box>
                </box>
              );
            }}
          />
        </box>
      </Show>
    </box>
  );
}
