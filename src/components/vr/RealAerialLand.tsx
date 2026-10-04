/** Shown during the entry view above the street: one tap drops the player onto it. */
import React from 'react';
import { useWorldState, landOnStreet, entryHeightFor } from '@/worlds/worldMode';

export const RealAerialLand: React.FC = () => {
  const w = useWorldState();
  if (w.mode !== 'real' || !w.aerial) return null;
  return (
    <div className="vr-aerial-land fixed top-[6.5rem] left-1/2 -translate-x-1/2 z-[9997] flex flex-col items-center gap-1" data-exclude-phantom-tap>
      <div className="surface-warm-tan rounded-full px-3 py-1 text-[11px] text-white">{w.tallestNear + 20 > 100 ? 'Above the rooftops' : 'Aerial view'} · {Math.round(entryHeightFor(w.tallestNear))} m above you</div>
      <button type="button" onClick={landOnStreet} className="surface-warm-tan rounded-full px-4 py-2 text-sm font-semibold text-white">
        Land on my street
      </button>
    </div>
  );
};
export default RealAerialLand;
