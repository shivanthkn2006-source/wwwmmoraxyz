/**
 * ═══════════════════════════════════════════════════════════════
 * ZOE IDENTITY VAULT
 * ═══════════════════════════════════════════════════════════════
 * Dedicated, private storage path for the account holder's identity
 * reference photo (used only to create images that look like them)
 * and for the images Zoe generates from it, so nothing disappears
 * when the chat reloads.
 *
 * Bucket: `zoe-identity` (private, per-user folder `<uid>/...`)
 * Profile columns:
 *   - zoe_identity_photo_url   signed URL (refreshed on demand)
 *   - zoe_identity_photo_path  storage path (source of truth for re-signing)
 *   - zoe_identity_dhf_locked  hardened DHF lock (immutable intent)
 * ═══════════════════════════════════════════════════════════════
 */

import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'zoe-identity';
const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 year

export type IdentitySource = 'identity-vault' | 'profile-photo';

export type IdentityReference = {
  url: string;
  source: IdentitySource;
};

export type VaultStatus = {
  hasVaultPhoto: boolean;
  source: IdentitySource | null;
  url: string | null;
  path: string | null;
  consentAt: string | null;
  dhfLocked: boolean;
  lockedAt: string | null;
  profilePhotoUrl: string | null;
  reason: string;
};

export type IdentityScanResult = {
  ok: boolean;
  personPresent: boolean;
  subjectIdentity: 'account_holder' | 'other_person' | 'no_person' | 'unknown';
  confidence: number;
  summary: string;
  reasonCode: string;
  debug: Record<string, unknown>;
};

const DEBUG_KEY = 'zoe-identity-debug';

export const isIdentityDebugEnabled = (): boolean => {
  try {
    return localStorage.getItem(DEBUG_KEY) === '1';
  } catch {
    return false;
  }
};

export const setIdentityDebugEnabled = (on: boolean) => {
  try {
    localStorage.setItem(DEBUG_KEY, on ? '1' : '0');
  } catch {
    /* storage unavailable */
  }
};

const debugLog = (...args: unknown[]) => {
  if (isIdentityDebugEnabled()) console.info('[ZoeIdentityVault]', ...args);
};

/** Append a cache-busting marker so reloaded chats never show a stale/blank image. */
export const withCacheBust = (url: string, stamp: number = Date.now()): string => {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}cb=${stamp}`;
};

const signedUrl = async (path: string): Promise<string | null> => {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) {
    console.error('[ZoeIdentityVault] Signed URL failed:', error);
    return null;
  }
  return data.signedUrl;
};

/** Recover the storage path from a previously issued signed URL. */
export const pathFromSignedUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const marker = `/object/sign/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const tail = url.slice(idx + marker.length);
  const clean = tail.split('?')[0];
  return clean ? decodeURIComponent(clean) : null;
};

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const resp = await fetch(dataUrl);
  return await resp.blob();
};

const blobToBase64 = async (blob: Blob): Promise<string> => {
  const buffer = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < buffer.length; i += 1) binary += String.fromCharCode(buffer[i]);
  return btoa(binary);
};

/** Full vault state for the preview panel (source, path, lock, consent). */
export const getVaultStatus = async (userId: string): Promise<VaultStatus> => {
  const empty: VaultStatus = {
    hasVaultPhoto: false,
    source: null,
    url: null,
    path: null,
    consentAt: null,
    dhfLocked: false,
    lockedAt: null,
    profilePhotoUrl: null,
    reason: 'NO_REFERENCE',
  };

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'zoe_identity_photo_url, zoe_identity_photo_path, zoe_identity_consent_at, zoe_identity_dhf_locked, zoe_identity_locked_at, profile_photo_url',
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[ZoeIdentityVault] Status lookup failed:', error);
    return { ...empty, reason: `PROFILE_LOOKUP_FAILED: ${error.message}` };
  }

  const row = (data || {}) as Record<string, any>;
  const vaultUrl: string | null = row.zoe_identity_photo_url ?? null;
  const profileUrl: string | null = row.profile_photo_url ?? null;
  const path: string | null = row.zoe_identity_photo_path ?? pathFromSignedUrl(vaultUrl);

  const status: VaultStatus = {
    hasVaultPhoto: Boolean(vaultUrl),
    source: vaultUrl ? 'identity-vault' : profileUrl ? 'profile-photo' : null,
    url: vaultUrl || profileUrl,
    path,
    consentAt: row.zoe_identity_consent_at ?? null,
    dhfLocked: Boolean(row.zoe_identity_dhf_locked),
    lockedAt: row.zoe_identity_locked_at ?? null,
    profilePhotoUrl: profileUrl,
    reason: vaultUrl ? 'VAULT_PHOTO' : profileUrl ? 'PROFILE_PHOTO_FALLBACK' : 'NO_REFERENCE',
  };

  debugLog('status', status);
  return status;
};

