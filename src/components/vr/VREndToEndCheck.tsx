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
          {rows.map((r) => <p key={r.name}>{r.ok ? '✓' : '✗'} {r.name} — {r.note}</p>)}
          <p className="pt-1 font-semibold">Top players</p>
          {top.length === 0 && <p>—</p>}
          {top.map((t, i) => <p key={i}>#{i + 1} {t.display_name} · {t.total_points ?? 0}</p>)}
        </div>
      )}
    </div>
  );
};
export default VREndToEndCheck;
