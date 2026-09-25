/**
 * REFERRAL / INVITE CAPTURE
 *
 * A shared invite or referral link looks like `/signup?ref=MMORA-XXXX`.
 * We remember the code for the length of the browser session and redeem it
 * server-side (edge function `beta-invite`) once the member has a session.
 * Nothing here trusts the client: the server owns validity and use counts.
 */
import { supabase } from '@/integrations/supabase/client';

const KEY = 'mmora.referral.code';

const clean = (value: string | null | undefined): string =>
  String(value ?? '').trim().toUpperCase().replace(/\s+/g, '').slice(0, 64);

/** Reads ?ref= / ?invite= from the URL and stores it for later redemption. */
export function captureReferralFromUrl(search: string): string | null {
  try {
    const params = new URLSearchParams(search);
    const code = clean(params.get('ref') || params.get('invite'));
    if (!code) return getStoredReferral();
    sessionStorage.setItem(KEY, code);
    return code;
  } catch {
    return null;
  }
}

export function getStoredReferral(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearStoredReferral(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Binds a stored referral code to the signed-in account. Safe to call twice. */
export async function redeemStoredReferral(): Promise<{ redeemed: boolean; reason?: string }> {
  const code = getStoredReferral();
  if (!code) return { redeemed: false, reason: 'none' };
  try {
    // Only call once a live session exists; the code stays stored for the next attempt.
    const { liveAccessToken } = await import('@/lib/edgeSession');
    const token = await liveAccessToken();
    if (!token) return { redeemed: false, reason: 'no-session' };
    const { data, error } = await supabase.functions.invoke('beta-invite', {
      body: { action: 'redeem', code },
      headers: { Authorization: `Bearer ${token}` },
    });
    if (error) return { redeemed: false, reason: 'error' };
    const ok = Boolean((data as { ok?: boolean } | null)?.ok);
    if (ok) clearStoredReferral();
    return { redeemed: ok, reason: ok ? undefined : String((data as { error?: string } | null)?.error ?? 'refused') };
  } catch {
    return { redeemed: false, reason: 'error' };
  }
}

/** Builds the shareable signup link for a code. */
export const referralLink = (code: string, origin?: string): string =>
  `${origin ?? (typeof window !== 'undefined' ? window.location.origin : '')}/signup?ref=${encodeURIComponent(code)}`;

export interface ShareTarget {
  label: string;
  href: string;
}

/** Social share destinations for a link + message. No trackers, no SDKs. */
export function shareTargets(url: string, message: string): ShareTarget[] {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(message);
  return [
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { label: 'WhatsApp', href: `https://wa.me/?text=${t}%20${u}` },
    { label: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { label: 'Email', href: `mailto:?subject=${t}&body=${u}` },
  ];
}
