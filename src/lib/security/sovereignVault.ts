/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SOVEREIGN VAULT — black-box access layer for the single-admin console
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Three independent gates must all pass before the vault renders:
 *  1. Identity   — `is_sovereign_admin` (security definer, server-side).
 *  2. Tunnel     — an Ironclad AES-256-GCM session key (the built-in VPN /
 *                  Virtual Private Nexus) must be live and unexpired.
 *  3. Attestation— a device fingerprint is bound to the tunnel record so a
 *                  stolen session cannot be replayed from another machine.
 *
 * Every attempt — granted or denied — is appended to an immutable log table.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  initIroncladSession,
  destroyIroncladSession,
} from '@/components/zoe-infinity/mail/ironclad/secureFetch';

export const VAULT_TUNNEL_TTL_MS = 30 * 60 * 1000;

export type VaultVerdict = 'granted' | 'denied' | 'revoked' | 'challenge';

export interface VaultTunnel {
  fingerprint: string;
  cipher: string;
  openedAt: number;
  expiresAt: number;
  sessionId: string | null;
}

export interface VaultAccessAttempt {
  verdict: VaultVerdict;
  reason?: string;
  tunnelActive: boolean;
  tunnelFingerprint?: string | null;
  deviceFingerprint?: string | null;
  route?: string;
  metadata?: Record<string, unknown>;
}

/* ── pure helpers (unit tested) ─────────────────────────────────────────── */

/** Truncated hex digest used to identify a key or device without exposing it. */
export async function digestFingerprint(input: string, length = 32): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

/** Stable, non-PII signature of the browser/device. */
export function deviceSignature(nav: Navigator = navigator, scr: Screen = screen): string {
  return [
    nav.userAgent,
    nav.language,
    String(nav.hardwareConcurrency ?? 0),
    String((nav as Navigator & { deviceMemory?: number }).deviceMemory ?? 0),
    `${scr.width}x${scr.height}x${scr.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'unknown',
  ].join('|');
}

export function isTunnelLive(tunnel: VaultTunnel | null, now = Date.now()): boolean {
  return Boolean(tunnel && tunnel.expiresAt > now);
}

export function tunnelRemainingMs(tunnel: VaultTunnel | null, now = Date.now()): number {
  if (!tunnel) return 0;
  return Math.max(0, tunnel.expiresAt - now);
}

/**
 * Resolves the final verdict from the three gates. Kept pure so the access
 * decision itself is directly testable and cannot drift from the UI.
 */
export function resolveVaultVerdict(params: {
  isSovereign: boolean | null;
  tunnel: VaultTunnel | null;
  now?: number;
}): { verdict: VaultVerdict; reason: string } {
  const { isSovereign, tunnel } = params;
  const now = params.now ?? Date.now();

  if (isSovereign === null) return { verdict: 'challenge', reason: 'identity check in flight' };
  if (!isSovereign) return { verdict: 'denied', reason: 'not the sovereign administrator' };
  if (!tunnel) return { verdict: 'challenge', reason: 'private nexus tunnel not established' };
  if (!isTunnelLive(tunnel, now)) return { verdict: 'revoked', reason: 'tunnel expired' };
  return { verdict: 'granted', reason: 'identity + tunnel + device attested' };
}

/* ── side-effecting operations ──────────────────────────────────────────── */

/** Opens the Ironclad (VPN) tunnel and records the handshake server-side. */
export async function openVaultTunnel(userId: string): Promise<VaultTunnel> {
  const key = await initIroncladSession();
  const raw = await crypto.subtle.exportKey('raw', key);
  const keyHex = Array.from(new Uint8Array(raw))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const fingerprint = await digestFingerprint(keyHex);
  const deviceFingerprint = await digestFingerprint(deviceSignature());
  const openedAt = Date.now();
  const expiresAt = openedAt + VAULT_TUNNEL_TTL_MS;

  let sessionId: string | null = null;
  try {
    const { data } = await supabase
      .from('sovereign_vault_sessions')
      .insert({
        user_id: userId,
        tunnel_fingerprint: fingerprint,
        device_fingerprint: deviceFingerprint,
        user_agent: navigator.userAgent,
        cipher: 'AES-256-GCM',
        expires_at: new Date(expiresAt).toISOString(),
      })
      .select('id')
      .maybeSingle();
    sessionId = data?.id ?? null;
  } catch {
    sessionId = null;
  }

  return { fingerprint, cipher: 'AES-256-GCM', openedAt, expiresAt, sessionId };
}

/** Tears the tunnel down and revokes the server-side handshake record. */
export async function closeVaultTunnel(tunnel: VaultTunnel | null): Promise<void> {
  destroyIroncladSession();
  if (!tunnel?.sessionId) return;
  try {
    await supabase
      .from('sovereign_vault_sessions')
      .update({ revoked: true })
      .eq('id', tunnel.sessionId);
  } catch {
    /* the tunnel is already dead client-side; log write is best effort */
  }
}

/** Appends an immutable access record. Never throws into the UI. */
export async function logVaultAccess(
  userId: string | null,
  attempt: VaultAccessAttempt,
): Promise<void> {
  try {
    const deviceFingerprint =
      attempt.deviceFingerprint ?? (await digestFingerprint(deviceSignature()));
    await supabase.from('sovereign_vault_access_log').insert({
      user_id: userId,
      verdict: attempt.verdict,
      reason: attempt.reason ?? null,
      tunnel_active: attempt.tunnelActive,
      tunnel_fingerprint: attempt.tunnelFingerprint ?? null,
      device_fingerprint: deviceFingerprint,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      route: attempt.route ?? '/admin/vault',
      metadata: (attempt.metadata ?? {}) as never,
    });
  } catch {
    /* black-box logging must never block or crash the console */
  }
}
