import { describe, expect, test } from 'bun:test';
import type { ActionRun } from '@devenv/types';
import { actionStatusSegments } from './ActionStatusStrip';

const run = (id: string, status: ActionRun['status'], title: string, startedAt: string): ActionRun => ({
  id, status, title, startedAt, steps: [],
});

describe('actionStatusSegments', () => {
  test('prioritizes active, failed, then recent completed actions', () => {
    const segments = actionStatusSegments([
      run('old', 'completed', 'Old', '2026-01-01T00:00:00Z'),
      run('failed', 'failed', 'Failed', '2026-01-03T00:00:00Z'),
      run('active', 'active', 'Active', '2026-01-02T00:00:00Z'),
      run('new', 'completed', 'New', '2026-01-04T00:00:00Z'),
    ], 100);
    expect(segments.map((segment) => segment.id)).toEqual(['active', 'failed', 'new', 'old']);
  });

  test('fits width and truncates final segment', () => {
    const segments = actionStatusSegments([
      run('one', 'active', 'Build api', '2026-01-02T00:00:00Z'),
      run('two', 'completed', 'Start long worker name', '2026-01-01T00:00:00Z'),
    ], 20);
    expect(segments.map((segment) => segment.text).join('').length).toBeLessThanOrEqual(20);
    expect(segments.at(-1)?.text.endsWith('…')).toBe(true);
  });

  test('renders glyph and label only', () => {
    expect(actionStatusSegments([run('one', 'completed', 'Build api', '2026-01-02T00:00:00Z')], 30)[0]?.text).toBe('✓ Build api');
  });
});
