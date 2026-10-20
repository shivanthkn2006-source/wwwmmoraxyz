/** Client calls for the 5-digit Quick Unlock (server holds all codes and counts). */
import { invokeWithFreshSession } from '@/lib/edgeSession';

export const IDLE_LOCK_MS = 5 * 60_000;

export interface QuickUnlockResult {
  ok?: boolean; enabled?: boolean; erased?: boolean; error?: string; lockedForSeconds?: number;
}

async function call(body: Record<string, unknown>): Promise<QuickUnlockResult> {
  const { data, error } = await invokeWithFreshSession<QuickUnlockResult>('quick-unlock', body);
  if (data) return data;
  if (error) {
    try { const b = await error?.context?.json?.(); if (b) return b as QuickUnlockResult; } catch { /* keep */ }
    return { ok: false, error: 'Could not reach the server. Try again.' };
  }
  return { ok: false, error: 'Please sign in again.' };
}

export const quickUnlockStatus = () => call({ action: 'status' });
export const setQuickUnlock = (code: string) => call({ action: 'set', code });
export const changeQuickUnlock = (current: string, code: string) => call({ action: 'change', current, code });
export const removeQuickUnlock = () => call({ action: 'remove' });
export const verifyQuickUnlock = (code: string) => call({ action: 'verify', code });

/** Device-local hint only (never trusted for security): skip status calls when off. */
const HINT = 'mmora.quick-unlock.enabled';
export const rememberEnabled = (on: boolean) => { try { localStorage.setItem(HINT, on ? '1' : '0'); } catch { /* ignore */ } };
