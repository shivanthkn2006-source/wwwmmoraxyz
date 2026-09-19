import { describe, expect, it } from 'vitest';
import { formatCallDuration, isMissedCall, mapCallHistory, type CallHistorySessionRow } from '@/features/calls/callHistory';

const row = (overrides: Partial<CallHistorySessionRow>): CallHistorySessionRow => ({
  id: 'session-1',
  caller_id: 'me',
  receiver_id: 'friend',
  started_at: '2026-09-19T10:00:00.000Z',
  ended_at: '2026-09-19T10:04:00.000Z',
  duration_seconds: 240,
  end_reason: 'completed',
  call_quality: 'good',
  ...overrides,
});

describe('call history', () => {
  it('marks direction and counterpart from the signed-in member', () => {
    const entries = mapCallHistory(
      [row({}), row({ id: 'session-2', caller_id: 'friend', receiver_id: 'me' })],
      'me',
      { friend: { displayName: 'Asha', avatarUrl: null } },
    );
    expect(entries[0].direction).toBe('outgoing');
    expect(entries[1].direction).toBe('incoming');
    expect(entries.every(entry => entry.counterpartId === 'friend' && entry.counterpartName === 'Asha')).toBe(true);
  });

  it('only counts unanswered calls as missed', () => {
    expect(isMissedCall({ duration_seconds: 0, end_reason: 'timeout' })).toBe(true);
    expect(isMissedCall({ duration_seconds: 0, end_reason: 'rejected' })).toBe(true);
    expect(isMissedCall({ duration_seconds: 120, end_reason: 'completed' })).toBe(false);
    expect(isMissedCall({ duration_seconds: 0, end_reason: 'completed' })).toBe(false);
  });

  it('formats durations for display', () => {
    expect(formatCallDuration(0)).toBe('—');
    expect(formatCallDuration(65)).toBe('1:05');
  });
});
