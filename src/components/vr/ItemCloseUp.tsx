/** Short close-up card when you pick an item up (like Resident Evil's item view). */
import React, { useEffect, useState } from 'react';

const ICON: Record<string, string> = { street_relic: '🏺', memory_shard: '💎', treasure_chest: '🧰' };
type Item = { type: string; rarity: string; karma?: number };

export const ItemCloseUp: React.FC = () => {
  const [item, setItem] = useState<Item | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const show = (i: Item) => { setItem(i); clearTimeout(t); t = setTimeout(() => setItem(null), 2600); };
    const onPick = (e: Event) => show((e as CustomEvent<Item>).detail);
    const onReward = (e: Event) => { const k = (e as CustomEvent<{ karma: number }>).detail.karma; setItem((p) => ({ ...(p ?? { type: 'reward', rarity: 'quest' }), karma: k })); clearTimeout(t); t = setTimeout(() => setItem(null), 2600); };
    window.addEventListener('vr-item-pickup', onPick);
    window.addEventListener('vr-quest-reward', onReward);
    return () => { clearTimeout(t); window.removeEventListener('vr-item-pickup', onPick); window.removeEventListener('vr-quest-reward', onReward); };
  }, []);
  if (!item) return null;
  return (
    <div role="status" data-testid="item-closeup" className="pointer-events-none fixed inset-x-0 top-1/3 z-[9996] flex justify-center">
      <div className="surface-warm-tan flex flex-col items-center rounded-3xl px-6 py-4 text-white">
        <div className="vr-item-spin text-5xl" aria-hidden>{ICON[item.type] ?? '🎁'}</div>
        <div className="mt-2 text-sm font-semibold capitalize">{item.type.replace(/_/g, ' ')}</div>
        <div className="text-[11px] capitalize opacity-80">{item.rarity}</div>
        {item.karma ? <div className="mt-1 text-xs font-semibold">Quest reward +{item.karma} karma</div> : null}
      </div>
    </div>
  );
};
export default ItemCloseUp;
