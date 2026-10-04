/**
 * VR World item bag + quest list. Relics spin as small CSS 3D gems so the bag
 * never opens a second 3D canvas (phones only get one GPU context).
 */
import React, { useEffect, useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
import { QUESTS, getVRQuestSnapshot, itemLabel, loadVRQuests, subscribeVRQuests, type Rarity } from '@/lib/vrQuests';

const RARITY_HSL: Record<Rarity, string> = {
  common: 'hsl(220 9% 65%)', uncommon: 'hsl(142 71% 45%)', rare: 'hsl(219 91% 59%)',
  epic: 'hsl(219 95% 78%)', legendary: 'hsl(43 96% 56%)',
};

const Gem: React.FC<{ rarity: Rarity }> = ({ rarity }) => (
  <div className="vr-gem" aria-hidden>
    <div className="vr-gem-core" style={{ background: RARITY_HSL[rarity] }} />
    <div className="vr-gem-core vr-gem-core-b" style={{ background: RARITY_HSL[rarity] }} />
  </div>
);

export const VRBagPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const snap = useSyncExternalStore(subscribeVRQuests, getVRQuestSnapshot, getVRQuestSnapshot);
  useEffect(() => { void loadVRQuests(); }, []);
  const { state, bag } = snap;

  return (
    <div role="dialog" aria-label="Item bag" className="pointer-events-auto absolute left-1/2 top-20 w-[min(92vw,360px)] -translate-x-1/2 rounded-2xl surface-warm-tan p-4 text-sm text-foreground">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold">Bag & quests</p>
        <button type="button" aria-label="Close bag" onClick={onClose} className="rounded-full p-1"><X className="h-4 w-4" /></button>
      </div>

      <ul className="mb-4 space-y-2" aria-label="Quests">
        {QUESTS.map((q) => {
          const p = state.progress[q.id] ?? 0; const done = !!state.done[q.id];
          return (
            <li key={q.id} data-testid={`quest-${q.id}`}>
              <div className="flex justify-between text-xs">
                <span className="font-medium">{done ? '✓ ' : ''}{q.title}</span>
                <span className="tabular-nums">{p}/{q.goal}</span>
              </div>
              <p className="text-[11px] text-foreground/70">{q.description}</p>
              <div className="mt-1 h-1.5 rounded-full bg-background/80">
                <div className="h-full rounded-full bg-[hsl(142_71%_45%)]" style={{ width: `${(p / q.goal) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mb-2 text-xs font-medium">Relics ({bag.length})</p>
      {bag.length === 0 ? (
        <p className="text-xs text-foreground/70">Walk up to a glowing item and tap Use to pick it up.</p>
      ) : (
        <div className="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto" aria-label="Relics">
          {bag.slice(0, 40).map((it) => (
            <div key={it.id} className="flex flex-col items-center gap-1 rounded-xl bg-background/40 p-2" title={`${it.rarity} ${itemLabel(it.type)}`}>
              <Gem rarity={it.rarity} />
              <span className="line-clamp-1 text-center text-[9px] capitalize">{itemLabel(it.type)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VRBagPanel;
