/**
 * In-world admin command console (admin only, server-verified role).
 * Commands: go <city>, home, prefill, stop, outbox.
 */
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { searchPlaces } from '@/worlds/search/placeSearch';
import { travelTo, travelHome } from '@/worlds/worldMode';
import { runPrefill, stopPrefill } from '@/worlds/realmap/prefillCities';
import { flushVrOutbox } from '@/lib/vrOutbox';
import { getMeet } from '@/worlds/meet/vrMeet';
import { setDemoExplorer, demoExplorerOn } from '@/worlds/realmap/demoExplorerSwitch';
import { dropRelicsAtPlaces, today } from '@/worlds/realmap/streetRelics';
import { loadRealmapSettings, saveRealmapSettings } from '@/worlds/realmap/realmapAdminSettings';
import { mapBlocks } from '@/worlds/realmap/mapIndex';

export const VRAdminConsole: React.FC = () => {
  const [admin, setAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [cmd, setCmd] = useState('');
  const [log, setLog] = useState<string[]>([]);
  useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.rpc('has_role', { _user_id: u.user.id, _role: 'admin' });
      if (data === true) setAdmin(true);
    })().catch(() => {});
  }, []);
  if (!admin) return null;
  const say = (s: string) => setLog((l) => [...l.slice(-5), s]);
  const run = async () => {
    const [c, ...rest] = cmd.trim().split(/\s+/); const arg = rest.join(' ');
    setCmd('');
    if (c === 'go' && arg) {
      const hit = (await searchPlaces(arg).catch(() => []))[0];
      if (!hit) return say(`No place "${arg}"`);
      travelTo({ name: hit.name, lat: hit.lat, lng: hit.lng } as never); say(`Going to ${hit.name}`);
    } else if (c === 'to' && arg) {
      const u = arg.replace(/^@/, '').toLowerCase();
      const p = getMeet().players.find((r) => r.username?.toLowerCase() === u);
      if (!p) return say(`@${u} isn't in VR World (or is hidden)`);
      if (p.mode === 'real' && p.lat != null && p.lng != null) { travelTo({ name: `@${p.username}`, lat: p.lat, lng: p.lng } as never); say(`Teleported to @${p.username}`); }
      else say(`@${p.username} is inside M'Mora Village`);
    } else if (c === 'bot') {
      const v = arg === 'on' ? true : arg === 'off' ? false : !demoExplorerOn();
      setDemoExplorer(v);
      const err = await saveRealmapSettings({ demo_bot: v });
      say(err ? `Demo explorer ${v ? 'on' : 'off'} here only (not saved: ${err})` : `Demo explorer ${v ? 'on' : 'off'} for everyone`);
    } else if (c === 'relics') {
      const pois: { lat: number; lng: number; name: string }[] = [];
      mapBlocks().forEach((b) => b.pois.forEach((p) => { if (!arg || p.name.toLowerCase().includes(arg.toLowerCase()) || p.kind === arg) pois.push(p); }));
      const n = dropRelicsAtPlaces(pois);
      if (!n) return say(pois.length ? 'Relics already dropped at those shops today' : 'No shops loaded nearby');
      const cur = await loadRealmapSettings();
      const day = today();
      const keep = (cur.relic_drops ?? []).filter((d) => d.day === day);
      const add = pois.slice(0, 10).map((p) => ({ lat: p.lat, lng: p.lng, name: p.name, day }));
      const err = await saveRealmapSettings({ relic_drops: [...keep, ...add].slice(-60) });
      say(`Dropped ${n} relics at ${pois.slice(0, 3).map((p) => p.name).join(', ')}${n > 3 ? '…' : ''}${err ? ' (this phone only: ' + err + ')' : ' for everyone today'}`);
    } else if (c === 'clearrelics') {
      const err = await saveRealmapSettings({ relic_drops: [] });
      say(err ? `Not cleared: ${err}` : 'Shop relics cleared for everyone (gone after reload)');
    } else if (c === 'players') {
      const ps = getMeet().players; say(ps.length ? ps.map((r) => `@${r.username}`).join(', ') : 'No members nearby');
    } else if (c === 'home') { travelHome(); say('Back to your location'); }
    else if (c === 'prefill') { void runPrefill(); say('South India prefill started'); }
    else if (c === 'stop') { stopPrefill(); say('Prefill stopping'); }
    else if (c === 'outbox') { await flushVrOutbox(); say('Outbox sent'); }
    else say('Commands: go <city>, to @user, players, bot on|off, relics [shop|kind], clearrelics, home, prefill, stop, outbox');
  };
  return (
    <div className="fixed left-3 bottom-24 z-30" data-exclude-phantom-tap>
      <button type="button" onClick={() => setOpen(!open)} className="rounded-full px-3 py-1 text-[11px] text-white surface-warm-tan">Admin</button>
      {open && (
        <div className="mt-2 w-64 rounded-2xl p-3 text-xs text-white surface-warm-tan space-y-1">
          {log.map((l, i) => <p key={i}>{l}</p>)}
          <form onSubmit={(e) => { e.preventDefault(); void run(); }}>
            <input value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder="go Chennai · home · prefill"
              className="w-full rounded-full bg-background/30 px-3 py-1 text-white placeholder:text-white/60 outline-none" />
          </form>
        </div>
      )}
    </div>
  );
};
export default VRAdminConsole;
