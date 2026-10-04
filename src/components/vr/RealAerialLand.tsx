/** Shown during the 500 m aerial entry: one tap drops the player onto their street. */
import React from 'react';
import { useWorldState, landOnStreet } from '@/worlds/worldMode';

export const RealAerialLand: React.FC = () => {
  const w = useWorldState();
  if (w.mode !== 'real' || !w.aerial) return null;
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9998] flex flex-col items-center gap-1" data-exclude-phantom-tap>
      <div className="surface-warm-tan rounded-full px-3 py-1 text-[11px] text-white">Aerial view · 500 m above you</div>
      <button type="button" onClick={landOnStreet} className="surface-warm-tan rounded-full px-4 py-2 text-sm font-semibold text-white">
        Land on my street
      </button>
    </div>
  );
};
export default RealAerialLand;
