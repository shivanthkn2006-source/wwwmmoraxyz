/**
 * Default load for South India: when the admin opens VR World, the eight city
 * centres are prepared in the background from this phone (map servers block
 * cloud servers), only after the admin's own street has loaded, once per
 * device. Shows a tiny progress note; nothing for other members.
 */
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePrefill, runPrefill, prefillDone } from '@/worlds/realmap/prefillCities';
import { getMapLoadStatus } from '@/worlds/realmap/osm';
import { getWorldState } from '@/worlds/worldMode';

export const AdminAutoPrefill: React.FC = () => {
  const p = usePrefill();
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.rpc('has_role', { _user_id: u.user.id, _role: 'admin' });
      if (alive && data === true) setAdmin(true);
    })().catch(() => {});
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!admin || prefillDone()) return;
    const started = Date.now();
    // Starts by default: right after your own street loads in VR World, or after 20 s anywhere in the app.
    const t = setInterval(() => {
      const w = getWorldState();
      const streetReady = w.chunksLoaded > 0 && getMapLoadStatus().pending === 0;
      if (streetReady || Date.now() - started > 20_000) { clearInterval(t); void runPrefill(); }
    }, 3000);
    return () => clearInterval(t);
  }, [admin]);
  const [summary, setSummary] = useState<string | null>(null);
  useEffect(() => {
    if (p.running || !p.total) return;
    setSummary(Object.entries(p.perCity).map(([c, v]) => `${c} ${v.ok}/25 · ${v.shops} shops · ${v.roads} roads`).join('\n'));
    const t = setTimeout(() => setSummary(null), 30_000);
    return () => clearTimeout(t);
  }, [p.running, p.total, p.perCity]);
  if (!admin) return null;
  if (!p.running) return summary ? (
    <div role="status" className="pointer-events-none fixed bottom-3 left-1/2 z-[9994] -translate-x-1/2 surface-warm-tan rounded-2xl px-3 py-2 text-[10px] text-white whitespace-pre-line">
      South India maps ready{'\n'}{summary}
    </div>
  ) : null;
  return (
    <div role="status" className="pointer-events-none fixed bottom-3 left-1/2 z-[9994] -translate-x-1/2 surface-warm-tan rounded-full px-3 py-1 text-[10px] text-white">
      Preparing South India maps · {p.city} · {p.done}/{p.total}
    </div>
  );
};
export default AdminAutoPrefill;