/**
 * Re-sign the vault photo so an expired or broken signed URL is repaired
 * without asking the user to upload anything again.
 */
export const refreshIdentitySignedUrl = async (userId: string): Promise<string | null> => {
  const status = await getVaultStatus(userId);
  if (!status.path) {
    debugLog('refresh skipped, no vault path', status.reason);
    return status.url ? withCacheBust(status.url) : null;
  }

  const fresh = await signedUrl(status.path);
  if (!fresh) return null;

  const { error } = await supabase
    .from('profiles')
    .update({ zoe_identity_photo_url: fresh } as any)
    .eq('user_id', userId);
  if (error) console.error('[ZoeIdentityVault] Refresh persist failed:', error);

  debugLog('refreshed signed url for', status.path);
  return withCacheBust(fresh);
};

/**
 * Resolve the reference photo Zoe should use for "create my image" requests.
 * Prefers the dedicated identity vault photo, then falls back to the profile photo.
 * Automatically re-signs the vault URL when it can no longer be fetched.
 */
export const getIdentityReference = async (userId: string): Promise<IdentityReference | null> => {
  const status = await getVaultStatus(userId);
  if (!status.url) return null;

  if (status.source === 'identity-vault') {
    const alive = await isUrlReachable(status.url);
    if (!alive) {
      const refreshed = await refreshIdentitySignedUrl(userId);
      if (refreshed) return { url: refreshed, source: 'identity-vault' };
    }
    return { url: withCacheBust(status.url), source: 'identity-vault' };
  }

  return { url: status.url, source: 'profile-photo' };
};

const isUrlReachable = async (url: string): Promise<boolean> => {
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
};

/**
 * Store the approved reference photo in the private identity vault.
 * This never touches the public avatar or any biometric login credential.
 */
