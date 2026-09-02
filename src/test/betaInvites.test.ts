// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { INVITE_REASON_COPY, inviteLink, inviteStatus, normaliseInviteCode, type InviteCodeRecord } from '@/lib/betaInvites';

const base: InviteCodeRecord = {
  id: 'a',
  code: 'MMORA-AAAA-BBBB-CCCC',
  is_active: true,
  expires_at: null,
  max_uses: 1,
  current_uses: 0,
  used_by: null,
  used_at: null,
  metadata: { label: 'wave one' },
  created_at: new Date().toISOString(),
  revoked_at: null,
  revoked_reason: null,
};

describe('betaInvites', () => {
  it('normalises typed codes', () => {
    expect(normaliseInviteCode('  mmora-aaaa bbbb-cccc ')).toBe('MMORA-AAAABBBB-CCCC');
    expect(normaliseInviteCode('mmora-aaaa')).toBe('MMORA-AAAA');
  });

  it('reports an issued, unused code as active', () => {
    expect(inviteStatus(base)).toBe('active');
  });

  it('reports revoked, expired and exhausted codes distinctly', () => {
    expect(inviteStatus({ ...base, is_active: false, revoked_at: new Date().toISOString() })).toBe('revoked');
    expect(inviteStatus({ ...base, expires_at: new Date(Date.now() - 1000).toISOString() })).toBe('expired');
    expect(inviteStatus({ ...base, current_uses: 1 })).toBe('used');
  });

  it('treats an unlimited-use code as active regardless of redemptions', () => {
    expect(inviteStatus({ ...base, max_uses: null, current_uses: 99 })).toBe('active');
  });

  it('builds a portal link that pre-fills the code', () => {
    expect(inviteLink('MMORA-AAAA-BBBB-CCCC', 'https://mmora.xyz')).toBe(
      'https://mmora.xyz/beta?code=MMORA-AAAA-BBBB-CCCC',
    );
  });

  it('has copy for every refusal reason', () => {
    (['ok', 'unknown', 'revoked', 'expired', 'exhausted'] as const).forEach((reason) => {
      expect(INVITE_REASON_COPY[reason]).toBeTruthy();
    });
  });
});
