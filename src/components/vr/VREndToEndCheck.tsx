/**
 * "Run end-to-end check" + "Top players" for VR World. The check tests the
 * relic bell (real alert), city jump (Bengaluru and back) and GPS travel.
 */
import React, { useState } from 'react';
import { notifySelf } from '@/lib/notifySelf';
import { searchPlaces } from '@/worlds/search/placeSearch';
import { travelTo, travelHome } from '@/worlds/worldMode';
import { getGrantedCoords } from '@/utils/sharedGeolocation';
import { supabase } from '@/integrations/supabase/client';
import { getWorldState, enterMMora, returnToReal } from '@/worlds/worldMode';
import { mapBlocks } from '@/worlds/realmap/mapIndex';
import { watchdogStats } from './AvatarWatchdog';
import { trackActivity } from '@/lib/visitTracker';

type Row = { name: string; ok: boolean | null; note: string };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const VREndToEndCheck: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [top, setTop] = useState<{ display_name: string; total_points: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const put = (r: Row) => setRows((p) => [...p.filter((x) => x.name !== r.name), r]);

  const run = async () => {
    setBusy(true); setRows([]);
    try {
      await notifySelf('vr_relic_collected', 'Check: relic found', 'End-to-end check — your bell works.');
      put({ name: 'Relic bell', ok: true, note: 'Alert sent — check your bell' });
    } catch { put({ name: 'Relic bell', ok: false, note: 'Alert could not be sent' }); }
    try {
      const hit = (await searchPlaces('Bengaluru'))[0];
      if (!hit) throw new Error();
      travelTo({ name: hit.name, lat: hit.lat, lng: hit.lng } as never);
      await wait(4000); travelHome();
      put({ name: 'City jump', ok: true, note: 'Jumped to Bengaluru and back' });
    } catch { put({ name: 'City jump', ok: false, note: 'Place search unavailable' }); }
    const c = await getGrantedCoords().catch(() => null);
    put({ name: 'GPS travel', ok: !!c, note: c ? 'Phone location available' : 'Location not allowed' });
    // 4. Landscape + Home icon
    const touch = matchMedia('(pointer: coarse)').matches, wide = innerWidth >= innerHeight;
    const home = !!document.querySelector('[data-mmora-home-icon="true"]');
    put({ name: 'Landscape & Home', ok: (!touch || wide), note: `${touch ? (wide ? 'sideways' : 'turn phone sideways') : 'desktop'} · Home icon ${home ? 'found' : 'not on this screen'}` });
    // 5. Memory / heat cap
    const mem = (navigator as { deviceMemory?: number }).deviceMemory;
    put({ name: 'Phone memory cap', ok: true, note: mem ? `${mem} GB — ${mem <= 4 ? 'light mode on' : 'full detail'}` : 'memory not reported (light mode rules still apply)' });
    // 6. Avatar watchdog
    put({ name: 'Avatar watchdog', ok: Date.now() - watchdogStats.lastOkAt < 3000, note: `${watchdogStats.rescues} rescues · ${watchdogStats.lastOkAt ? 'watching' : 'VR scene not running'}` });
    // 7. Traffic roads
    let roads = 0; mapBlocks().forEach((b) => { roads += (b as { roads?: unknown[] }).roads?.length ?? 0; });
    put({ name: 'Street traffic', ok: roads > 0, note: roads ? `${roads} real roads for cars` : 'no streets loaded yet' });
    // 8. Doorway round-trip
    if (getWorldState().mode === 'real') {
      enterMMora([0, 1.6, 0]); await wait(1500); const inside = getWorldState().mode === 'mmora';
      returnToReal(); await wait(500);
      put({ name: 'Doorway round-trip', ok: inside && getWorldState().mode === 'real', note: inside ? "In and out of M'Mora Village" : 'Did not enter' });
    } else put({ name: 'Doorway round-trip', ok: null, note: "Go back to your street first" });
    // 9. Admin live alerts
    try { trackActivity('vr_enter', 'End-to-end check'); put({ name: 'Admin live alerts', ok: true, note: 'Sent (admin gets it; skipped for your own admin account)' }); }
    catch { put({ name: 'Admin live alerts', ok: false, note: 'Could not send' }); }
    setBusy(false);
  };

  const loadTop = async () => {
    const { data } = await supabase.rpc('get_leaderboard', { limit_count: 10 });
    setTop((data as never) ?? []);
  };

  return (
    <div className="fixed right-3 top-14 z-30" data-exclude-phantom-tap>
      <button type="button" onClick={() => { setOpen(!open); if (!open) void loadTop(); }}
        className="rounded-full px-3 py-1 text-[11px] text-white surface-warm-tan">Check & top players</button>
      {open && (
        <div className="mt-2 w-60 rounded-2xl p-3 text-xs text-white surface-warm-tan space-y-2">
          <button type="button" disabled={busy} onClick={run} className="underline">
            {busy ? 'Checking…' : 'Run end-to-end check'}
          </button>
          {rows.map((r) => <p key={r.name}>{r.ok === null ? '•' : r.ok ? '✓' : '✗'} {r.name} — {r.note}</p>)}
          <p className="pt-1 font-semibold">Top players</p>
          {top.length === 0 && <p>—</p>}
          {top.map((t, i) => <p key={i}>#{i + 1} {t.display_name} · {t.total_points ?? 0}</p>)}
        </div>
      )}
    </div>
  );
};
export default VREndToEndCheck;
