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
 * Profile column: `zoe_identity_photo_url`
 * ═══════════════════════════════════════════════════════════════
 */

import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'zoe-identity';
const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 year

export type IdentityReference = {
  url: string;
  source: 'identity-vault' | 'profile-photo';
};

const signedUrl = async (path: string): Promise<string | null> => {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) {
    console.error('[ZoeIdentityVault] Signed URL failed:', error);
    return null;
  }
  return data.signedUrl;
};

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const resp = await fetch(dataUrl);
  return await resp.blob();
};

/**
 * Resolve the reference photo Zoe should use for "create my image" requests.
 * Prefers the dedicated identity vault photo, then falls back to the profile photo.
 */
export const getIdentityReference = async (userId: string): Promise<IdentityReference | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('zoe_identity_photo_url, profile_photo_url')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[ZoeIdentityVault] Reference lookup failed:', error);
    return null;
  }

  const vaultUrl = (data as any)?.zoe_identity_photo_url as string | null | undefined;
  if (vaultUrl) return { url: vaultUrl, source: 'identity-vault' };

  const profileUrl = (data as any)?.profile_photo_url as string | null | undefined;
  if (profileUrl) return { url: profileUrl, source: 'profile-photo' };

  return null;
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
      zoe_identity_consent_at: new Date().toISOString(),
    } as any)
    .eq('user_id', userId);

  if (profileError) {
    console.error('[ZoeIdentityVault] Profile update failed:', profileError);
    return null;
  }

  return url;
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
    return url || imageUrl;
  } catch (err) {
    console.error('[ZoeIdentityVault] Generated image persistence failed:', err);
    return imageUrl;
  }
};

export default { getIdentityReference, saveIdentityReference, persistGeneratedIdentityImage };
