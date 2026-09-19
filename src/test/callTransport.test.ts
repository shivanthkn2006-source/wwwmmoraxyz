import { describe, expect, it } from 'vitest';
import {
  candidateRoute,
  FALLBACK_ICE_SERVERS,
  MAX_ICE_RESTART_ATTEMPTS,
  normalizeIceServers,
} from '@/features/calls/callTransport';

describe('call transport safety', () => {
  it('falls back to public STUN when relay configuration is absent or malformed', () => {
    expect(normalizeIceServers(undefined)).toBe(FALLBACK_ICE_SERVERS);
    expect(normalizeIceServers([{ nope: true }])).toBe(FALLBACK_ICE_SERVERS);
  });

  it('accepts valid TURN servers and identifies the selected route', () => {
    const servers = [{ urls: 'turns:relay.example.test', username: 'exp:user', credential: 'secret' }];
    expect(normalizeIceServers(servers)).toEqual(servers);
    expect(candidateRoute('relay')).toBe('relay');
    expect(candidateRoute('srflx')).toBe('direct');
    expect(candidateRoute(null)).toBe('unknown');
    expect(MAX_ICE_RESTART_ATTEMPTS).toBe(3);
  });
});