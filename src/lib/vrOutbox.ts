/**
 * Offline telemetry outbox: VR World events are queued on the phone while the
 * signal is down and sent to track-visit once the phone is back online.
 */
import { supabase } from '@/integrations/supabase/client';
import { visitorId } from '@/lib/visitTracker';

const KEY = 'vr-outbox-v1';
const MAX = 200;
type Ev = { kind: string; data?: Record<string, unknown>; at: string };

const read = (): Ev[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const write = (q: Ev[]) => { try { localStorage.setItem(KEY, JSON.stringify(q.slice(-MAX))); } catch { /* full/private */ } };

export function queueVrEvent(kind: string, data?: Record<string, unknown>) {
  write([...read(), { kind, data, at: new Date().toISOString() }]);
  void flushVrOutbox();
}

let flushing = false;
export async function flushVrOutbox() {
  if (flushing || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
  const q = read(); if (!q.length) return;
  flushing = true;
  try {
    const { error } = await supabase.functions.invoke('track-visit', { body: { action: 'events', visitor_id: visitorId(), events: q.slice(0, 50).map((e) => ({ kind: 'tap', name: `vr:${e.kind}`.slice(0, 80), path: '/vr-world' })) } });
    if (!error) write(read().slice(Math.min(50, q.length)));
  } catch { /* stay queued */ } finally { flushing = false; }
}

if (typeof window !== 'undefined') window.addEventListener('online', () => void flushVrOutbox());
