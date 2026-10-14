/** The hidden village merchant's shop (opens from the merchant's Use prompt). Coins only. */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePickups, spendCoins, addHerbs, addGoldHerbs } from '@/lib/vrPickups';
import { GEAR, takeGear, useGear } from '@/lib/vrGear';
import { addAmmo } from '@/lib/vrAmmo';
import { playSfx } from '@/lib/vrSfx';
import { logStory } from '@/lib/vrStoryline';
import { GearArt, GoldHerbArt } from './VRGearArt';

type Ware = { id: string; name: string; price: number; detail: string; art: React.ReactNode; gear?: string; give: () => void };
const gear = (id: string) => GEAR.find((g) => g.id === id)!;
export const WARES: Ware[] = [
  { id: 'green', name: 'Green Herb', price: 10, detail: '+20 health. Five restore full health.', art: <GoldHerbArt green />, give: () => addHerbs(1) },
  { id: 'gold', name: 'Golden Herb', price: 60, detail: 'Restores full health at once.', art: <GoldHerbArt />, give: () => addGoldHerbs(1) },
  { id: 'pistol', name: 'Handgun', price: 80, detail: '9mm handgun. Attack +12.', art: <GearArt id="pistol" />, gear: 'pistol', give: () => takeGear(gear('pistol')) },
  { id: 'shotgun', name: 'Shotgun', price: 150, detail: 'Pump shotgun. Attack +25.', art: <GearArt id="shotgun" />, gear: 'shotgun', give: () => takeGear(gear('shotgun')) },
  { id: 'rocket', name: 'Rocket Launcher', price: 400, detail: 'Mercenary launcher. Attack +80, 1 rocket per load.', art: <GearArt id="rocket" />, gear: 'rocket', give: () => takeGear(gear('rocket')) },
  { id: 'ammo9', name: 'Handgun ammo ×10', price: 15, detail: 'Ten 9mm rounds.', art: <GearArt id="pistol" />, give: () => addAmmo('pistol', 10) },
  { id: 'shells', name: 'Shotgun shells ×5', price: 25, detail: 'Five shells.', art: <GearArt id="shotgun" />, give: () => addAmmo('shotgun', 5) },
  { id: 'rockets', name: 'Rocket ×1', price: 120, detail: 'One rocket.', art: <GearArt id="rocket" />, give: () => addAmmo('rocket', 1) },
];

export const MerchantShop: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('“Welcome, stranger! Got somethin\u2019 that might interest ya.”');
  const pick = usePickups(); const owned = useGear();
  useEffect(() => { const f = () => setOpen(true); window.addEventListener('vr-merchant-open', f); return () => window.removeEventListener('vr-merchant-open', f); }, []);
  if (!open) return null;
  const buy = (w: Ware) => {
    if (w.gear && owned.includes(w.gear)) { playSfx('deny'); setMsg('You already have that one.'); return; }
    if (!spendCoins(w.price)) { playSfx('deny'); setMsg('“Not enough coins, stranger!”'); return; }
    playSfx('coins'); w.give(); logStory('merchant', w.id); setMsg(`“Heh heh, thank you!” · bought ${w.name}`);
  };
  return createPortal(
    <div role="dialog" aria-label="Merchant" className="re-case-screen pointer-events-auto fixed inset-0 flex flex-col">
      <div className="re-case-topbar flex items-center gap-3 px-3 py-1">
        <span className="re-case-tab flex-1">Merchant · Buy</span>
        <span className="re-case-money tabular-nums">{pick.coins.toLocaleString()} <span className="text-[0.6em]">COINS</span></span>
        <button type="button" className="re-case-tab" onClick={() => setOpen(false)}>Exit</button>
      </div>
      <ul className="re-case-list mx-auto w-full max-w-3xl flex-1 overflow-y-auto">
        {WARES.map((w) => {
          const have = !!w.gear && owned.includes(w.gear);
          return (
            <li key={w.id} className="re-case-row flex items-center gap-3">
              <span className="h-10 w-16 shrink-0">{w.art}</span>
              <span className="min-w-0 flex-1"><span className="block">{w.name}</span><span className="block text-[11px] opacity-70">{w.detail}</span></span>
              <button type="button" data-testid={`buy-${w.id}`} disabled={have} className="re-case-btn" onClick={() => buy(w)}>{have ? 'Owned' : `${w.price} coins`}</button>
            </li>
          );
        })}
      </ul>
      <div className="re-case-namebar m-2" data-testid="merchant-msg">{msg}</div>
    </div>,
    document.body,
  );
};
