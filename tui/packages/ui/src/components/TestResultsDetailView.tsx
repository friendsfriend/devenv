/** @jsxImportSource @opentui/solid */
import { TextAttributes } from '@opentui/core';
import { Show, createMemo } from 'solid-js';
import { uiColors } from '../colors';
import type { TestCase, TestSuite } from '@devenv/types';
import { ScrollableList, LAYOUT_CHROME_LINES } from './ScrollableList';
import { CenteredState } from './CenteredState';
import { SearchHeader } from './SearchHeader';
import { ContentPanel } from './ContentStack';

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
  //   Layout header (2) + Layout footer (3)    = LAYOUT_CHROME_LINES (5)
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
    <ContentPanel>
      {/* Header */}
      <box style={{ width: '100%', height: 1, marginBottom: 1 }}>
        <text fg={uiColors.borderHighlight} attributes={TextAttributes.BOLD}>
          Test Results (ESC to go back)
        </text>
      </box>

      <Show when={props.loading}>
        <CenteredState message="Loading test results..." color={uiColors.warning} height={1} />
      </Show>

      <Show when={!props.loading && props.error}>
        <CenteredState message={`Error: ${props.error}`} color={uiColors.error} height={1} />
      </Show>

      <Show when={!props.loading && !props.error && (!props.testSuites || props.testSuites.length === 0)}>
        <CenteredState message="No test results available" height={1} />
      </Show>

      {/* Test Results Table */}
      <Show when={!props.loading && !props.error && filteredTests().length > 0}>
        <box
          backgroundColor={uiColors.bgMantle}
          style={{
            width: '100%',
            flexGrow: 1,
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Table Header */}
          <SearchHeader searchMode={props.searchMode} searchQuery={props.searchQuery} resultCount={filteredTests().length}>
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
          </SearchHeader>

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
    </ContentPanel>
  );
}
