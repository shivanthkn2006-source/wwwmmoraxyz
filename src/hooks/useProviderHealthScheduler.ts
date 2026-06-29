/**
 * Background provider-health scheduler.
 * Pings /provider-health every N minutes and dispatches `zoe:tier-alert`
 * window events whenever degraded/missing-key tiers are detected.
 * Stores last snapshot on window.__zoeLastHealth and in localStorage.
 */
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HealthSnapshot {
  ok: boolean;
  checkedAt: string;
  keys: Record<string, boolean>;
  tiers: Array<{ tier: number; name: string; keyPresent: boolean }>;
  attempts?: Array<{ tier: number; ok: boolean; reasonCode: string; latencyMs: number }>;
  summary?: { healthyTiers: number[]; degradedTiers: number[]; missingKeyTiers: number[]; primaryHealthy: number | null };
}

const LS_KEY = 'zoe_provider_health_last_v1';
const POLL_MS = 5 * 60_000;

export function getLastHealthSnapshot(): HealthSnapshot | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as HealthSnapshot) : null;
  } catch { return null; }
}

async function poll(ping: boolean) {
  try {
    const { data, error } = await supabase.functions.invoke('provider-health', { body: { ping, mode: 't1-primary' } });
    if (error || !data) return;
    const snap = data as HealthSnapshot;
    try { localStorage.setItem(LS_KEY, JSON.stringify(snap)); } catch {}
    (window as any).__zoeLastHealth = snap;
    const degraded = snap.summary?.degradedTiers ?? [];
    const missing = snap.summary?.missingKeyTiers ?? [];
    if (degraded.length || missing.length) {
      const reasons = (snap.attempts ?? [])
        .filter(a => !a.ok && degraded.includes(a.tier))
        .map(a => `T${a.tier}:${a.reasonCode}`).join(' · ');
      window.dispatchEvent(new CustomEvent('zoe:tier-alert', {
        detail: { degraded, missing, reasons, at: Date.now(), snapshot: snap },
      }));
    } else {
      window.dispatchEvent(new CustomEvent('zoe:tier-clear', { detail: { at: Date.now() } }));
    }
  } catch (e) {
    console.warn('[provider-health-scheduler] poll failed', e);
  }
}

export function useProviderHealthScheduler(opts: { ping?: boolean; intervalMs?: number } = {}) {
  const intervalMs = opts.intervalMs ?? POLL_MS;
  const ping = opts.ping ?? true;
  useEffect(() => {
    let cancelled = false;
    // Run an initial check shortly after mount (non-blocking)
    const initial = setTimeout(() => { if (!cancelled) poll(ping); }, 2_000);
    const t = setInterval(() => poll(ping), intervalMs);
    return () => { cancelled = true; clearTimeout(initial); clearInterval(t); };
  }, [ping, intervalMs]);
}

export default useProviderHealthScheduler;
