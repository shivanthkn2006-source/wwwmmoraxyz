import { describe, expect, it } from 'vitest';
import {
  activeGroupParticipants,
  groupGridColumns,
  isGroupRoomId,
  MAX_GROUP_PARTICIPANTS,
  normalizeGroupRoster,
  shouldCreateOffer,
  zoeSpeakerId,
  type GroupParticipant,
} from '@/features/calls/groupCallMesh';

const participant = (overrides: Partial<GroupParticipant>): GroupParticipant => ({
  userId: 'a',
  displayName: 'A',
  avatarUrl: null,
  connectionState: 'connected',
  hasAudio: true,
  hasVideo: false,
  ...overrides,
});

describe('group call mesh', () => {
  it('lets exactly one side of each pair make the offer', () => {
    expect(shouldCreateOffer('aaa', 'bbb')).toBe(true);
    expect(shouldCreateOffer('bbb', 'aaa')).toBe(false);
  });

  it('elects one deterministic Zoe speaker for the room', () => {
    expect(zoeSpeakerId('member-c', ['member-b', 'member-a'])).toBe('member-a');
    expect(zoeSpeakerId('member-a', ['member-c', 'member-b'])).toBe('member-a');
  });

  it('cleans the roster and keeps it bounded', () => {
    const roster = normalizeGroupRoster('me', ['me', 'a', 'a', ' b ', 'c', 'd', 'e', 'f', 'g']);
    expect(roster).not.toContain('me');
    expect(roster).toEqual(['a', 'b', 'c', 'd', 'e'].slice(0, MAX_GROUP_PARTICIPANTS - 1));
  });

  it('accepts only room identifiers that look real', () => {
    expect(isGroupRoomId('9f1e2d3c-4b5a-6789-0abc-def123456789')).toBe(true);
    expect(isGroupRoomId('short')).toBe(false);
    expect(isGroupRoomId(42)).toBe(false);
  });

  it('lays tiles out evenly and drops dead peers', () => {
    expect(groupGridColumns(1)).toBe(1);
    expect(groupGridColumns(3)).toBe(2);
    expect(groupGridColumns(5)).toBe(3);
    const live = activeGroupParticipants([participant({}), participant({ userId: 'b', connectionState: 'failed' })]);
    expect(live.map(entry => entry.userId)).toEqual(['a']);
  });
});
