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
    const t = setInterval(() => {
      const w = getWorldState();
      if (w.chunksLoaded > 0 && getMapLoadStatus().pending === 0) { clearInterval(t); void runPrefill(); }
    }, 3000);
    return () => clearInterval(t);
  }, [admin]);
  if (!admin || !p.running) return null;
  return (
    <div role="status" className="pointer-events-none fixed bottom-3 left-1/2 z-[9994] -translate-x-1/2 surface-warm-tan rounded-full px-3 py-1 text-[10px] text-white">
      Preparing South India maps · {p.city} · {p.done}/{p.total}
    </div>
  );
};
export default AdminAutoPrefill;
