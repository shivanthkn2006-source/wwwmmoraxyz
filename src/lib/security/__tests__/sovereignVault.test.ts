import { describe, expect, it } from 'vitest';
import {
  VAULT_TUNNEL_TTL_MS,
  isTunnelLive,
  resolveVaultVerdict,
  tunnelRemainingMs,
  type VaultTunnel,
} from '../sovereignVault';

const tunnelAt = (expiresAt: number): VaultTunnel => ({
  fingerprint: 'abc123',
  cipher: 'AES-256-GCM',
  openedAt: expiresAt - VAULT_TUNNEL_TTL_MS,
  expiresAt,
  sessionId: 'session-1',
});

describe('sovereign vault gates', () => {
  const now = 1_000_000;

  it('challenges while identity resolves', () => {
    expect(resolveVaultVerdict({ isSovereign: null, tunnel: null, now }).verdict).toBe('challenge');
  });

  it('denies non-sovereign users even with a live tunnel', () => {
    const result = resolveVaultVerdict({
      isSovereign: false,
      tunnel: tunnelAt(now + 60_000),
      now,
    });
    expect(result.verdict).toBe('denied');
  });

  it('challenges the sovereign until the tunnel is open', () => {
    expect(resolveVaultVerdict({ isSovereign: true, tunnel: null, now }).verdict).toBe('challenge');
  });

  it('revokes access when the tunnel expired', () => {
    const result = resolveVaultVerdict({ isSovereign: true, tunnel: tunnelAt(now - 1), now });
    expect(result.verdict).toBe('revoked');
  });

  it('grants only with sovereign identity and a live tunnel', () => {
    const result = resolveVaultVerdict({
      isSovereign: true,
      tunnel: tunnelAt(now + VAULT_TUNNEL_TTL_MS),
      now,
    });
    expect(result.verdict).toBe('granted');
  });

  it('tracks tunnel liveness and remaining time', () => {
    expect(isTunnelLive(tunnelAt(now + 5), now)).toBe(true);
    expect(isTunnelLive(tunnelAt(now), now)).toBe(false);
    expect(isTunnelLive(null, now)).toBe(false);
    expect(tunnelRemainingMs(tunnelAt(now + 5_000), now)).toBe(5_000);
    expect(tunnelRemainingMs(tunnelAt(now - 5_000), now)).toBe(0);
    expect(tunnelRemainingMs(null, now)).toBe(0);
  });
});
