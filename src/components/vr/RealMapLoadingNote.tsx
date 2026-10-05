/** Small honest note while your street is downloading or the map service is busy. */
import React, { useSyncExternalStore } from 'react';
import { getMapLoadStatus, onMapLoadStatus } from '@/worlds/realmap/osm';
import { useWorldState } from '@/worlds/worldMode';

export const RealMapLoadingNote: React.FC = () => {
  const s = useSyncExternalStore(onMapLoadStatus, getMapLoadStatus, getMapLoadStatus);
  const w = useWorldState();
  if (w.mode !== 'real' || w.origin.status !== 'ready') return null;
  const text = s.retrying > 0 ? 'Map service busy, retrying…' : s.pending > 0 || w.chunksLoaded === 0 ? 'Loading your street…' : null;
  if (!text) return null;
  return (
    <div role="status" data-testid="real-map-loading" className="fixed top-3 left-1/2 -translate-x-1/2 z-[9994] surface-warm-tan rounded-full px-3 py-1 text-[11px] text-white pointer-events-none">
      {text}
    </div>
  );
};
export default RealMapLoadingNote;
