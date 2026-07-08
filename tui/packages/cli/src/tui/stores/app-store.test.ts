import { describe, expect, test } from 'bun:test';
import { SHUTDOWN_PHASE_ORDER, getShutdownPhaseStatus, type ShutdownState } from './app-store';

const state = (phase: ShutdownState['phase'], failedPhase?: ShutdownState['failedPhase']): ShutdownState => ({
  phase,
  message: phase,
  error: phase === 'failed' ? 'boom' : null,
  failedPhase,
});

describe('shutdown phase status', () => {
  test('starts with first shutdown step current', () => {
    expect(getShutdownPhaseStatus(state('preparing'), 'preparing')).toBe('current');
    expect(getShutdownPhaseStatus(state('preparing'), 'canceling-background-work')).toBe('pending');
  });

  test('marks previous phases done and next phase current', () => {
    expect(getShutdownPhaseStatus(state('stopping-input'), 'preparing')).toBe('done');
    expect(getShutdownPhaseStatus(state('stopping-input'), 'canceling-background-work')).toBe('done');
    expect(getShutdownPhaseStatus(state('stopping-input'), 'stopping-input')).toBe('current');
    expect(getShutdownPhaseStatus(state('stopping-input'), 'destroying-renderer')).toBe('pending');
  });

  test('marks failed phase only as failed', () => {
    expect(getShutdownPhaseStatus(state('failed', 'canceling-background-work'), 'preparing')).toBe('done');
    expect(getShutdownPhaseStatus(state('failed', 'canceling-background-work'), 'canceling-background-work')).toBe('failed');
    expect(getShutdownPhaseStatus(state('failed', 'canceling-background-work'), 'stopping-input')).toBe('pending');
  });

  test('keeps stable deterministic shutdown order', () => {
    expect(SHUTDOWN_PHASE_ORDER).toEqual([
      'preparing',
      'canceling-background-work',
      'stopping-input',
      'stopping-server',
      'destroying-renderer',
      'complete',
    ]);
  });
});
