/**
 * Group call helpers. The mesh keeps one peer connection per other participant on
 * top of the same peer-to-peer engine and the same private signalling table used
 * by one-to-one calls, so no media ever passes through a server.
 *
 * Pure logic lives here so the mesh rules are testable without a browser.
 */

export const MAX_GROUP_PARTICIPANTS = 6;

export type GroupCallSignalType =
  | 'group-invite'
  | 'group-join'
  | 'group-offer'
  | 'group-answer'
  | 'group-ice'
  | 'group-zoe-request'
  | 'group-zoe-caption'
  | 'group-leave';

export interface GroupParticipant {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  connectionState: RTCPeerConnectionState | 'inviting';
  hasAudio: boolean;
  hasVideo: boolean;
}

/**
 * Only one side of each pair creates the offer, otherwise both would offer at the
 * same time and the connection would never settle.
 */
export const shouldCreateOffer = (selfId: string, peerId: string): boolean => selfId < peerId;

/** One deterministic device speaks for Zoe, preventing duplicate audio and TTS charges. */
export const zoeSpeakerId = (selfId: string, peerIds: string[]): string =>
  [selfId, ...peerIds].sort((left, right) => left.localeCompare(right))[0] ?? selfId;

/** Keeps the roster unique, bounded and free of the member themselves. */
export const normalizeGroupRoster = (selfId: string, ids: string[]): string[] => {
  const unique: string[] = [];
  for (const id of ids) {
    const trimmed = id.trim();
    if (!trimmed || trimmed === selfId || unique.includes(trimmed)) continue;
    unique.push(trimmed);
    if (unique.length >= MAX_GROUP_PARTICIPANTS - 1) break;
  }
  return unique;
};

export const isGroupRoomId = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f-]{16,64}$/i.test(value);

/** Tile columns for a calm, even grid at any participant count. */
export const groupGridColumns = (participantCount: number): number => {
  if (participantCount <= 1) return 1;
  if (participantCount <= 4) return 2;
  return 3;
};

export const activeGroupParticipants = (participants: GroupParticipant[]): GroupParticipant[] =>
  participants.filter(participant => participant.connectionState !== 'closed' && participant.connectionState !== 'failed');
