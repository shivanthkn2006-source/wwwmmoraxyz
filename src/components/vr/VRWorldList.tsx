/**
 * "What's here" window: every collectable / place in M'Mora World and the Real Map,
 * with how many exist, how many you used and how many remain, and where to find them.
 */
import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Leaf, Coins, Gem, Home, DoorOpen, Signpost, Store, Droplets, MapPin, X } from 'lucide-react';
import { usePickups } from '@/lib/vrPickups';
import { ALL_PICKUPS, HOUSES } from '@/worlds/mmora/PickupHouses';
import { MMORA_SIGNS } from '@/worlds/mmora/MMoraSigns';
import { mapBlocks, useMapVersion } from '@/worlds/realmap/mapIndex';
import { relicsForBlock, today } from '@/worlds/realmap/streetRelics';
import { getStreetHouses } from '@/worlds/realmap/StreetHouses';
import { useWorldState, travelTo } from '@/worlds/worldMode';
import { SOUTH_INDIA_CITIES } from '@/worlds/realmap/prefillCities';
import { subscribeVRQuests, getVRQuestSnapshot } from '@/lib/vrQuests';

type Row = { icon: React.ElementType; name: string; total: number | string; used: number | string; left: number | string; where: string };

export const VRWorldList: React.FC = () => {
  const [open, setOpen] = useState(false);
  useEffect(() => { const on = () => setOpen((o) => !o); window.addEventListener('vr-open-world-list', on); return () => window.removeEventListener('vr-open-world-list', on); }, []);
  const pk = usePickups();
  useMapVersion();
  const w = useWorldState();
  const quests = useSyncExternalStore(subscribeVRQuests, getVRQuestSnapshot, getVRQuestSnapshot);
  if (!open) return null;

  const taken = new Set(pk.taken);
  const mHerbs = ALL_PICKUPS.filter((p) => p.kind === 'herb'), mCoins = ALL_PICKUPS.filter((p) => p.kind === 'coin');
  const usedH = mHerbs.filter((p) => taken.has(p.id)).length, usedC = mCoins.filter((p) => taken.has(p.id)).length;
  const homes = getStreetHouses();
  const rHerbs = homes.filter((h) => h.herbId), rCoins = homes.filter((h) => h.coinId);
  const rUsedH = rHerbs.filter((h) => taken.has(h.herbId!)).length, rUsedC = rCoins.filter((h) => taken.has(h.coinId!)).length;
  let roads = 0, named = 0, places = 0, water = 0, relics = 0;
  const day = today();
  mapBlocks().forEach((d, key) => {
    roads += d.roads.length; named += d.roads.filter((r) => r.name).length;
    places += (d as { pois?: unknown[] }).pois?.length ?? 0;
    water += ((d as { areas?: unknown[] }).areas?.length ?? 0) + ((d as { waterways?: unknown[] }).waterways?.length ?? 0);
    relics += relicsForBlock(key, d, day).length;
  });
  const bag = quests.bag.length;
  const city = w.origin.status === 'ready' ? (w.origin.label || 'your city') : 'your city';
  const rows: [string, Row[]][] = [
    ["M'Mora World", [
      { icon: Home, name: 'Houses to enter', total: HOUSES.length, used: '—', left: HOUSES.length, where: "Walk through the doorway from any city" },
      { icon: Leaf, name: 'Green herbs', total: mHerbs.length, used: usedH, left: mHerbs.length - usedH, where: 'Green glow: inside houses + along paths' },
      { icon: Coins, name: 'Antique coin piles', total: mCoins.length, used: usedC, left: mCoins.length - usedC, where: 'Gold glow above houses' },
      { icon: Signpost, name: 'Street signs (7 ft)', total: MMORA_SIGNS.length, used: '—', left: MMORA_SIGNS.length, where: 'At the crossings between houses' },
      { icon: DoorOpen, name: 'Portal back home', total: 1, used: '—', left: 1, where: 'Blue beam next to where you arrive' },
    ]],
    [`Real Map · ${city}`, [
      { icon: DoorOpen, name: "Portal to M'Mora World", total: 1, used: w.portalTrips, left: 1, where: 'Blue beam beside you on arrival + one every ~1 km' },
      { icon: Home, name: 'Homes to enter', total: homes.length, used: '—', left: homes.length, where: 'Doors with a glow, loaded streets nearby' },
      { icon: Leaf, name: 'Green herbs', total: rHerbs.length, used: rUsedH, left: rHerbs.length - rUsedH, where: 'Green glow above homes' },
      { icon: Coins, name: 'Coin piles', total: rCoins.length, used: rUsedC, left: rCoins.length - rUsedC, where: 'Gold glow above homes' },
      { icon: Gem, name: 'Street relics (today)', total: relics, used: '—', left: relics, where: 'Coloured glow on roads; new ones daily' },
      { icon: Signpost, name: 'Streets (named)', total: roads, used: '—', left: named, where: 'Street signs at the roadside' },
      { icon: Store, name: 'Shops & places', total: places, used: '—', left: places, where: 'Name labels; search top-left' },
      { icon: Droplets, name: 'Water & parks', total: water, used: '—', left: water, where: 'On the map and the round map' },
    ]],
    ['Your bag', [
      { icon: Leaf, name: 'Herbs carried', total: pk.herbs, used: '—', left: pk.herbs, where: 'Use one to refill stamina' },
      { icon: Coins, name: 'Coins carried', total: pk.coins, used: '—', left: pk.coins, where: 'Earn karma' },
      { icon: MapPin, name: 'Relics collected', total: bag, used: '—', left: bag, where: 'Open Bag' },
    ]],
  ];
  return (
    <div role="dialog" aria-label="What's in VR World" className="fixed left-1/2 top-14 z-[9990] w-[min(94vw,520px)] max-h-[70vh] -translate-x-1/2 overflow-y-auto rounded-2xl surface-warm-tan p-3 text-white">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">What's in VR World</h2>
        <button type="button" aria-label="Close list" onClick={() => setOpen(false)} className="p-1"><X className="h-4 w-4" /></button>
      </div>
      <p className="mb-2 text-[10px] text-white/80">Real Map counts cover the streets loaded around you; walk further to load more.</p>
      {rows.map(([title, list]) => (
        <div key={title} className="mb-3">
          <div className="mb-1 text-[11px] font-semibold text-white/90">{title}</div>
          <table className="w-full text-[11px]">
            <thead><tr className="text-white/70"><th className="text-left font-normal">Item</th><th className="font-normal">Total</th><th className="font-normal">Used</th><th className="font-normal">Left</th><th className="text-left font-normal pl-2">Where</th></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.name} className="border-t border-white/10">
                  <td className="py-1"><span className="inline-flex items-center gap-1"><r.icon className="h-3.5 w-3.5" />{r.name}</span></td>
                  <td className="text-center">{r.total}</td><td className="text-center">{r.used}</td><td className="text-center">{r.left}</td>
                  <td className="pl-2 text-white/80">{r.where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <div className="mb-1 text-[11px] font-semibold text-white/90">South India cities · {SOUTH_INDIA_CITIES.length}</div>
      <p className="mb-1 text-[10px] text-white/80">Each city has real streets with 7 ft signs, shops, homes, herbs, coins and an M'Mora World portal (blue beam) about every 1 km.</p>
      <div className="flex flex-wrap gap-1.5">
        {SOUTH_INDIA_CITIES.map((c) => (
          <button key={c.name} type="button" onClick={() => { travelTo({ name: c.name, lat: c.lat, lng: c.lng }); setOpen(false); }}
            className={`rounded-full px-2.5 py-1 text-[11px] ${city === c.name ? 'bg-white/35' : 'bg-white/15'}`}>
            <MapPin className="mr-1 inline h-3 w-3" />{c.name}
          </button>
        ))}
      </div>
    </div>
  );
};
export default VRWorldList;