export const saveIdentityReference = async (
  userId: string,
  file: File | Blob,
): Promise<string | null> => {
  const extension = (file as File).name?.split('.').pop()?.toLowerCase();
  const safeExt = extension && /^(jpg|jpeg|png|webp)$/.test(extension) ? extension : 'jpg';
  const path = `${userId}/reference.${safeExt}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: '0',
    contentType: (file as File).type || 'image/jpeg',
  });
  if (error) {
    console.error('[ZoeIdentityVault] Reference upload failed:', error);
    return null;
  }

  const url = await signedUrl(path);
  if (!url) return null;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      zoe_identity_photo_url: url,
      zoe_identity_photo_path: path,
      zoe_identity_consent_at: new Date().toISOString(),
    } as any)
    .eq('user_id', userId);

  if (profileError) {
    console.error('[ZoeIdentityVault] Profile update failed:', profileError);
    return null;
  }

  debugLog('saved reference', path);
  return withCacheBust(url);
};

/**
 * Harden the saved reference into the DHF black box: once locked, the photo is
 * treated as verified personal identity data and is only ever used for
 * identity verification and likeness generation.
 */
export const lockIdentityToDHF = async (userId: string, locked: boolean): Promise<boolean> => {
  const { error } = await supabase
    .from('profiles')
    .update({
      zoe_identity_dhf_locked: locked,
      zoe_identity_locked_at: locked ? new Date().toISOString() : null,
    } as any)
    .eq('user_id', userId);

  if (error) {
    console.error('[ZoeIdentityVault] DHF lock failed:', error);
    return false;
  }
  debugLog('dhf lock', locked);
  return true;
};

/**
 * Re-run identification against the photo already saved in the vault.
 * Returns a reason code explaining precisely why identification succeeded
 * or failed, so the user is never left with a silent mismatch.
 */
export const rescanIdentityPhoto = async (userId: string): Promise<IdentityScanResult> => {
  const fail = (reasonCode: string, debug: Record<string, unknown> = {}): IdentityScanResult => ({
    ok: false,
    personPresent: false,
    subjectIdentity: 'unknown',
    confidence: 0,
    summary: '',
    reasonCode,
    debug,
  });

  const status = await getVaultStatus(userId);
  if (!status.url) return fail('NO_REFERENCE', { status });

  let url = status.url;
  if (status.source === 'identity-vault' && !(await isUrlReachable(url))) {
    const refreshed = await refreshIdentitySignedUrl(userId);
    if (!refreshed) return fail('SIGNED_URL_EXPIRED', { path: status.path });
    url = refreshed;
  }

  let base64: string;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return fail(`FETCH_FAILED_${res.status}`, { url: status.path || 'profile-photo' });
    base64 = await blobToBase64(await res.blob());
  } catch (err) {
    return fail('FETCH_ERROR', { error: String(err) });
  }

  const { data, error } = await supabase.functions.invoke('zoe-perception', {
    body: {
      media_type: 'image',
      media_data: base64,
      file_name: 'identity-rescan.jpg',
      context: 'Identity vault re-scan requested by the account holder.',
      cross_reference: false,
      debug: true,
      scan_purpose: 'identity_rescan',
    },
  });

  if (error || !data?.success) {
    return fail('PERCEPTION_ERROR', { error: error?.message || data?.error, debug: data?.debug });
  }

  const analysis = data.analysis || {};
  const personPresent = Boolean(analysis.person_present);
  const subjectIdentity = (analysis.subject_identity || 'unknown') as IdentityScanResult['subjectIdentity'];
  const confidence = Number(analysis.identity_match_confidence ?? 0);

  let reasonCode = 'IDENTIFIED';
  if (!personPresent) reasonCode = 'NO_FACE_DETECTED';
  else if (subjectIdentity === 'other_person') reasonCode = 'FACE_MISMATCH';
  else if (subjectIdentity === 'unknown') reasonCode = 'LOW_CONFIDENCE';
  else if (confidence < 0.6) reasonCode = 'LOW_CONFIDENCE';

  const result: IdentityScanResult = {
    ok: reasonCode === 'IDENTIFIED',
    personPresent,
    subjectIdentity,
    confidence,
    summary: data.zoe_response || analysis.summary || '',
    reasonCode,
    debug: {
      source: status.source,
      path: status.path,
      dhfLocked: status.dhfLocked,
      identityNotes: analysis.identity_notes,
      hasLockedReference: data.has_locked_reference,
      server: data.debug ?? null,
    },
  };

  debugLog('rescan', result);
  return result;
};

/**
 * Remove the locked identity reference (vault object + profile pointer).
 */
export const clearIdentityReference = async (userId: string): Promise<boolean> => {
  const { data: listed } = await supabase.storage.from(BUCKET).list(userId);
  const paths = (listed || [])
    .filter((f) => f.name.startsWith('reference.'))
    .map((f) => `${userId}/${f.name}`);
  if (paths.length) {
    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) console.error('[ZoeIdentityVault] Reference delete failed:', error);
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      zoe_identity_photo_url: null,
      zoe_identity_photo_path: null,
      zoe_identity_consent_at: null,
      zoe_identity_dhf_locked: false,
      zoe_identity_locked_at: null,
    } as any)
    .eq('user_id', userId);

  if (profileError) {
    console.error('[ZoeIdentityVault] Profile clear failed:', profileError);
    return false;
  }
  return true;
};

/**
 * Persist a generated identity image so the chat bubble survives a reload.
 * Data URLs are too large for the message table, so they are uploaded first.
 */
export const persistGeneratedIdentityImage = async (
  userId: string,
  imageUrl: string,
): Promise<string> => {
  try {
    if (!imageUrl.startsWith('data:')) return imageUrl;

    const blob = await dataUrlToBlob(imageUrl);
    const path = `${userId}/generated/${Date.now()}.png`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      upsert: true,
      contentType: blob.type || 'image/png',
    });
    if (error) throw error;

    const url = await signedUrl(path);
    return url ? withCacheBust(url) : imageUrl;
  } catch (err) {
    console.error('[ZoeIdentityVault] Generated image persistence failed:', err);
    return imageUrl;
  }
};

/**
 * Repair any stored zoe-identity signed URL that has expired (used when a chat
 * is reloaded and older bubbles point at dead signed URLs).
 */
export const refreshStoredImageUrl = async (url: string): Promise<string> => {
  const path = pathFromSignedUrl(url);
  if (!path) return url;
  if (await isUrlReachable(url)) return withCacheBust(url);
  const fresh = await signedUrl(path);
  return fresh ? withCacheBust(fresh) : url;
};

export default {
  getIdentityReference,
  getVaultStatus,
  saveIdentityReference,
  clearIdentityReference,
  persistGeneratedIdentityImage,
  refreshIdentitySignedUrl,
  refreshStoredImageUrl,
  rescanIdentityPhoto,
  lockIdentityToDHF,
  withCacheBust,
  pathFromSignedUrl,
  isIdentityDebugEnabled,
  setIdentityDebugEnabled,
};
