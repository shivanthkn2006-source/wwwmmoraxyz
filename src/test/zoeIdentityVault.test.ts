/**
 * Identity vault regression coverage.
 * Verifies the signed-URL plumbing that keeps identity + generated images
 * alive after a chat reload, plus the re-scan reason-code contract.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = {
  profile: {} as Record<string, any>,
  invokeResult: { data: null as any, error: null as any },
  signed: 'https://cdn.test/storage/v1/object/sign/zoe-identity/u1/reference.jpg?token=NEW',
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: state.profile, error: null }) }),
      }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
    storage: {
      from: () => ({
        createSignedUrl: async () => ({ data: { signedUrl: state.signed }, error: null }),
      }),
    },
    functions: { invoke: async () => state.invokeResult },
  },
}));

import {
  withCacheBust,
  pathFromSignedUrl,
  getVaultStatus,
  refreshIdentitySignedUrl,
  rescanIdentityPhoto,
} from '@/services/zoeIdentityVault';

beforeEach(() => {
  state.profile = {};
  state.invokeResult = { data: null, error: null };
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob(['x']) })) as any);
});

describe('zoeIdentityVault url helpers', () => {
  it('adds a cache-buster without breaking existing query params', () => {
    expect(withCacheBust('https://a.test/x.png?token=1', 42)).toBe('https://a.test/x.png?token=1&cb=42');
    expect(withCacheBust('https://a.test/x.png', 42)).toBe('https://a.test/x.png?cb=42');
  });

  it('leaves inline data urls untouched', () => {
    expect(withCacheBust('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA');
  });

  it('recovers the storage path from a signed url', () => {
    expect(
      pathFromSignedUrl('https://cdn.test/storage/v1/object/sign/zoe-identity/u1/reference.jpg?token=abc'),
    ).toBe('u1/reference.jpg');
    expect(pathFromSignedUrl('https://cdn.test/public/avatar.png')).toBeNull();
  });
});

describe('vault status', () => {
  it('reports the vault photo as the active source', async () => {
    state.profile = {
      zoe_identity_photo_url: 'https://cdn.test/storage/v1/object/sign/zoe-identity/u1/reference.jpg?token=a',
      zoe_identity_photo_path: 'u1/reference.jpg',
      zoe_identity_dhf_locked: true,
      profile_photo_url: 'https://cdn.test/avatar.png',
    };
    const status = await getVaultStatus('u1');
    expect(status.source).toBe('identity-vault');
    expect(status.dhfLocked).toBe(true);
    expect(status.reason).toBe('VAULT_PHOTO');
  });

  it('falls back to the profile photo and says so', async () => {
    state.profile = { profile_photo_url: 'https://cdn.test/avatar.png' };
    const status = await getVaultStatus('u1');
    expect(status.source).toBe('profile-photo');
    expect(status.reason).toBe('PROFILE_PHOTO_FALLBACK');
  });
});

describe('signed url refresh', () => {
  it('re-signs the stored path and returns a cache-busted url', async () => {
    state.profile = {
      zoe_identity_photo_url: 'https://cdn.test/storage/v1/object/sign/zoe-identity/u1/reference.jpg?token=OLD',
      zoe_identity_photo_path: 'u1/reference.jpg',
    };
    const url = await refreshIdentitySignedUrl('u1');
    expect(url).toContain('token=NEW');
    expect(url).toContain('cb=');
  });
});

describe('identity re-scan', () => {
  it('returns NO_REFERENCE when nothing is saved', async () => {
    const result = await rescanIdentityPhoto('u1');
    expect(result.ok).toBe(false);
    expect(result.reasonCode).toBe('NO_REFERENCE');
  });

  it('confirms the account holder on a high-confidence match', async () => {
    state.profile = {
      zoe_identity_photo_url: 'https://cdn.test/storage/v1/object/sign/zoe-identity/u1/reference.jpg?token=a',
      zoe_identity_photo_path: 'u1/reference.jpg',
    };
    state.invokeResult = {
      data: {
        success: true,
        analysis: { person_present: true, subject_identity: 'account_holder', identity_match_confidence: 0.92 },
        zoe_response: 'That is you.',
      },
      error: null,
    };
    const result = await rescanIdentityPhoto('u1');
    expect(result.ok).toBe(true);
    expect(result.reasonCode).toBe('IDENTIFIED');
  });

  it('explains a mismatch instead of silently failing', async () => {
    state.profile = {
      zoe_identity_photo_url: 'https://cdn.test/storage/v1/object/sign/zoe-identity/u1/reference.jpg?token=a',
      zoe_identity_photo_path: 'u1/reference.jpg',
    };
    state.invokeResult = {
      data: {
        success: true,
        analysis: { person_present: true, subject_identity: 'other_person', identity_match_confidence: 0.2 },
      },
      error: null,
    };
    const result = await rescanIdentityPhoto('u1');
    expect(result.reasonCode).toBe('FACE_MISMATCH');
  });

  it('reports a perception outage clearly', async () => {
    state.profile = {
      zoe_identity_photo_url: 'https://cdn.test/storage/v1/object/sign/zoe-identity/u1/reference.jpg?token=a',
      zoe_identity_photo_path: 'u1/reference.jpg',
    };
    state.invokeResult = { data: null, error: { message: 'boom' } };
    const result = await rescanIdentityPhoto('u1');
    expect(result.reasonCode).toBe('PERCEPTION_ERROR');
  });
});
